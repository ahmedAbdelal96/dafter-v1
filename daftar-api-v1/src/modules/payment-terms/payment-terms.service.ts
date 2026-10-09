import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  PaymentTermsCalculator,
  PaymentTermWithLines,
} from './payment-terms.calculator';
import {
  CreatePaymentTermDto,
  PaymentTermLineDto,
  PaymentTermQueryDto,
  UpdatePaymentTermDto,
} from './dto';

const PAYMENT_TERM_INCLUDE = {
  lines: { orderBy: { sequence: 'asc' as const } },
};

@Injectable()
export class PaymentTermsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    actorUserId: string,
    dto: CreatePaymentTermDto,
  ) {
    this.validateLines(dto.lines);
    try {
      return await this.prisma.$transaction(async (db) => {
        const term = await db.paymentTerm.create({
          data: {
            companyId,
            code: dto.code.trim().toUpperCase(),
            name: dto.name.trim(),
            description: dto.description?.trim(),
          },
        });
        await this.createLines(db, companyId, term.id, dto.lines);
        const result = await db.paymentTerm.findFirstOrThrow({
          where: { id: term.id, companyId },
          include: PAYMENT_TERM_INCLUDE,
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'payment-terms.create',
          'PaymentTerm',
          term.id,
          {
            code: result.code,
            lineCount: result.lines.length,
          },
        );
        return result;
      });
    } catch (error) {
      this.rethrowConflict(
        error,
        'Payment term code already exists in this company',
      );
    }
  }

  async findAll(companyId: string, query: PaymentTermQueryDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const where: Prisma.PaymentTermWhereInput = {
      companyId,
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.paymentTerm.findMany({
        where,
        include: PAYMENT_TERM_INCLUDE,
        orderBy: { code: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paymentTerm.count({ where }),
    ]);
    return {
      items,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) },
    };
  }

  async findOne(companyId: string, id: string) {
    const term = await this.prisma.paymentTerm.findFirst({
      where: { id, companyId },
      include: PAYMENT_TERM_INCLUDE,
    });
    if (!term) throw new NotFoundException('Payment term not found');
    return term;
  }

  async update(
    companyId: string,
    actorUserId: string,
    id: string,
    dto: UpdatePaymentTermDto,
  ) {
    if (dto.lines) this.validateLines(dto.lines);
    try {
      return await this.prisma.$transaction(async (db) => {
        const existing = await db.paymentTerm.findFirst({
          where: { id, companyId },
          include: PAYMENT_TERM_INCLUDE,
        });
        if (!existing) throw new NotFoundException('Payment term not found');
        const term = await db.paymentTerm.update({
          where: { id },
          data: {
            ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
            ...(dto.description === undefined
              ? {}
              : { description: dto.description?.trim() }),
          },
        });
        if (dto.lines) {
          await db.paymentTermLine.deleteMany({
            where: { companyId, paymentTermId: id },
          });
          await this.createLines(db, companyId, id, dto.lines);
        }
        const result = await db.paymentTerm.findFirstOrThrow({
          where: { id: term.id, companyId },
          include: PAYMENT_TERM_INCLUDE,
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'payment-terms.update',
          'PaymentTerm',
          id,
          { changes: dto },
        );
        return result;
      });
    } catch (error) {
      this.rethrowConflict(error, 'Payment term update conflicted');
    }
  }

  async setActive(
    companyId: string,
    actorUserId: string,
    id: string,
    isActive: boolean,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        const existing = await db.paymentTerm.findFirst({
          where: { id, companyId },
        });
        if (!existing) throw new NotFoundException('Payment term not found');
        const term = await db.paymentTerm.update({
          where: { id },
          data: { isActive },
          include: PAYMENT_TERM_INCLUDE,
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'payment-terms.active-changed',
          'PaymentTerm',
          id,
          { isActive },
        );
        return term;
      });
    } catch (error) {
      this.rethrowConflict(error, 'Payment term status update conflicted');
    }
  }

  async calculate(
    companyId: string,
    id: string,
    amount: Prisma.Decimal | string,
    documentDate: Date,
    currencyCode?: string,
  ) {
    const [term, company] = await Promise.all([
      this.prisma.paymentTerm.findFirst({
        where: { id, companyId, isActive: true },
        include: PAYMENT_TERM_INCLUDE,
      }),
      this.prisma.company.findFirst({
        where: { id: companyId },
        select: { currencyCode: true },
      }),
    ]);
    if (!term) throw new NotFoundException('Active payment term not found');
    if (!company) throw new NotFoundException('Company not found');
    const effectiveCurrencyCode = currencyCode ?? company.currencyCode;
    const currency = await this.prisma.currency.findFirst({
      where: { code: effectiveCurrencyCode, isActive: true },
    });
    if (!currency) throw new BadRequestException('Currency is not active');
    return PaymentTermsCalculator.calculate(
      amount,
      documentDate,
      term as PaymentTermWithLines,
      currency.minorUnitPrecision,
    );
  }

  async assignCustomer(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    paymentTermId: string,
  ) {
    return this.assignRole(
      companyId,
      actorUserId,
      partnerId,
      paymentTermId,
      'CUSTOMER',
    );
  }

  async assignSupplier(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    paymentTermId: string,
  ) {
    return this.assignRole(
      companyId,
      actorUserId,
      partnerId,
      paymentTermId,
      'SUPPLIER',
    );
  }

  private async assignRole(
    companyId: string,
    actorUserId: string,
    partnerId: string,
    paymentTermId: string,
    role: 'CUSTOMER' | 'SUPPLIER',
  ) {
    return this.prisma.$transaction(async (db) => {
      const term = await db.paymentTerm.findFirst({
        where: { id: paymentTermId, companyId },
      });
      if (!term)
        throw new NotFoundException('Payment term not found for this company');
      if (!term.isActive)
        throw new BadRequestException('Payment term is inactive');
      const profile =
        role === 'CUSTOMER'
          ? await db.customerProfile.findFirst({
              where: { businessPartnerId: partnerId, companyId },
            })
          : await db.supplierProfile.findFirst({
              where: { businessPartnerId: partnerId, companyId },
            });
      if (!profile)
        throw new NotFoundException(`${role} role not found for this company`);
      const updated =
        role === 'CUSTOMER'
          ? await db.customerProfile.update({
              where: { businessPartnerId: partnerId },
              data: { paymentTermId },
              include: { paymentTerm: true },
            })
          : await db.supplierProfile.update({
              where: { businessPartnerId: partnerId },
              data: { paymentTermId },
              include: { paymentTerm: true },
            });
      await this.audit(
        db,
        companyId,
        actorUserId,
        'payment-terms.assigned',
        `${role === 'CUSTOMER' ? 'Customer' : 'Supplier'}Profile`,
        partnerId,
        { paymentTermId },
      );
      return updated;
    });
  }

  private validateLines(lines: PaymentTermLineDto[]) {
    const input: PaymentTermWithLines = {
      lines: lines.map((line) => ({
        sequence: line.sequence,
        calculationType: line.calculationType,
        percentage: line.percentage === undefined ? null : line.percentage,
        dueDays: line.dueDays,
      })),
    };
    PaymentTermsCalculator.calculate(
      '100',
      new Date('2026-01-01T00:00:00.000Z'),
      input,
      2,
    );
  }

  private async createLines(
    db: Prisma.TransactionClient,
    companyId: string,
    paymentTermId: string,
    lines: PaymentTermLineDto[],
  ) {
    for (const line of lines) {
      await db.paymentTermLine.create({
        data: {
          companyId,
          paymentTermId,
          sequence: line.sequence,
          calculationType: line.calculationType,
          percentage:
            line.percentage === undefined || line.percentage === null
              ? null
              : new Prisma.Decimal(line.percentage),
          dueDays: line.dueDays,
        },
      });
    }
  }

  private async audit(
    db: Prisma.TransactionClient,
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

  private rethrowConflict(error: unknown, message: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw new ConflictException(message);
    throw error;
  }
}
