/**
 * Database Module — Central module for database services
 *
 * Provides PrismaService globally. Module-specific repositories
 * are registered inside their own modules.
 */

import { Module, Global } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { SubscriptionGovernanceService } from './services/subscription-governance.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [PrismaService, SubscriptionGovernanceService],
  exports: [PrismaService, SubscriptionGovernanceService],
})
export class DatabaseModule {}
