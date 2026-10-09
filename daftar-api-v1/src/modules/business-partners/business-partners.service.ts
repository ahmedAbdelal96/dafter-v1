import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  BusinessPartnerAddressDto,
  BusinessPartnerContactDto,
  BusinessPartnerQueryDto,
  BusinessPartnerRole,
  CreateBusinessPartnerDto,
  CustomerProfileInputDto,
  SupplierProfileInputDto,
  UpdateBusinessPartnerAddressDto,
  UpdateBusinessPartnerContactDto,
  UpdateBusinessPartnerDto,
  UpdateCustomerProfileDto,
  UpdateSupplierProfileDto,
} from './dto';
import {
  BUSINESS_PARTNER_INCLUDE,
  BusinessPartnersRepository,
} from './business-partners.repository';

type TransactionDb = Prisma.TransactionClient;

@Injectable()
export class BusinessPartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository?: BusinessPartnersRepository,
  ) {}

  async create(
    companyId: string,
    actorUserId: string,
    dto: CreateBusinessPartnerDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        const customerProfile = this.shouldCreateCustomerProfile(dto)
          ? await this.buildCustomerProfileData(
              db,
              companyId,
              dto.customerProfile,
            )
          : undefined;
        const supplierProfile = this.shouldCreateSupplierProfile(dto)
          ? await this.buildSupplierProfileData(
              db,
              companyId,
              dto.supplierProfile,
            )
          : undefined;

        const partner = await db.businessPartner.create({
          data: {
            companyId,
            partnerCode: dto.partnerCode.trim(),
            partnerType: dto.partnerType,
            displayName: dto.displayName.trim(),
            legalName: dto.legalName?.trim(),
            taxRegistrationNumber: dto.taxRegistrationNumber?.trim(),
            commercialRegistrationNumber:
              dto.commercialRegistrationNumber?.trim(),
            email: dto.email?.trim().toLowerCase(),
            phone: dto.phone?.trim(),
            website: dto.website?.trim(),
            notes: dto.notes?.trim(),
          },
        });

        if (customerProfile) {
          await db.customerProfile.create({
            data: { businessPartnerId: partner.id, ...customerProfile },
          });
        }
        if (supplierProfile) {
          await db.supplierProfile.create({
            data: { businessPartnerId: partner.id, ...supplierProfile },
          });
        }
        const partnerWithRoles = await db.businessPartner.findFirstOrThrow({
          where: { id: partner.id, companyId },
          include: BUSINESS_PARTNER_INCLUDE,
        });

        await this.audit(
          db,
          companyId,
          actorUserId,
          'business-partners.create',
          'BusinessPartner',
          partnerWithRoles.id,
          {
            partnerCode: partnerWithRoles.partnerCode,
            partnerType: partnerWithRoles.partnerType,
            roles: this.rolesOf(partnerWithRoles),
          },
        );
        return partnerWithRoles;
      });
    } catch (error) {
      this.rethrowDatabaseError(
        error,
        'Partner code already exists in this company',
      );
    }
  }

  async findAll(companyId: string, query: BusinessPartnerQueryDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const [items, total] = this.repository
      ? await this.repository.findMany(companyId, {
          page,
          limit,
          search: query.search,
          isActive: query.isActive,
        })
      : await this.prisma.$transaction([
          this.prisma.businessPartner.findMany({
            where: { companyId },
            include: BUSINESS_PARTNER_INCLUDE,
            orderBy: [{ displayName: 'asc' }, { partnerCode: 'asc' }],
            skip: (page - 1) * limit,
            take: limit,
          }),
          this.prisma.businessPartner.count({ where: { companyId } }),
        ]);

    return {
      items,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) },
    };
  }

  async findOne(companyId: string, id: string) {
    const partner = this.repository
      ? await this.repository.findById(companyId, id)
      : await this.prisma.businessPartner.findFirst({
          where: { id, companyId },
          include: BUSINESS_PARTNER_INCLUDE,
        });
    if (!partner) throw new NotFoundException('Business partner not found');
    return partner;
  }

  async update(
    companyId: string,
    actorUserId: string,
    id: string,
    dto: UpdateBusinessPartnerDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        await this.requirePartner(db, companyId, id);
        const { version, ...changes } = dto;
        const result = await db.businessPartner.updateMany({
          where: { id, companyId, version },
          data: { ...changes, version: { increment: 1 } },
        });
        if (result.count !== 1) {
          throw new ConflictException(
            'Business partner was changed by another request',
          );
        }
        const partner = await db.businessPartner.findFirstOrThrow({
          where: { id, companyId },
          include: BUSINESS_PARTNER_INCLUDE,
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'business-partners.update',
          'BusinessPartner',
          id,
          {
            version,
            changes,
          },
        );
        return partner;
      });
    } catch (error) {
      this.rethrowDatabaseError(error, 'Partner update conflicted');
    }
  }

  async setActive(
    companyId: string,
    actorUserId: string,
    id: string,
    isActive: boolean,
    version: number,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        await this.requirePartner(db, companyId, id);
        const result = await db.businessPartner.updateMany({
          where: { id, companyId, version },
          data: { isActive, version: { increment: 1 } },
        });
        if (result.count !== 1) {
          throw new ConflictException(
            'Business partner was changed by another request',
          );
        }
        const partner = await db.businessPartner.findFirstOrThrow({
          where: { id, companyId },
          include: BUSINESS_PARTNER_INCLUDE,
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'business-partners.active-changed',
          'BusinessPartner',
          id,
          {
            isActive,
            version,
          },
        );
        return partner;
      });
    } catch (error) {
      this.rethrowDatabaseError(error, 'Partner status update conflicted');
    }
  }

  async addCustomerProfile(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    dto: CustomerProfileInputDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        await this.requirePartner(db, companyId, partnerId);
        const data = await this.buildCustomerProfileData(db, companyId, dto);
        const profile = await db.customerProfile.create({
          data: { businessPartnerId: partnerId, ...data },
          include: {
            paymentTerm: true,
            preferredCurrency: true,
            receivableAccount: true,
          },
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'business-partners.customer-role-added',
          'CustomerProfile',
          partnerId,
          {
            preferredCurrencyCode: profile.preferredCurrencyCode,
          },
        );
        return profile;
      });
    } catch (error) {
      this.rethrowDatabaseError(
        error,
        'Customer role already exists for this partner',
      );
    }
  }

  async updateCustomerProfile(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    dto: UpdateCustomerProfileDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        await this.requirePartner(db, companyId, partnerId);
        const existing = await db.customerProfile.findFirst({
          where: { businessPartnerId: partnerId, companyId },
        });
        if (!existing) throw new NotFoundException('Customer role not found');
        const data = await this.buildCustomerProfileData(db, companyId, dto);
        const profile = await db.customerProfile.update({
          where: { businessPartnerId: partnerId },
          data,
          include: {
            paymentTerm: true,
            preferredCurrency: true,
            receivableAccount: true,
          },
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'business-partners.customer-role-updated',
          'CustomerProfile',
          partnerId,
          {
            changes: data,
          },
        );
        return profile;
      });
    } catch (error) {
      this.rethrowDatabaseError(error, 'Customer role update conflicted');
    }
  }

  async removeCustomerProfile(
    companyId: string,
    actorUserId: string,
    partnerId: string,
  ) {
    return this.removeRole(companyId, actorUserId, partnerId, 'CUSTOMER');
  }

  async addSupplierProfile(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    dto: SupplierProfileInputDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        await this.requirePartner(db, companyId, partnerId);
        const data = await this.buildSupplierProfileData(db, companyId, dto);
        const profile = await db.supplierProfile.create({
          data: { businessPartnerId: partnerId, ...data },
          include: {
            paymentTerm: true,
            preferredCurrency: true,
            payableAccount: true,
          },
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'business-partners.supplier-role-added',
          'SupplierProfile',
          partnerId,
          {
            preferredCurrencyCode: profile.preferredCurrencyCode,
          },
        );
        return profile;
      });
    } catch (error) {
      this.rethrowDatabaseError(
        error,
        'Supplier role already exists for this partner',
      );
    }
  }

  async updateSupplierProfile(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    dto: UpdateSupplierProfileDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        await this.requirePartner(db, companyId, partnerId);
        const existing = await db.supplierProfile.findFirst({
          where: { businessPartnerId: partnerId, companyId },
        });
        if (!existing) throw new NotFoundException('Supplier role not found');
        const data = await this.buildSupplierProfileData(db, companyId, dto);
        const profile = await db.supplierProfile.update({
          where: { businessPartnerId: partnerId },
          data,
          include: {
            paymentTerm: true,
            preferredCurrency: true,
            payableAccount: true,
          },
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'business-partners.supplier-role-updated',
          'SupplierProfile',
          partnerId,
          {
            changes: data,
          },
        );
        return profile;
      });
    } catch (error) {
      this.rethrowDatabaseError(error, 'Supplier role update conflicted');
    }
  }

  async removeSupplierProfile(
    companyId: string,
    actorUserId: string,
    partnerId: string,
  ) {
    return this.removeRole(companyId, actorUserId, partnerId, 'SUPPLIER');
  }

  async addAddress(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    dto: BusinessPartnerAddressDto,
  ) {
    return this.writeAddress(companyId, actorUserId, partnerId, dto);
  }

  async updateAddress(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    addressId: string,
    dto: UpdateBusinessPartnerAddressDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        await this.requirePartner(db, companyId, partnerId);
        const existing = await db.businessPartnerAddress.findFirst({
          where: { id: addressId, companyId, businessPartnerId: partnerId },
        });
        if (!existing) throw new NotFoundException('Partner address not found');
        if (dto.isDefault) {
          await db.businessPartnerAddress.updateMany({
            where: {
              companyId,
              businessPartnerId: partnerId,
              addressType: dto.addressType,
              id: { not: addressId },
            },
            data: { isDefault: false },
          });
        }
        const address = await db.businessPartnerAddress.update({
          where: { id: addressId },
          data: { ...dto, countryCode: dto.countryCode.toUpperCase() },
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'business-partners.address-updated',
          'BusinessPartnerAddress',
          addressId,
          { changes: dto },
        );
        return address;
      });
    } catch (error) {
      this.rethrowDatabaseError(error, 'Partner address update conflicted');
    }
  }

  async removeAddress(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    addressId: string,
  ) {
    return this.removeChild(
      companyId,
      actorUserId,
      partnerId,
      addressId,
      'address',
    );
  }

  async addContact(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    dto: BusinessPartnerContactDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        await this.requirePartner(db, companyId, partnerId);
        if (dto.isPrimary) {
          await db.businessPartnerContact.updateMany({
            where: { companyId, businessPartnerId: partnerId },
            data: { isPrimary: false },
          });
        }
        const contact = await db.businessPartnerContact.create({
          data: {
            companyId,
            businessPartnerId: partnerId,
            ...dto,
            email: dto.email?.trim().toLowerCase(),
          },
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'business-partners.contact-added',
          'BusinessPartnerContact',
          contact.id,
          { name: contact.name },
        );
        return contact;
      });
    } catch (error) {
      this.rethrowDatabaseError(error, 'Partner contact could not be created');
    }
  }

  async updateContact(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    contactId: string,
    dto: UpdateBusinessPartnerContactDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        await this.requirePartner(db, companyId, partnerId);
        const existing = await db.businessPartnerContact.findFirst({
          where: { id: contactId, companyId, businessPartnerId: partnerId },
        });
        if (!existing) throw new NotFoundException('Partner contact not found');
        if (dto.isPrimary) {
          await db.businessPartnerContact.updateMany({
            where: {
              companyId,
              businessPartnerId: partnerId,
              id: { not: contactId },
            },
            data: { isPrimary: false },
          });
        }
        const contact = await db.businessPartnerContact.update({
          where: { id: contactId },
          data: { ...dto, email: dto.email?.trim().toLowerCase() },
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'business-partners.contact-updated',
          'BusinessPartnerContact',
          contactId,
          { changes: dto },
        );
        return contact;
      });
    } catch (error) {
      this.rethrowDatabaseError(error, 'Partner contact update conflicted');
    }
  }

  async removeContact(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    contactId: string,
  ) {
    return this.removeChild(
      companyId,
      actorUserId,
      partnerId,
      contactId,
      'contact',
    );
  }

  private async writeAddress(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    dto: BusinessPartnerAddressDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        await this.requirePartner(db, companyId, partnerId);
        if (dto.isDefault) {
          await db.businessPartnerAddress.updateMany({
            where: {
              companyId,
              businessPartnerId: partnerId,
              addressType: dto.addressType,
            },
            data: { isDefault: false },
          });
        }
        const address = await db.businessPartnerAddress.create({
          data: {
            companyId,
            businessPartnerId: partnerId,
            ...dto,
            countryCode: dto.countryCode.toUpperCase(),
          },
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'business-partners.address-added',
          'BusinessPartnerAddress',
          address.id,
          { addressType: dto.addressType },
        );
        return address;
      });
    } catch (error) {
      this.rethrowDatabaseError(error, 'Partner address could not be created');
    }
  }

  private async removeChild(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    childId: string,
    kind: 'address' | 'contact',
  ) {
    return this.prisma.$transaction(async (db) => {
      await this.requirePartner(db, companyId, partnerId);
      const where =
        kind === 'address'
          ? { id: childId, companyId, businessPartnerId: partnerId }
          : { id: childId, companyId, businessPartnerId: partnerId };
      const existing =
        kind === 'address'
          ? await db.businessPartnerAddress.findFirst({ where })
          : await db.businessPartnerContact.findFirst({ where });
      if (!existing) throw new NotFoundException(`Partner ${kind} not found`);
      if (kind === 'address')
        await db.businessPartnerAddress.delete({ where: { id: childId } });
      else await db.businessPartnerContact.delete({ where: { id: childId } });
      await this.audit(
        db,
        companyId,
        actorUserId,
        `business-partners.${kind}-removed`,
        'BusinessPartner',
        partnerId,
        { childId },
      );
      return { id: childId, deleted: true };
    });
  }

  private async removeRole(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    role: 'CUSTOMER' | 'SUPPLIER',
  ) {
    return this.prisma.$transaction(async (db) => {
      await this.requirePartner(db, companyId, partnerId);
      const journalLineCount = await db.journalLine.count({
        where: { companyId, businessPartnerId: partnerId },
      });
      const openingLineCount = await db.openingBalanceLine.count({
        where: { companyId, businessPartnerId: partnerId },
      });
      if (journalLineCount > 0 || openingLineCount > 0) {
        throw new ConflictException(
          'A role with accounting history cannot be removed',
        );
      }
      if (role === 'CUSTOMER') {
        const existing = await db.customerProfile.findFirst({
          where: { businessPartnerId: partnerId, companyId },
        });
        if (!existing) throw new NotFoundException('Customer role not found');
        await db.customerProfile.delete({
          where: { businessPartnerId: partnerId },
        });
      } else {
        const existing = await db.supplierProfile.findFirst({
          where: { businessPartnerId: partnerId, companyId },
        });
        if (!existing) throw new NotFoundException('Supplier role not found');
        await db.supplierProfile.delete({
          where: { businessPartnerId: partnerId },
        });
      }
      await this.audit(
        db,
        companyId,
        actorUserId,
        `business-partners.${role.toLowerCase()}-role-removed`,
        'BusinessPartner',
        partnerId,
        { role },
      );
      return { partnerId, role, deleted: true };
    });
  }

  private async requirePartner(
    db: TransactionDb,
    companyId: string,
    id: string,
  ) {
    const partner = await db.businessPartner.findFirst({
      where: { id, companyId },
    });
    if (!partner) throw new NotFoundException('Business partner not found');
    return partner;
  }

  private async buildCustomerProfileData(
    db: TransactionDb,
    companyId: string,
    dto?: CustomerProfileInputDto,
  ) {
    const input = dto ?? {};
    if (input.preferredCurrencyCode)
      await this.requireActiveCurrency(db, input.preferredCurrencyCode);
    if (input.paymentTermId)
      await this.requirePaymentTerm(db, companyId, input.paymentTermId);
    if (input.receivableAccountId)
      await this.requireAccount(db, companyId, input.receivableAccountId);
    return {
      companyId,
      ...(input.paymentTermId !== undefined
        ? { paymentTermId: input.paymentTermId }
        : {}),
      ...(input.creditLimit !== undefined
        ? {
            creditLimit:
              input.creditLimit === null
                ? null
                : new Prisma.Decimal(input.creditLimit),
          }
        : {}),
      ...(input.receivableAccountId !== undefined
        ? { receivableAccountId: input.receivableAccountId }
        : {}),
      ...(input.preferredCurrencyCode !== undefined
        ? { preferredCurrencyCode: input.preferredCurrencyCode }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };
  }

  private async buildSupplierProfileData(
    db: TransactionDb,
    companyId: string,
    dto?: SupplierProfileInputDto,
  ) {
    const input = dto ?? {};
    if (input.preferredCurrencyCode)
      await this.requireActiveCurrency(db, input.preferredCurrencyCode);
    if (input.paymentTermId)
      await this.requirePaymentTerm(db, companyId, input.paymentTermId);
    if (input.payableAccountId)
      await this.requireAccount(db, companyId, input.payableAccountId);
    return {
      companyId,
      ...(input.paymentTermId !== undefined
        ? { paymentTermId: input.paymentTermId }
        : {}),
      ...(input.payableAccountId !== undefined
        ? { payableAccountId: input.payableAccountId }
        : {}),
      ...(input.preferredCurrencyCode !== undefined
        ? { preferredCurrencyCode: input.preferredCurrencyCode }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };
  }

  private async requireActiveCurrency(db: TransactionDb, code: string) {
    const currency = await db.currency.findFirst({
      where: { code, isActive: true },
    });
    if (!currency)
      throw new BadRequestException(`Currency ${code} is not active`);
    return currency;
  }

  private async requirePaymentTerm(
    db: TransactionDb,
    companyId: string,
    id: string,
  ) {
    const term = await db.paymentTerm.findFirst({
      where: { id, companyId, isActive: true },
    });
    if (!term)
      throw new BadRequestException(
        'Payment term is not active for this company',
      );
    return term;
  }

  private async requireAccount(
    db: TransactionDb,
    companyId: string,
    id: string,
  ) {
    const account = await db.accountingAccount.findFirst({
      where: { id, companyId, isActive: true },
    });
    if (!account)
      throw new BadRequestException(
        'Accounting account is not active for this company',
      );
    return account;
  }

  private shouldCreateCustomerProfile(dto: CreateBusinessPartnerDto) {
    return (
      dto.roles?.includes(BusinessPartnerRole.CUSTOMER) ||
      dto.customerProfile !== undefined
    );
  }

  private shouldCreateSupplierProfile(dto: CreateBusinessPartnerDto) {
    return (
      dto.roles?.includes(BusinessPartnerRole.SUPPLIER) ||
      dto.supplierProfile !== undefined
    );
  }

  private rolesOf(partner: {
    customerProfile?: unknown;
    supplierProfile?: unknown;
  }) {
    return [
      ...(partner.customerProfile ? [BusinessPartnerRole.CUSTOMER] : []),
      ...(partner.supplierProfile ? [BusinessPartnerRole.SUPPLIER] : []),
    ];
  }

  private async audit(
    db: TransactionDb,
    companyId: string,
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    await db.auditLog.create({
      data: {
        companyId,
        actorUserId,
        action,
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private rethrowDatabaseError(error: unknown, conflictMessage: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(conflictMessage);
    }
    throw error;
  }
}
