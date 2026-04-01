// ============================================
// Reports Swagger Decorators
// ============================================
// Separated from controller to keep HTTP layer clean.
// Each export = one endpoint decorator.
// ============================================

import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PartyType } from '@prisma/client';

// ── Module Tag ─────────────────────────────────────────────────────────────
export const ReportsApiTags = () => ApiTags('📊 Reports — التقارير');

// ── GET /reports/summary ─────────────────────────────────────────────────
export const SummarySwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'ملخص مالي شامل',
      description: `
        جلب ملخص مالي شامل للشركة يتضمن:

        - **totalReceivables**: مجموع كل الأرصدة الدائنة (Balance > 0)
        - **deferredSales**: إحصاءات البيوعات الآجلة النشطة (معلق/جزئي/متأخر)
        - **installments**: إحصاءات عقود التقسيط وأقساطها المتأخرة

        **Staff يحتاج صلاحية \`viewReports\`**

        **الفلاتر:**
        - \`partyType\`: تصفية على نوع الطرف (CUSTOMER / SUPPLIER / EMPLOYEE)
        - \`dateFrom\` / \`dateTo\`: تصفية على تاريخ الإنشاء
      `,
    }),
    ApiBearerAuth(),
    ApiQuery({
      name: 'partyType',
      required: false,
      enum: PartyType,
      description: 'نوع الطرف (اختياري)',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      description: 'تاريخ البداية YYYY-MM-DD',
      example: '2024-01-01',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      description: 'تاريخ النهاية YYYY-MM-DD',
      example: '2024-12-31',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'الملخص المالي',
      schema: {
        example: {
          success: true,
          data: {
            totalReceivables: '25000.00',
            deferredSales: {
              total: 5,
              totalAmount: '15000.00',
              paidAmount: '6000.00',
              remainingAmount: '9000.00',
              overdueCount: 2,
              overdueAmount: '3000.00',
            },
            installments: {
              activeContracts: 8,
              totalAmount: '40000.00',
              paidAmount: '18000.00',
              remainingAmount: '22000.00',
              overdueSchedules: 3,
              overdueAmount: '4500.00',
            },
          },
          message: 'تم جلب ملخص الحسابات بنجاح',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'توكن مفقود أو منتهي',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية viewReports',
    }),
  );

// ── GET /reports/overdue ──────────────────────────────────────────────────
export const OverdueSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تقرير المتأخرين',
      description: `
        جلب قائمة البيوعات الآجلة المتأخرة + الأقساط المتأخرة.

        **مرتبة حسب:** أيام التأخر تنازلياً (الأكثر تأخراً أولاً)

        **الفلاتر:**
        - \`partyType\`: تصفية على نوع الطرف
        - \`partyId\`: تصفية على طرف بعينه
        - \`minDaysOverdue\`: الحد الأدنى لأيام التأخر (افتراضي: 1)

        **Staff يحتاج صلاحية \`viewReports\`**
      `,
    }),
    ApiBearerAuth(),
    ApiQuery({
      name: 'partyType',
      required: false,
      enum: PartyType,
      description: 'نوع الطرف',
    }),
    ApiQuery({
      name: 'partyId',
      required: false,
      description: 'معرف الطرف (UUID)',
    }),
    ApiQuery({
      name: 'minDaysOverdue',
      required: false,
      description: 'الحد الأدنى لأيام التأخر',
      example: 1,
    }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تقرير المتأخرين',
      schema: {
        example: {
          success: true,
          data: {
            deferredSales: [
              {
                id: 'uuid',
                referenceNumber: 'DEF-2024-0001',
                partyName: 'محمد أحمد',
                partyPhone: '01234567890',
                totalAmount: '5000.00',
                paidAmount: '2000.00',
                remainingAmount: '3000.00',
                dueDate: '2024-01-15T00:00:00.000Z',
                daysOverdue: 45,
              },
            ],
            installmentSchedules: [
              {
                scheduleId: 'uuid',
                contractNumber: 'CNT-2024-0001',
                installmentNumber: 3,
                partyName: 'علي محمود',
                amount: '1000.00',
                paidAmount: '0.00',
                remainingAmount: '1000.00',
                dueDate: '2024-02-01T00:00:00.000Z',
                daysOverdue: 28,
              },
            ],
            meta: {
              page: 1,
              limit: 10,
              total: 5,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
          message: 'تم جلب تقرير المتأخرين بنجاح',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'توكن مفقود أو منتهي',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية viewReports',
    }),
  );

// ── GET /reports/collection-schedule ─────────────────────────────────────
export const CollectionScheduleSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'جدول التحصيل',
      description: `
        جلب المدفوعات المتوقعة في نطاق تاريخي محدد.

        **يشمل:**
        - البيوعات الآجلة (PENDING / PARTIAL) بدواتها في النطاق
        - الأقساط المجدولة (PENDING / PARTIAL) بدواتها في النطاق

        **مرتبة حسب:** تاريخ الاستحقاق تصاعدياً (الأقرب أولاً)

        **مطلوب:**
        - \`dateFrom\`: تاريخ بداية النطاق (YYYY-MM-DD)
        - \`dateTo\`: تاريخ نهاية النطاق (YYYY-MM-DD)

        **Staff يحتاج صلاحية \`viewReports\`**
      `,
    }),
    ApiBearerAuth(),
    ApiQuery({
      name: 'dateFrom',
      required: true,
      description: 'تاريخ بداية نطاق الاستحقاق (YYYY-MM-DD)',
      example: '2024-03-01',
    }),
    ApiQuery({
      name: 'dateTo',
      required: true,
      description: 'تاريخ نهاية نطاق الاستحقاق (YYYY-MM-DD)',
      example: '2024-03-31',
    }),
    ApiQuery({
      name: 'partyType',
      required: false,
      enum: PartyType,
      description: 'نوع الطرف',
    }),
    ApiQuery({
      name: 'partyId',
      required: false,
      description: 'معرف الطرف (UUID)',
    }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'جدول التحصيل',
      schema: {
        example: {
          success: true,
          data: {
            items: [
              {
                type: 'DEFERRED',
                referenceNumber: 'DEF-2024-0001',
                dueDate: '2024-03-15T00:00:00.000Z',
                partyName: 'محمد أحمد',
                partyPhone: '01234567890',
                expectedAmount: '1000.00',
                daysUntilDue: 5,
              },
              {
                type: 'INSTALLMENT',
                referenceNumber: 'CNT-2024-0001',
                dueDate: '2024-03-20T00:00:00.000Z',
                partyName: 'سارة علي',
                partyPhone: null,
                expectedAmount: '500.00',
                daysUntilDue: 10,
              },
            ],
            meta: {
              page: 1,
              limit: 10,
              total: 12,
              totalPages: 2,
              hasNext: true,
              hasPrev: false,
            },
          },
          message: 'تم جلب جدول التحصيل بنجاح',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'تاريخ البداية بعد تاريخ النهاية، أو الحقول المطلوبة مفقودة',
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'توكن مفقود أو منتهي',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية viewReports',
    }),
  );

