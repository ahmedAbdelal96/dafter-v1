import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { SuppliersRepository } from '../suppliers.repository';
import { CreateSupplierDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';
import { EntitlementService } from '../../../common/entitlements/entitlement.service';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class CreateSupplierUseCase {
  private readonly logger = new Logger(CreateSupplierUseCase.name);

  constructor(
    private readonly repo: SuppliersRepository,
    private readonly t: TranslationService,
    private readonly entitlementService: EntitlementService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(companyId: string, actorUserId: string, dto: CreateSupplierDto) {
    this.logger.log(`Creating supplier "${dto.name}" for company ${companyId}`);

    const nameExists = await this.repo.existsByName(companyId, dto.name);
    if (nameExists) {
      throw new ConflictException(this.t.translate('suppliers.create.nameExists'));
    }

    const supplier = await this.prisma.$transaction(async (tx) => {
      await this.entitlementService.assertQuota(companyId, 'suppliers', tx);
      return this.repo.createWithBalance(
        {
          companyId,
          actorUserId,
          name: dto.name,
          phone: dto.phone,
          address: dto.address,
          openingBalance: dto.openingBalance ?? 0,
        },
        tx,
      );
    });

    this.logger.log(`Supplier created: ${supplier.id}`);
    return supplier;
  }
}
