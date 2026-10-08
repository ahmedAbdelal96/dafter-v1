import { Module } from '@nestjs/common';
import { TaxSetupController } from './controllers/tax-setup.controller';
import { TaxAuditService } from './services/tax-audit.service';
import { TaxSetupPolicyService } from './services/tax-setup-policy.service';
import { TaxSetupService } from './services/tax-setup.service';

@Module({
  controllers: [TaxSetupController],
  providers: [TaxSetupService, TaxSetupPolicyService, TaxAuditService],
  exports: [TaxSetupService, TaxSetupPolicyService],
})
export class TaxSetupModule {}