export const ProfitLossSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Profit and loss report',
      description:
        'Returns revenue, expenses, net profit and optional previous-period comparison for a selected date range.',
    }),
    ApiBearerAuth(),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      description: 'Start date (YYYY-MM-DD). Defaults to first day of current month.',
      example: '2026-03-01',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      description: 'End date (YYYY-MM-DD). Defaults to today.',
      example: '2026-03-31',
    }),
    ApiQuery({
      name: 'comparePrevious',
      required: false,
      description: 'Include previous period comparison.',
      example: true,
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Profit and loss report',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid date range',
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Missing or expired token',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Missing viewReports permission',
    }),
  );

export const CashFlowSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Cash flow report',
      description:
        'Daily cash inflow/outflow with opening and closing balance for selected period.',
    }),
    ApiBearerAuth(),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      description: 'Start date (YYYY-MM-DD). Defaults to first day of current month.',
      example: '2026-03-01',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      description: 'End date (YYYY-MM-DD). Defaults to today.',
      example: '2026-03-31',
    }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiQuery({
      name: 'sortOrder',
      required: false,
      example: 'desc',
      enum: ['asc', 'desc'],
    }),
    ApiResponse({ status: HttpStatus.OK, description: 'Cash flow report' }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid date range',
    }),
  );

export const CustomersAgingSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Customers aging report',
      description:
        'Receivables aging buckets by customer (0-30 / 31-60 / 61-90 / 90+).',
    }),
    ApiBearerAuth(),
    ApiQuery({
      name: 'asOfDate',
      required: false,
      description: 'Reference date (YYYY-MM-DD). Defaults to today.',
      example: '2026-03-04',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      description: 'Search by customer name or phone.',
      example: 'ahmed',
    }),
    ApiQuery({
      name: 'isActive',
      required: false,
      description: 'Filter active/inactive customers.',
      example: true,
    }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      example: 'totalOutstanding',
      enum: ['totalOutstanding', 'name', 'oldestDueDate', 'lastTransactionDate'],
    }),
    ApiQuery({
      name: 'sortOrder',
      required: false,
      example: 'desc',
      enum: ['asc', 'desc'],
    }),
    ApiResponse({ status: HttpStatus.OK, description: 'Customers aging report' }),
  );

