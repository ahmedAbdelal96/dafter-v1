import { Injectable } from '@nestjs/common';
import { QueryPlatformAuditLogsDto, QueryPlatformAuditLookupsDto } from './dto';
import { GetPlatformAuditLogsUseCase, GetPlatformAuditLookupsUseCase } from './use-cases';

@Injectable()
export class PlatformAuditService {
  constructor(
    private readonly getAuditLogsUseCase: GetPlatformAuditLogsUseCase,
    private readonly getAuditLookupsUseCase: GetPlatformAuditLookupsUseCase,
  ) {}

  getAuditLogs(query: QueryPlatformAuditLogsDto) {
    return this.getAuditLogsUseCase.execute(query);
  }

  getAuditLookups(query: QueryPlatformAuditLookupsDto) {
    return this.getAuditLookupsUseCase.execute(query);
  }
}
