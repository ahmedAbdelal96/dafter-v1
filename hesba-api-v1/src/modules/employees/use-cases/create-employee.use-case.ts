import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { EmployeesRepository } from '../employees.repository';
import { CreateEmployeeDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';
import { EntitlementService } from '../../../common/entitlements/entitlement.service';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class CreateEmployeeUseCase {
  private readonly logger = new Logger(CreateEmployeeUseCase.name);

  constructor(
    private readonly repo: EmployeesRepository,
    private readonly t: TranslationService,
    private readonly entitlementService: EntitlementService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(companyId: string, actorUserId: string, dto: CreateEmployeeDto) {
    this.logger.log(`Creating employee "${dto.name}" for company ${companyId}`);

    const nameExists = await this.repo.existsByName(companyId, dto.name);
    if (nameExists) {
      throw new ConflictException(this.t.translate('employees.create.nameExists'));
    }

    const employee = await this.prisma.$transaction(async (tx) => {
      await this.entitlementService.assertQuota(companyId, 'employees', tx);
      return this.repo.createWithBalance(
        {
          companyId,
          actorUserId,
          name: dto.name,
          phone: dto.phone,
          jobTitle: dto.jobTitle,
          openingBalance: dto.openingBalance ?? 0,
        },
        tx,
      );
    });

    this.logger.log(`Employee created: ${employee.id}`);
    return employee;
  }
}