export const SuppliersAgingSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Suppliers aging report',
      description:
        'Aging buckets by supplier (0-30 / 31-60 / 61-90 / 90+).',
    }),
    ApiBearerAuth(),
    ApiQuery({
      name: 'asOfDate',
      required: false,
      description: 'Reference date (YYYY-MM-DD). Defaults to today.',
      example: '2026-03-04',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      description: 'Search by supplier name or phone.',
      example: 'global',
    }),
    ApiQuery({
      name: 'isActive',
      required: false,
      description: 'Filter active/inactive suppliers.',
      example: true,
    }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      example: 'totalOutstanding',
      enum: ['totalOutstanding', 'name', 'oldestDueDate', 'lastTransactionDate'],
    }),
    ApiQuery({
      name: 'sortOrder',
      required: false,
      example: 'desc',
      enum: ['asc', 'desc'],
    }),
    ApiResponse({ status: HttpStatus.OK, description: 'Suppliers aging report' }),
  );

export const SalesDetailedSwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'Detailed sales report' }),
    ApiBearerAuth(),
    ApiQuery({ name: 'dateFrom', required: false, example: '2026-03-01' }),
    ApiQuery({ name: 'dateTo', required: false, example: '2026-03-31' }),
    ApiQuery({ name: 'partyType', required: false, enum: PartyType }),
    ApiQuery({ name: 'partyId', required: false }),
    ApiQuery({ name: 'createdById', required: false }),
    ApiQuery({ name: 'saleType', required: false, enum: ['CASH', 'DEFERRED', 'INSTALLMENT'] }),
    ApiQuery({ name: 'search', required: false }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiQuery({ name: 'sortBy', required: false, example: 'issueDate' }),
    ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    ApiResponse({ status: HttpStatus.OK, description: 'Detailed sales report' }),
  );

export const ExpensesAnalyticsSwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'Expenses analytics report' }),
    ApiBearerAuth(),
    ApiQuery({ name: 'dateFrom', required: false, example: '2026-03-01' }),
    ApiQuery({ name: 'dateTo', required: false, example: '2026-03-31' }),
    ApiQuery({ name: 'category', required: false }),
    ApiQuery({ name: 'supplierId', required: false }),
    ApiQuery({ name: 'search', required: false }),
    ApiQuery({ name: 'comparePrevious', required: false, example: true }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiResponse({ status: HttpStatus.OK, description: 'Expenses analytics report' }),
  );

export const ProductsPerformanceSwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'Products performance report' }),
    ApiBearerAuth(),
    ApiQuery({ name: 'dateFrom', required: false, example: '2026-03-01' }),
    ApiQuery({ name: 'dateTo', required: false, example: '2026-03-31' }),
    ApiQuery({ name: 'search', required: false }),
    ApiQuery({ name: 'isActive', required: false }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiQuery({ name: 'sortBy', required: false, example: 'salesAmount' }),
    ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    ApiResponse({ status: HttpStatus.OK, description: 'Products performance report' }),
  );

