import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { CustomersRepository } from '../customers.repository';
import { CreateCustomerDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';
import { EntitlementService } from '../../../common/entitlements/entitlement.service';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class CreateCustomerUseCase {
  private readonly logger = new Logger(CreateCustomerUseCase.name);

  constructor(
    private readonly repo: CustomersRepository,
    private readonly t: TranslationService,
    private readonly entitlementService: EntitlementService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(companyId: string, actorUserId: string, dto: CreateCustomerDto) {
    this.logger.log(`Creating customer "${dto.name}" for company ${companyId}`);

    const nameExists = await this.repo.existsByName(companyId, dto.name);
    if (nameExists) {
      throw new ConflictException(this.t.translate('customers.create.nameExists'));
    }

    const customer = await this.prisma.$transaction(async (tx) => {
      await this.entitlementService.assertQuota(companyId, 'customers', tx);
      return this.repo.createWithBalance(
        {
          companyId,
          actorUserId,
          name: dto.name,
          phone: dto.phone,
          address: dto.address,
          openingBalance: dto.openingBalance ?? 0,
          creditLimit: dto.creditLimit,
        },
        tx,
      );
    });

    this.logger.log(`Customer created: ${customer.id}`);
    return customer;
  }
}
