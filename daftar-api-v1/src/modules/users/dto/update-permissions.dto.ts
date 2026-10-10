import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePermissionsDto {
  @ApiPropertyOptional({ example: true, description: 'View purchase orders.' })
  @IsOptional()
  @IsBoolean()
  viewPurchaseOrders?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Create and edit purchase orders.',
  })
  @IsOptional()
  @IsBoolean()
  managePurchaseOrders?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Approve purchase orders.',
  })
  @IsOptional()
  @IsBoolean()
  approvePurchaseOrders?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'View supplier invoices.',
  })
  @IsOptional()
  @IsBoolean()
  viewSupplierInvoices?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Create and edit supplier invoices.',
  })
  @IsOptional()
  @IsBoolean()
  manageSupplierInvoices?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Post supplier invoices.',
  })
  @IsOptional()
  @IsBoolean()
  postSupplierInvoices?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'View supplier credit notes.',
  })
  @IsOptional()
  @IsBoolean()
  viewSupplierCreditNotes?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Create and edit supplier credit notes.',
  })
  @IsOptional()
  @IsBoolean()
  manageSupplierCreditNotes?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Post supplier credit notes.',
  })
  @IsOptional()
  @IsBoolean()
  postSupplierCreditNotes?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Create or manage staff users.',
  })
  @IsOptional()
  @IsBoolean()
  manageUsers?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'View customers, suppliers, and employees.',
  })
  @IsOptional()
  @IsBoolean()
  viewParties?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Manage customers, suppliers, and employees.',
  })
  @IsOptional()
  @IsBoolean()
  manageParties?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'View ledger and accounting activity.',
  })
  @IsOptional()
  @IsBoolean()
  viewLedger?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Create and edit ledger actions.',
  })
  @IsOptional()
  @IsBoolean()
  manageLedger?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'View accounting reports.',
  })
  @IsOptional()
  @IsBoolean()
  viewReports?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'View tax setup screens.',
  })
  @IsOptional()
  @IsBoolean()
  taxSetupView?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Manage tax registration profile.',
  })
  @IsOptional()
  @IsBoolean()
  taxSetupManageRegistrationProfile?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Create tax rates.' })
  @IsOptional()
  @IsBoolean()
  taxSetupCreateRate?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Edit tax rates.' })
  @IsOptional()
  @IsBoolean()
  taxSetupEditRate?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Archive tax rates.' })
  @IsOptional()
  @IsBoolean()
  taxSetupArchiveRate?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Manage tax treatments.',
  })
  @IsOptional()
  @IsBoolean()
  taxSetupManageTreatments?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Manage default tax policy.',
  })
  @IsOptional()
  @IsBoolean()
  taxSetupManageDefaults?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Manage tax account bindings.',
  })
  @IsOptional()
  @IsBoolean()
  taxSetupManageAccountBindings?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Manage tax module applicability rules.',
  })
  @IsOptional()
  @IsBoolean()
  taxSetupManageModuleApplicability?: boolean;
}
