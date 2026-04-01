/**
 * EntitlementModule — Global entitlement enforcement infrastructure.
 *
 * @Global() means any module in the app can inject EntitlementService
 * without needing to import this module explicitly.
 *
 * Dependencies (all provided by their own @Global() modules):
 *   - PrismaService       → DatabaseModule
 *   - CacheService        → CacheModule
 *   - SubscriptionGovernanceService → DatabaseModule
 */

import { Global, Module } from '@nestjs/common';
import { EntitlementService } from './entitlement.service';

@Global()
@Module({
  providers: [EntitlementService],
  exports:   [EntitlementService],
})
export class EntitlementModule {}
