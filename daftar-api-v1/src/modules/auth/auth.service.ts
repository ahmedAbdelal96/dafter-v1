// ============================================
// Auth Service — Orchestration Layer
// ============================================
// Delegates to Use Cases. Each public method corresponds to
// one API endpoint. The service's only job is to call the
// right use case — no business logic lives here.
//
// Why separate Service from Use Cases?
//   - Use Cases are single-responsibility and independently testable
//   - Service is the public API that the Controller calls
//   - Easier to refactor, extend, or swap implementations
// ============================================

import { Injectable } from '@nestjs/common';
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
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from './dto';

/** Request metadata extracted from HTTP request */
export interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly registerUC: RegisterUseCase,
    private readonly loginUC: LoginUseCase,
    private readonly refreshTokenUC: RefreshTokenUseCase,
    private readonly logoutUC: LogoutUseCase,
    private readonly logoutAllUC: LogoutAllUseCase,
    private readonly changePasswordUC: ChangePasswordUseCase,
    private readonly getProfileUC: GetProfileUseCase,
    private readonly forgotPasswordUC: ForgotPasswordUseCase,
    private readonly resetPasswordUC: ResetPasswordUseCase,
    private readonly getSessionsUC: GetSessionsUseCase,
    private readonly updateProfileUC: UpdateProfileUseCase,
  ) {}

  register(dto: RegisterDto, meta: RequestMeta) {
    return this.registerUC.execute(dto, meta);
  }

  login(dto: LoginDto, meta: RequestMeta) {
    return this.loginUC.execute(dto, meta);
  }

  refreshToken(dto: RefreshTokenDto, meta: RequestMeta) {
    return this.refreshTokenUC.execute(dto, meta);
  }

  logout(refreshToken: string, userId: string) {
    return this.logoutUC.execute(refreshToken, userId);
  }

  logoutAll(userId: string) {
    return this.logoutAllUC.execute(userId);
  }

  changePassword(userId: string, dto: ChangePasswordDto) {
    return this.changePasswordUC.execute(userId, dto);
  }

  getProfile(userId: string) {
    return this.getProfileUC.execute(userId);
  }

  forgotPassword(identifier: string) {
    return this.forgotPasswordUC.execute(identifier);
  }

  resetPassword(identifier: string, otp: string, newPassword: string) {
    return this.resetPasswordUC.execute(identifier, otp, newPassword);
  }

  getSessions(userId: string) {
    return this.getSessionsUC.execute(userId);
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.updateProfileUC.execute(userId, dto);
  }
}
