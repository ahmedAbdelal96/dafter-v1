// ============================================
// DTO: Create Staff User (إنشاء موظف جديد)
// ============================================
// Owner ينشئ حساب Staff جديد مع تحديد صلاحياته.
// كل Staff يحصل على StaffPermission row في نفس الـ transaction.
// ============================================

import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StaffPermissionsDto {
  @ApiPropertyOptional({
    description: 'إنشاء/تعطيل Staff وتعديل صلاحياتهم',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  manageUsers?: boolean;

  @ApiPropertyOptional({
    description: 'عرض بيانات العملاء والموردين والموظفين (قراءة فقط)',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  viewParties?: boolean;

  @ApiPropertyOptional({
    description: 'إدارة العملاء والموردين والموظفين (CRUD كامل)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  manageParties?: boolean;

  @ApiPropertyOptional({
    description: 'عرض حركات دفتر الحسابات والأرصدة (قراءة فقط)',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  viewLedger?: boolean;

  @ApiPropertyOptional({
    description: 'إنشاء وتعديل وحذف حركات مالية (Ledger)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  manageLedger?: boolean;

  @ApiPropertyOptional({
    description: 'عرض وتصدير التقارير',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  viewReports?: boolean;
}

export class CreateStaffDto {
  @ApiProperty({
    description: 'الاسم الكامل للموظف',
    example: 'سارة أحمد',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'الاسم الكامل مطلوب' })
  @MaxLength(200)
  fullName: string;

  @ApiProperty({
    description: 'البريد الإلكتروني (سيُستخدم لتسجيل الدخول)',
    example: 'sara@company.com',
  })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @IsNotEmpty({ message: 'البريد الإلكتروني مطلوب' })
  email: string;

  @ApiProperty({
    description: 'كلمة المرور — 8 أحرف على الأقل، تحتوي على حرف كبير ورقم',
    example: 'Staff@2026',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message: 'كلمة المرور يجب أن تحتوي على حرف كبير ورقم واحد على الأقل',
  })
  password: string;

  @ApiPropertyOptional({
    description: 'رقم الهاتف',
    example: '01012345678',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'صلاحيات الموظف داخل الشركة',
    type: StaffPermissionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffPermissionsDto)
  permissions?: StaffPermissionsDto;
}
