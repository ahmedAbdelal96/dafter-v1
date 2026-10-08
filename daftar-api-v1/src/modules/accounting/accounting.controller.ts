import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  OwnerOnly,
  ProtectedRead,
} from '../../common/decorators/subscription.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/types';
import { AccountingService } from './accounting.service';
import {
  AccountingEntryQueryDto,
  CreateAccountingAccountDto,
  CreateAccountingConfigurationDto,
  CreateAccountingJournalDto,
  CreateAccountingPeriodDto,
  CreateFiscalYearDto,
  PostJournalEntryDto,
  ReverseJournalEntryDto,
  UpdateAccountingAccountDto,
  UpdateAccountingJournalDto,
  UpdateAccountingPeriodStatusDto,
  UpdateFiscalYearStatusDto,
} from './dto/accounting.dto';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewLedger')
  async listAccounts(@CurrentTenant() companyId: string) {
    return new ApiResponseDto(
      await this.accountingService.listAccounts(companyId),
    );
  }

  @Post('accounts')
  @OwnerOnly()
  async createAccount(
    @CurrentTenant() companyId: string,
    @Body() dto: CreateAccountingAccountDto,
  ) {
    return new ApiResponseDto(
      await this.accountingService.createAccount(companyId, dto),
    );
  }

  @Patch('accounts/:id')
  @OwnerOnly()
  async updateAccount(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountingAccountDto,
  ) {
    return new ApiResponseDto(
      await this.accountingService.updateAccount(companyId, id, dto),
    );
  }

  @Get('journals')
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewLedger')
  async listJournals(@CurrentTenant() companyId: string) {
    return new ApiResponseDto(
      await this.accountingService.listJournals(companyId),
    );
  }

  @Post('journals')
  @OwnerOnly()
  async createJournal(
    @CurrentTenant() companyId: string,
    @Body() dto: CreateAccountingJournalDto,
  ) {
    return new ApiResponseDto(
      await this.accountingService.createJournal(companyId, dto),
    );
  }

  @Patch('journals/:id')
  @OwnerOnly()
  async updateJournal(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountingJournalDto,
  ) {
    return new ApiResponseDto(
      await this.accountingService.updateJournal(companyId, id, dto),
    );
  }

  @Get('fiscal-years')
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewLedger')
  async listFiscalYears(@CurrentTenant() companyId: string) {
    return new ApiResponseDto(
      await this.accountingService.listFiscalYears(companyId),
    );
  }

  @Post('fiscal-years')
  @OwnerOnly()
  async createFiscalYear(
    @CurrentTenant() companyId: string,
    @Body() dto: CreateFiscalYearDto,
  ) {
    return new ApiResponseDto(
      await this.accountingService.createFiscalYear(companyId, dto),
    );
  }

  @Patch('fiscal-years/:id/status')
  @OwnerOnly()
  async changeFiscalYearStatus(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFiscalYearStatusDto,
  ) {
    return new ApiResponseDto(
      await this.accountingService.changeFiscalYearStatus(companyId, id, dto),
    );
  }

  @Get('periods')
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewLedger')
  async listPeriods(
    @CurrentTenant() companyId: string,
    @Query('fiscalYearId', new ParseUUIDPipe({ optional: true }))
    fiscalYearId?: string,
  ) {
    return new ApiResponseDto(
      await this.accountingService.listPeriods(companyId, fiscalYearId),
    );
  }

  @Post('periods')
  @OwnerOnly()
  async createPeriod(
    @CurrentTenant() companyId: string,
    @Body() dto: CreateAccountingPeriodDto,
  ) {
    return new ApiResponseDto(
      await this.accountingService.createPeriod(companyId, dto),
    );
  }

  @Patch('periods/:id/status')
  @OwnerOnly()
  async changePeriodStatus(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountingPeriodStatusDto,
  ) {
    return new ApiResponseDto(
      await this.accountingService.changePeriodStatus(companyId, id, dto),
    );
  }

  @Get('configuration')
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewLedger')
  async getConfiguration(@CurrentTenant() companyId: string) {
    return new ApiResponseDto(
      await this.accountingService.getConfiguration(companyId),
    );
  }

  @Put('configuration')
  @OwnerOnly()
  async updateConfiguration(
    @CurrentTenant() companyId: string,
    @Body() dto: CreateAccountingConfigurationDto,
  ) {
    return new ApiResponseDto(
      await this.accountingService.updateConfiguration(companyId, dto),
    );
  }

  @Post('journal-entries')
  @HttpCode(HttpStatus.CREATED)
  @OwnerOnly()
  async postJournalEntry(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PostJournalEntryDto,
  ) {
    return new ApiResponseDto(
      await this.accountingService.post(companyId, user.id, dto),
    );
  }

  @Get('journal-entries')
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewLedger')
  async listJournalEntries(
    @CurrentTenant() companyId: string,
    @Query() query: AccountingEntryQueryDto,
  ) {
    return new ApiResponseDto(
      await this.accountingService.listEntries(companyId, query),
    );
  }

  @Get('journal-entries/:id')
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewLedger')
  async getJournalEntry(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.accountingService.getEntry(companyId, id),
    );
  }

  @Post('journal-entries/:id/reversal')
  @HttpCode(HttpStatus.CREATED)
  @OwnerOnly()
  async reverseJournalEntry(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseJournalEntryDto,
  ) {
    return new ApiResponseDto(
      await this.accountingService.reverse(companyId, user.id, id, dto),
    );
  }
}
