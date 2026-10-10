import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';

export class StaffPermissionsDto {
  @ApiPropertyOptional({
    example: true,
    description: 'View customer payment documents and AR open items.',
  })
  @IsOptional()
  @IsBoolean()
  viewCustomerPayments?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Create customer payment drafts.',
  })
  @IsOptional()
  @IsBoolean()
  createCustomerPayment?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Edit customer payment drafts.',
  })
  @IsOptional()
  @IsBoolean()
  editCustomerPayment?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Post or reverse customer payments.',
  })
  @IsOptional()
  @IsBoolean()
  postCustomerPayment?: boolean;

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

export class CreateStaffDto {
  @ApiProperty({
    description: 'Full name of the staff user',
    example: 'Sara Ahmed',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MaxLength(200)
  fullName: string;

  @ApiProperty({ description: 'Login email', example: 'sara@company.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description:
      'Password - at least 8 chars, one uppercase letter and one number',
    example: 'Staff@2026',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter and one number',
  })
  password: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '01012345678',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    type: StaffPermissionsDto,
    description: 'Staff permissions',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffPermissionsDto)
  permissions?: StaffPermissionsDto;
}
