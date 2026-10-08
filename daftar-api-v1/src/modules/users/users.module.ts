// ============================================
// Users Module — Wiring & Dependencies
// ============================================
// Registers all Users providers for Owner → Staff management.
//
// Architecture:
//   Controller → Service → Use Cases → Repository → Prisma
//
// Guard strategy: @OwnerOnly() / @ProtectedRead()
// — applied per route in controller (not module-level).
// ============================================

import { Module } from '@nestjs/common';
import { AuthRepository } from '../auth/auth.repository';
import { EmailService } from '../auth/services/email.service';
import { WhatsAppService } from '../auth/services/whatsapp.service';

// Controller & Service
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// Repository
import { UsersRepository } from './users.repository';

// Use Cases
import {
  CreateStaffUseCase,
  ListUsersUseCase,
  GetUserUseCase,
  UpdateUserUseCase,
  UpdatePermissionsUseCase,
  DisableUserUseCase,
  EnableUserUseCase,
  GetStatsUseCase,
  ResetUserCredentialsUseCase,
} from './use-cases';

@Module({
  controllers: [UsersController],
  providers: [
    // Service layer
    UsersService,

    // Data access
    UsersRepository,

    // Use cases
    CreateStaffUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    UpdatePermissionsUseCase,
    DisableUserUseCase,
    EnableUserUseCase,
    GetStatsUseCase,
    ResetUserCredentialsUseCase,
    AuthRepository,
    EmailService,
    WhatsAppService,
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
