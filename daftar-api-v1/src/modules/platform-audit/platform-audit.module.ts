import { Module } from '@nestjs/common';
import { PlatformAuditController } from './platform-audit.controller';
import { PlatformAuditRepository } from './platform-audit.repository';
import { PlatformAuditService } from './platform-audit.service';
import { GetPlatformAuditLogsUseCase, GetPlatformAuditLookupsUseCase } from './use-cases';

@Module({
  controllers: [PlatformAuditController],
  providers: [
    PlatformAuditService,
    PlatformAuditRepository,
    GetPlatformAuditLogsUseCase,
    GetPlatformAuditLookupsUseCase,
  ],
})
export class PlatformAuditModule {}
