/**
 * EntitlementsModule — Routes for feature catalog and company entitlement state.
 *
 * EntitlementService is provided by the global EntitlementModule,
 * so no need to import it here.
 */

import { Module }                    from '@nestjs/common';
import { EntitlementsController }    from './entitlements.controller';

@Module({
  controllers: [EntitlementsController],
})
export class EntitlementsModule {}