export const OperationalPerformanceSwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'Operational performance report' }),
    ApiBearerAuth(),
    ApiQuery({ name: 'dateFrom', required: false, example: '2026-03-01' }),
    ApiQuery({ name: 'dateTo', required: false, example: '2026-03-31' }),
    ApiQuery({ name: 'comparePrevious', required: false, example: true }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Operational KPIs report',
    }),
  );

export const CriticalAlertsSwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'Critical alerts report' }),
    ApiBearerAuth(),
    ApiQuery({ name: 'asOfDate', required: false, example: '2026-03-04' }),
    ApiQuery({
      name: 'creditUsageThresholdPercent',
      required: false,
      example: 80,
    }),
    ApiQuery({ name: 'largeOverdueAmount', required: false, example: 5000 }),
    ApiQuery({ name: 'upcomingInstallmentsDays', required: false, example: 7 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiResponse({ status: HttpStatus.OK, description: 'Critical alerts report' }),
  );

export const LedgerStatementSwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'Ledger statement report' }),
    ApiBearerAuth(),
    ApiQuery({ name: 'partyType', required: true, enum: PartyType }),
    ApiQuery({ name: 'partyId', required: true }),
    ApiQuery({ name: 'dateFrom', required: false, example: '2026-03-01' }),
    ApiQuery({ name: 'dateTo', required: false, example: '2026-03-31' }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiResponse({ status: HttpStatus.OK, description: 'Ledger statement report' }),
  );

export const CollectionsFollowupSwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'Collections follow-up report' }),
    ApiBearerAuth(),
    ApiQuery({ name: 'dateFrom', required: false, example: '2026-03-01' }),
    ApiQuery({ name: 'dateTo', required: false, example: '2026-03-31' }),
    ApiQuery({ name: 'partyType', required: false, enum: PartyType }),
    ApiQuery({ name: 'partyId', required: false }),
    ApiQuery({ name: 'search', required: false }),
    ApiQuery({
      name: 'flow',
      required: false,
      enum: ['DEFERRED', 'INSTALLMENT'],
      description: 'Filter by collection source type.',
    }),
    ApiQuery({
      name: 'metric',
      required: false,
      enum: ['PAID', 'REMAINING', 'OVERDUE'],
      description: 'Optional drill-down metric from overview charts.',
    }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiResponse({ status: HttpStatus.OK, description: 'Collections follow-up report' }),
  );

export const DebtsSummarySwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'Debts summary report' }),
    ApiBearerAuth(),
    ApiQuery({ name: 'entityType', required: false, enum: ['CUSTOMER', 'SUPPLIER'] }),
    ApiQuery({ name: 'balanceType', required: false, enum: ['RECEIVABLE', 'PAYABLE'] }),
    ApiQuery({ name: 'search', required: false }),
    ApiQuery({ name: 'isActive', required: false }),
    ApiQuery({ name: 'minAmount', required: false, example: 1000 }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiQuery({ name: 'sortBy', required: false, example: 'amount' }),
    ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    ApiResponse({ status: HttpStatus.OK, description: 'Debts summary report' }),
  );

export const StaffActivitySwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'Staff activity report' }),
    ApiBearerAuth(),
    ApiQuery({ name: 'dateFrom', required: false, example: '2026-03-01' }),
    ApiQuery({ name: 'dateTo', required: false, example: '2026-03-31' }),
    ApiQuery({ name: 'userId', required: false }),
    ApiQuery({ name: 'search', required: false }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiQuery({ name: 'sortBy', required: false, example: 'activitiesCount' }),
    ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    ApiResponse({ status: HttpStatus.OK, description: 'Staff activity report' }),
  );

export const SimpleLedgerSwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'Simple ledger report' }),
    ApiBearerAuth(),
    ApiQuery({ name: 'partyType', required: true, enum: PartyType }),
    ApiQuery({ name: 'partyId', required: true }),
    ApiQuery({ name: 'dateFrom', required: false, example: '2026-03-01' }),
    ApiQuery({ name: 'dateTo', required: false, example: '2026-03-31' }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiResponse({ status: HttpStatus.OK, description: 'Simple ledger report' }),
  );
