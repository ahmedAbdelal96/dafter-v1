// ============================================
// Auth Controller â€” HTTP Endpoints
// ============================================
// Clean controller: receives HTTP request â†’ extracts data â†’ calls service â†’ returns response.
// All Swagger documentation is in swagger/auth.swagger.ts.
// All business logic is in use-cases/.
// ============================================

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import {
  AuthApiTags,
  RegisterSwagger,
  LoginSwagger,
  RefreshTokenSwagger,
  LogoutSwagger,
  LogoutAllSwagger,
  ChangePasswordSwagger,
  GetProfileSwagger,
  ForgotPasswordSwagger,
  ResetPasswordSwagger,
  GetSessionsSwagger,
} from './swagger/auth.swagger';

@Controller('auth')
@AuthApiTags()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly t: TranslationService,
  ) {}

  /**
   * Extract request metadata (IP + User Agent) for security tracking
   */
  private getMeta(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket?.remoteAddress,
    };
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // POST /auth/register â€” ØªØ³Ø¬ÙŠÙ„ Ø­Ø³Ø§Ø¨ Ø¬Ø¯ÙŠØ¯
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  @Post('register')
  @RegisterSwagger()
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 registrations per minute max
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const data = await this.authService.register(dto, this.getMeta(req));
    return new ApiResponseDto(data, this.t.translate('auth.register.success'));
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // POST /auth/login â€” ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  @Post('login')
  @LoginSwagger()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 login attempts per minute
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const data = await this.authService.login(dto, this.getMeta(req));
    return new ApiResponseDto(data, this.t.translate('auth.login.success'));
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // POST /auth/refresh â€” ØªØ¬Ø¯ÙŠØ¯ Ø§Ù„ØªÙˆÙƒÙ†
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  @Post('refresh')
  @RefreshTokenSwagger()
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const data = await this.authService.refreshToken(dto, this.getMeta(req));
    return new ApiResponseDto(data, this.t.translate('auth.refresh.success'));
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // POST /auth/logout â€” ØªØ³Ø¬ÙŠÙ„ Ø®Ø±ÙˆØ¬ (Ø¬Ù‡Ø§Ø² ÙˆØ§Ø­Ø¯)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  @Post('logout')
  @LogoutSwagger()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body('refreshToken') refreshToken: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authService.logout(refreshToken, user.id);
    return new ApiResponseDto(null, this.t.translate('auth.logout.success'));
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // POST /auth/logout-all â€” ØªØ³Ø¬ÙŠÙ„ Ø®Ø±ÙˆØ¬ Ù…Ù† ÙƒÙ„ Ø§Ù„Ø£Ø¬Ù‡Ø²Ø©
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  @Post('logout-all')
  @LogoutAllSwagger()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.authService.logoutAll(user.id);
    return new ApiResponseDto(data, this.t.translate('auth.logout.allDevices'));
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // POST /auth/change-password â€” ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  @Post('change-password')
  @ChangePasswordSwagger()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authService.changePassword(user.id, dto);
    return new ApiResponseDto(
      null,
      this.t.translate('auth.changePassword.success'),
    );
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // GET /auth/me â€” Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø­Ø§Ù„ÙŠ
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  @Get('me')
  @GetProfileSwagger()
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.authService.getProfile(user.id);
    return new ApiResponseDto(
      data,
      this.t.translate('auth.profile.get.success'),
    );
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PATCH /auth/me â€” ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.authService.updateProfile(user.id, dto);
    return new ApiResponseDto(
      data,
      this.t.translate('auth.profile.update.success'),
    );
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // GET /auth/sessions â€” Ø¹Ø±Ø¶ Ø§Ù„Ø£Ø¬Ù‡Ø²Ø© Ø§Ù„Ù…ØªØµÙ„Ø©
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  @Get('sessions')
  @GetSessionsSwagger()
  @UseGuards(JwtAuthGuard)
  async getSessions(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.authService.getSessions(user.id);
    return new ApiResponseDto(data, this.t.translate('auth.sessions.success'));
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // POST /auth/forgot-password â€” Ø·Ù„Ø¨ Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ†
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  @Post('forgot-password')
  @ForgotPasswordSwagger()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } }) // 3 requests per minute â€” anti-abuse
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.authService.forgotPassword(dto.identifier);
    return new ApiResponseDto(
      data,
      this.t.translate('auth.forgotPassword.success'),
    );
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // POST /auth/reset-password â€” ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Ø¬Ø¯ÙŠØ¯Ø©
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  @Post('reset-password')
  @ResetPasswordSwagger()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 attempts per minute
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(
      dto.identifier,
      dto.otp,
      dto.newPassword,
    );
    return new ApiResponseDto(
      null,
      this.t.translate('auth.resetPassword.success'),
    );
  }
}

