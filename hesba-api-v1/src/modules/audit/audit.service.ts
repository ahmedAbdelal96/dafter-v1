import { Injectable } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import { AuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  list(companyId: string, query: AuditQueryDto) {
    return this.repo.findMany(companyId, query);
  }
}
