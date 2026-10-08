import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users.repository';
import { CreateStaffDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';
import { EntitlementService } from '../../../common/entitlements/entitlement.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { StaffPermissionsMap } from '../../../common/types';

function mapStaffPermissions(dto?: CreateStaffDto['permissions']): StaffPermissionsMap {
  return {
    manageUsers: dto?.manageUsers ?? false,
    viewParties: dto?.viewParties ?? false,
    manageParties: dto?.manageParties ?? false,
    viewLedger: dto?.viewLedger ?? false,
    manageLedger: dto?.manageLedger ?? false,
    viewReports: dto?.viewReports ?? false,
    'tax_setup.view': dto?.taxSetupView ?? false,
    'tax_setup.manage_registration_profile': dto?.taxSetupManageRegistrationProfile ?? false,
    'tax_setup.create_rate': dto?.taxSetupCreateRate ?? false,
    'tax_setup.edit_rate': dto?.taxSetupEditRate ?? false,
    'tax_setup.archive_rate': dto?.taxSetupArchiveRate ?? false,
    'tax_setup.manage_treatments': dto?.taxSetupManageTreatments ?? false,
    'tax_setup.manage_defaults': dto?.taxSetupManageDefaults ?? false,
    'tax_setup.manage_account_bindings': dto?.taxSetupManageAccountBindings ?? false,
    'tax_setup.manage_module_applicability': dto?.taxSetupManageModuleApplicability ?? false,
  };
}

@Injectable()
export class CreateStaffUseCase {
  constructor(
    private readonly repo: UsersRepository,
    private readonly t: TranslationService,
    private readonly entitlementService: EntitlementService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(companyId: string, actorUserId: string, dto: CreateStaffDto) {
    const exists = await this.repo.emailExists(dto.email);
    if (exists) {
      throw new BadRequestException(this.t.translate('users.create.emailExists'));
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      await this.entitlementService.assertQuota(companyId, 'users', tx);
      return this.repo.createStaff(
        {
          companyId,
          actorUserId,
          fullName: dto.fullName,
          email: dto.email,
          passwordHash,
          phone: dto.phone,
          permissions: mapStaffPermissions(dto.permissions),
        },
        tx,
      );
    });

    const { passwordHash: _removed, ...safeUser } = user;
    return safeUser;
  }
}
