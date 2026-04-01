// ============================================
// DTO: Update Permissions (تعديل صلاحيات Staff)
// ============================================
// Owner يعدل صلاحيات Staff موجود.
// جميع الحقول اختيارية — أرسل فقط ما تريد تغييره.
// ============================================

import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePermissionsDto {
  @ApiPropertyOptional({
    description: 'إنشاء/تعطيل Staff وتعديل صلاحياتهم',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  manageUsers?: boolean;

  // ── Parties ─────────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'عرض بيانات الأطراف (عملاء / موردين / موظفين) — قراءة فقط',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  viewParties?: boolean;

  @ApiPropertyOptional({
    description: 'إدارة الأطراف كاملاً (CRUD) — يشمل القراءة ضمنياً',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  manageParties?: boolean;

  // ── Ledger ───────────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'عرض الحركات المالية والأرصدة — قراءة فقط',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  viewLedger?: boolean;

  @ApiPropertyOptional({
    description: 'إنشاء وتعديل وحذف حركات مالية — يشمل القراءة ضمنياً',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  manageLedger?: boolean;

  // ── Reports ──────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'عرض وتصدير التقارير', example: false })
  @IsOptional()
  @IsBoolean()
  viewReports?: boolean;

  // ── Invoices (P3-BE-2) ────────────────────────────────────
  @ApiPropertyOptional({ description: 'إنشاء فواتير مسودة', example: true })
  @IsOptional()
  @IsBoolean()
  createInvoice?: boolean;

  @ApiPropertyOptional({ description: 'تعديل مسودات الفواتير', example: true })
  @IsOptional()
  @IsBoolean()
  editDraft?: boolean;

  @ApiPropertyOptional({ description: 'اعتماد الفواتير (أثر مالي)', example: false })
  @IsOptional()
  @IsBoolean()
  approveInvoice?: boolean;

  @ApiPropertyOptional({ description: 'رفض الفواتير المعلقة', example: false })
  @IsOptional()
  @IsBoolean()
  rejectInvoice?: boolean;

  @ApiPropertyOptional({ description: 'تسجيل دفعات على الفواتير', example: true })
  @IsOptional()
  @IsBoolean()
  recordPayment?: boolean;

  @ApiPropertyOptional({ description: 'عرض أرصدة ولقطة العملاء', example: true })
  @IsOptional()
  @IsBoolean()
  viewCustomerBalances?: boolean;
}
