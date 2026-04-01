// ============================================
// Get Employee Use Case
// ============================================

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EmployeesRepository } from '../employees.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetEmployeeUseCase {
  private readonly logger = new Logger(GetEmployeeUseCase.name);

  constructor(
    private readonly repo: EmployeesRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, employeeId: string) {
    const employee = await this.repo.findById(companyId, employeeId);

    if (!employee) {
      throw new NotFoundException(this.t.translate('employees.get.notFound'));
    }

    return employee;
  }
}
