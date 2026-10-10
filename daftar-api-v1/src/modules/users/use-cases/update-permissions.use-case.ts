import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersRepository } from '../users.repository';
import { UpdatePermissionsDto } from '../dto';
import { StaffPermissionsMap } from '../../../common/types';
import { TranslationService } from '../../../common/services/translation.service';

function mapPermissions(dto: UpdatePermissionsDto): StaffPermissionsMap {
  return {
    overridePurchaseTax: dto.overridePurchaseTax ?? false,
    viewPurchaseOrders: dto.viewPurchaseOrders ?? false,
    managePurchaseOrders: dto.managePurchaseOrders ?? false,
    approvePurchaseOrders: dto.approvePurchaseOrders ?? false,
    viewSupplierInvoices: dto.viewSupplierInvoices ?? false,
    manageSupplierInvoices: dto.manageSupplierInvoices ?? false,
    postSupplierInvoices: dto.postSupplierInvoices ?? false,
    viewSupplierCreditNotes: dto.viewSupplierCreditNotes ?? false,
    manageSupplierCreditNotes: dto.manageSupplierCreditNotes ?? false,
    postSupplierCreditNotes: dto.postSupplierCreditNotes ?? false,
    viewSupplierPayments: dto.viewSupplierPayments ?? false,
    createSupplierPayment: dto.createSupplierPayment ?? false,
    editSupplierPayment: dto.editSupplierPayment ?? false,
    postSupplierPayment: dto.postSupplierPayment ?? false,
    manageUsers: dto.manageUsers ?? false,
    viewParties: dto.viewParties ?? false,
    manageParties: dto.manageParties ?? false,
    viewLedger: dto.viewLedger ?? false,
    manageLedger: dto.manageLedger ?? false,
    viewReports: dto.viewReports ?? false,
    'tax_setup.view': dto.taxSetupView ?? false,
    'tax_setup.manage_registration_profile':
      dto.taxSetupManageRegistrationProfile ?? false,
    'tax_setup.create_rate': dto.taxSetupCreateRate ?? false,
    'tax_setup.edit_rate': dto.taxSetupEditRate ?? false,
    'tax_setup.archive_rate': dto.taxSetupArchiveRate ?? false,
    'tax_setup.manage_treatments': dto.taxSetupManageTreatments ?? false,
    'tax_setup.manage_defaults': dto.taxSetupManageDefaults ?? false,
    'tax_setup.manage_account_bindings':
      dto.taxSetupManageAccountBindings ?? false,
    'tax_setup.manage_module_applicability':
      dto.taxSetupManageModuleApplicability ?? false,
  };
}

@Injectable()
export class UpdatePermissionsUseCase {
  constructor(
    private readonly repo: UsersRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(
    companyId: string,
    userId: string,
    dto: UpdatePermissionsDto,
    actorUserId: string,
  ) {
    const user = await this.repo.findById(companyId, userId);
    if (!user) {
      throw new NotFoundException(this.t.translate('users.get.notFound'));
    }

    if (user.role === UserRole.OWNER) {
      throw new BadRequestException(
        this.t.translate('users.permissions.ownerCannotBeModified'),
      );
    }

    const permissions = await this.repo.updatePermissions(
      companyId,
      userId,
      mapPermissions(dto),
      actorUserId,
    );

    return permissions;
  }
}
