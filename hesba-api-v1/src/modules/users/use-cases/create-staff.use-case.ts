import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users.repository';
import { CreateStaffDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';
import { EntitlementService } from '../../../common/entitlements/entitlement.service';
import { PrismaService } from '../../../database/prisma/prisma.service';

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
          permissions: {
            manageUsers: dto.permissions?.manageUsers ?? false,
            viewParties: dto.permissions?.viewParties ?? false,
            manageParties: dto.permissions?.manageParties ?? false,
            viewLedger: dto.permissions?.viewLedger ?? false,
            manageLedger: dto.permissions?.manageLedger ?? false,
            viewReports: dto.permissions?.viewReports ?? false,
          },
        },
        tx,
      );
    });

    const { passwordHash: _removed, ...safeUser } = user;
    return safeUser;
  }
}
