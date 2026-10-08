// ============================================
// Auth Module — Wiring & Dependencies
// ============================================
// Registers all Auth providers and configures JWT/Passport.
//
// Architecture:
//   Controller → Service → Use Cases → Repository → Prisma
//   JWT Strategy → Passport (validates access tokens)
//   Token Service → JwtService + AuthRepository (generates & stores tokens)
// ============================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Controller & Service
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Repository
import { AuthRepository } from './auth.repository';

// Use Cases
import {
  RegisterUseCase,
  LoginUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  LogoutAllUseCase,
  ChangePasswordUseCase,
  GetProfileUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
  GetSessionsUseCase,
  UpdateProfileUseCase,
} from './use-cases';

// Services
import { TokenService } from './services/token.service';
import { EmailService } from './services/email.service';
import { WhatsAppService } from './services/whatsapp.service';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';

// Notifications
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [
    // Push notifications (for security alerts & confirmations)
    NotificationsModule,
    PlatformModule,

    // Passport with JWT as default strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT module configuration
    // Note: We use sign-time options in TokenService, but JwtModule
    // still needs to be registered for JwtService to be injectable.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get<string>(
            'jwt.accessExpiresIn',
            '15m',
          ) as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Service layer
    AuthService,

    // Data access
    AuthRepository,

    // Token management
    TokenService,

    // JWT validation strategy
    JwtStrategy,

    // Use cases
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    LogoutAllUseCase,
    ChangePasswordUseCase,
    GetProfileUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    GetSessionsUseCase,
    UpdateProfileUseCase,

    // Notification services
    EmailService,
    WhatsAppService,
  ],
  exports: [
    // Export for other modules that may need to verify tokens or get user info
    AuthService,
    JwtStrategy,
    TokenService,
  ],
})
export class AuthModule {}
