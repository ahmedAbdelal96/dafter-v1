// ============================================
// Notifications Controller â€” HTTP Endpoints
// ============================================
// All endpoints require JWT authentication.
// Notifications are scoped per authenticated user (userId from JWT).
//
// Endpoints:
//   POST   /notifications/device-token         â€” ØªØ³Ø¬ÙŠÙ„ Ø±Ù…Ø² Ø§Ù„Ø¬Ù‡Ø§Ø²
//   DELETE /notifications/device-token/:token  â€” Ø¥Ù„ØºØ§Ø¡ ØªØ³Ø¬ÙŠÙ„ Ø±Ù…Ø² Ø§Ù„Ø¬Ù‡Ø§Ø²
//   GET    /notifications                       â€” Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª
//   GET    /notifications/unread-count          â€” Ø¹Ø¯Ø¯ ØºÙŠØ± Ø§Ù„Ù…Ù‚Ø±ÙˆØ¡Ø© (Ø¨Ø§Ø¯Ø¬)
//   PATCH  /notifications/:id/read             â€” ØªØ­Ø¯ÙŠØ¯ Ø¥Ø´Ø¹Ø§Ø± ÙƒÙ…Ù‚Ø±ÙˆØ¡
//   PATCH  /notifications/read-all             â€” ØªØ­Ø¯ÙŠØ¯ Ø§Ù„ÙƒÙ„ ÙƒÙ…Ù‚Ø±ÙˆØ¡
// ============================================

import {
  Controller,
  Post,
  Delete,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { ListNotificationsQuery } from './use-cases/list-notifications.use-case';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import {
  ProtectedRead,
  ProtectedWrite,
} from '../../common/decorators/subscription.decorator';
import { UserRole } from '@prisma/client';
import {
  NotificationsApiTags,
  RegisterDeviceTokenSwagger,
  UnregisterDeviceTokenSwagger,
  ListNotificationsSwagger,
  GetUnreadCountSwagger,
  MarkReadSwagger,
  MarkAllReadSwagger,
} from './swagger/notifications.swagger';

const ALL_ROLES = [UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN];

@Controller('notifications')
@NotificationsApiTags()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly t: TranslationService,
  ) {}

  // â”€â”€ POST /notifications/device-token â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Post('device-token')
  @RegisterDeviceTokenSwagger()
  @ProtectedWrite(...ALL_ROLES)
  async registerToken(
    @Body() dto: RegisterDeviceTokenDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.notificationsService.registerToken(user.id, dto);
    return new ApiResponseDto(
      data,
      this.t.translate('notifications.deviceToken.registered'),
    );
  }

  // â”€â”€ DELETE /notifications/device-token/:token â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Delete('device-token/:token')
  @UnregisterDeviceTokenSwagger()
  @ProtectedWrite(...ALL_ROLES)
  @HttpCode(HttpStatus.OK)
  async unregisterToken(
    @Param('token') token: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.notificationsService.unregisterToken(
      user.id,
      token,
    );
    return new ApiResponseDto(
      data,
      this.t.translate('notifications.deviceToken.unregistered'),
    );
  }

  // â”€â”€ GET /notifications/unread-count â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Must be declared BEFORE /:id routes to avoid route conflict
  @Get('unread-count')
  @GetUnreadCountSwagger()
  @ProtectedRead(...ALL_ROLES)
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.notificationsService.getUnreadCount(user.id);
    return new ApiResponseDto(
      data,
      this.t.translate('notifications.unreadCount.success'),
    );
  }

  // â”€â”€ GET /notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Get()
  @ListNotificationsSwagger()
  @ProtectedRead(...ALL_ROLES)
  async listNotifications(
    @Query() query: ListNotificationsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.notificationsService.listNotifications(
      user.id,
      query,
    );
    return new ApiResponseDto(
      data,
      this.t.translate('notifications.list.success'),
    );
  }

  // â”€â”€ PATCH /notifications/read-all â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Declares before /:id/read to avoid conflict
  @Patch('read-all')
  @MarkAllReadSwagger()
  @ProtectedWrite(...ALL_ROLES)
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.notificationsService.markAllRead(user.id);
    return new ApiResponseDto(
      data,
      this.t.translate('notifications.readAll.success'),
    );
  }

  // â”€â”€ PATCH /notifications/:id/read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Patch(':id/read')
  @MarkReadSwagger()
  @ProtectedWrite(...ALL_ROLES)
  @HttpCode(HttpStatus.OK)
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.notificationsService.markRead(user.id, id);
    return new ApiResponseDto(
      data,
      this.t.translate('notifications.read.success'),
    );
  }
}

