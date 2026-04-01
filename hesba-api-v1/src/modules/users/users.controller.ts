// ============================================
// Users Controller â€” HTTP Endpoints
// ============================================
// Owner manages Staff accounts and permissions for their company.
//
// Endpoints:
//   POST   /users/staff          â€” Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ¸Ù Ø¬Ø¯ÙŠØ¯ (Owner ÙÙ‚Ø·)
//   GET    /users/stats          â€” Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† (Owner ÙÙ‚Ø·)
//   GET    /users                â€” Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† (Owner + Staff[manageUsers])
//   GET    /users/:id            â€” Ø¹Ø±Ø¶ Ù…Ø³ØªØ®Ø¯Ù… (Owner + Staff)
//   PATCH  /users/:id            â€” ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª (Owner ÙÙ‚Ø·)
//   PATCH  /users/:id/permissions â€” ØªØ¹Ø¯ÙŠÙ„ ØµÙ„Ø§Ø­ÙŠØ§Øª (Owner ÙÙ‚Ø·)
//   PATCH  /users/:id/disable    â€” ØªØ¹Ø·ÙŠÙ„ Ø­Ø³Ø§Ø¨ (Owner ÙÙ‚Ø·)
//   PATCH  /users/:id/enable     â€” Ø¥Ø¹Ø§Ø¯Ø© ØªÙØ¹ÙŠÙ„ Ø­Ø³Ø§Ø¨ (Owner ÙÙ‚Ø·)
//
// Guard Strategy:
//   @OwnerOnly()     = ProtectedWrite(OWNER, SUPER_ADMIN) â†’ active subscription required
//   @ProtectedRead() = JwtAuth + Roles + Read-only subscription bypass
//   PermissionsGuard = added manually where STAFF needs specific permission flag
// ============================================

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateStaffDto,
  UpdateUserDto,
  UpdatePermissionsDto,
  UserQueryDto,
  ResetCredentialsDto,
} from './dto';
import {
  OwnerOnly,
  ProtectedRead,
} from '../../common/decorators/subscription.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import {
  UsersApiTags,
  CreateStaffSwagger,
  ListUsersSwagger,
  GetUserSwagger,
  UpdateUserSwagger,
  UpdatePermissionsSwagger,
  DisableUserSwagger,
  EnableUserSwagger,
  GetUsersStatsSwagger,
} from './swagger/users.swagger';

@Controller('users')
@UsersApiTags()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly t: TranslationService,
  ) {}

  // â”€â”€ POST /users/staff â€” Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ¸Ù Ø¬Ø¯ÙŠØ¯ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Post('staff')
  @CreateStaffSwagger()
  @OwnerOnly()
  async createStaff(
    @Body() dto: CreateStaffDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() companyId: string,
  ) {
    const data = await this.usersService.createStaff(companyId, user.id, dto);
    return new ApiResponseDto(data, this.t.translate('users.create.success'));
  }

  // â”€â”€ GET /users/stats â€” Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª (Ù‚Ø¨Ù„ /:id Ù„ØªØ¬Ù†Ø¨ UUID conflict) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Get('stats')
  @GetUsersStatsSwagger()
  @OwnerOnly()
  async getStats(@CurrentTenant() companyId: string) {
    const data = await this.usersService.getStats(companyId);
    return new ApiResponseDto(data, this.t.translate('users.stats.success'));
  }

  // â”€â”€ GET /users â€” Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Get()
  @ListUsersSwagger()
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('manageUsers')
  async listUsers(
    @Query() query: UserQueryDto,
    @CurrentTenant() companyId: string,
  ) {
    const result = await this.usersService.listUsers(companyId, query);
    const response = new ApiResponseDto(
      result.items,
      this.t.translate('users.list.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  // â”€â”€ GET /users/:id â€” Ø¹Ø±Ø¶ Ù…Ø³ØªØ®Ø¯Ù… ÙˆØ§Ø­Ø¯ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Get(':id')
  @GetUserSwagger()
  @ProtectedRead()
  async getUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @CurrentTenant() companyId: string,
  ) {
    const data = await this.usersService.getUser(companyId, userId);
    return new ApiResponseDto(data, this.t.translate('users.get.success'));
  }

  // â”€â”€ PATCH /users/:id â€” ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Patch(':id')
  @UpdateUserSwagger()
  @OwnerOnly()
  async updateUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() companyId: string,
  ) {
    const data = await this.usersService.updateUser(
      companyId,
      userId,
      dto,
      user.id,
    );
    return new ApiResponseDto(data, this.t.translate('users.update.success'));
  }

  // â”€â”€ PATCH /users/:id/permissions â€” ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Patch(':id/permissions')
  @UpdatePermissionsSwagger()
  @OwnerOnly()
  @HttpCode(HttpStatus.OK)
  async updatePermissions(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdatePermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() companyId: string,
  ) {
    const data = await this.usersService.updatePermissions(
      companyId,
      userId,
      dto,
      user.id,
    );
    return new ApiResponseDto(
      data,
      this.t.translate('users.permissions.updated'),
    );
  }

  // â”€â”€ PATCH /users/:id/disable â€” ØªØ¹Ø·ÙŠÙ„ Ø­Ø³Ø§Ø¨ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Patch(':id/disable')
  @DisableUserSwagger()
  @OwnerOnly()
  @HttpCode(HttpStatus.OK)
  async disableUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() companyId: string,
  ) {
    const data = await this.usersService.disableUser(
      companyId,
      userId,
      user.id,
    );
    return new ApiResponseDto(data, this.t.translate('users.disable.success'));
  }
  // â”€â”€ PATCH /users/:id/enable â€” Ø¥Ø¹Ø§Ø¯Ø© ØªÙØ¹ÙŠÙ„ Ø­Ø³Ø§Ø¨ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Patch(':id/enable')
  @EnableUserSwagger()
  @OwnerOnly()
  @HttpCode(HttpStatus.OK)
  async enableUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() companyId: string,
  ) {
    const data = await this.usersService.enableUser(companyId, userId, user.id);
    return new ApiResponseDto(data, this.t.translate('users.enable.success'));
  }

  // -- POST /users/:id/reset-credentials -- trigger OTP reset for staff account --
  @Post(':id/reset-credentials')
  @OwnerOnly()
  @HttpCode(HttpStatus.OK)
  async resetCredentials(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: ResetCredentialsDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() companyId: string,
  ) {
    const data = await this.usersService.resetCredentials(
      companyId,
      userId,
      user.id,
      dto,
    );
    return new ApiResponseDto(data, this.t.translate('users.credentialsReset.success'));
  }
}

