import { Module } from '@nestjs/common';
import { PlatformIdempotencyModule } from '../platform/idempotency/platform-idempotency.module';
import { AccountingBootstrapController } from './accounting-bootstrap.controller';
import { AccountingReadinessService } from './accounting-readiness.service';
import {
  AccountingBootstrapService,
  InitializeCompanyAccounting,
} from './accounting-bootstrap.service';
import { TemplateService } from './template.service';

@Module({
  imports: [PlatformIdempotencyModule],
  controllers: [AccountingBootstrapController],
  providers: [
    TemplateService,
    AccountingReadinessService,
    InitializeCompanyAccounting,
    AccountingBootstrapService,
  ],
  exports: [
    TemplateService,
    AccountingReadinessService,
    InitializeCompanyAccounting,
    AccountingBootstrapService,
  ],
})
export class AccountingBootstrapModule {}
