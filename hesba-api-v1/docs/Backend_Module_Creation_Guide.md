# 📘 دليل إنشاء الموديولات — Backend Module Creation Guide

> **القاعدة الذهبية:** اكتب الكود كأنك Senior Developer — جودة عالية، قابلية صيانة، أداء، وقابلية توسع. نظّم الكود بوضوح، استخدم Design Patterns الحديثة، عالج Edge Cases والأخطاء بشكل صحيح، وأضف تعليقات توضيحية عند الحاجة.

---

## 📑 جدول المحتويات

1. [هيكل المشروع والمعمارية](#1-هيكل-المشروع-والمعمارية)
2. [هيكل كل موديول](#2-هيكل-كل-موديول)
3. [ترتيب إنشاء الملفات](#3-ترتيب-إنشاء-الملفات)
4. [تفاصيل كل طبقة بالكود](#4-تفاصيل-كل-طبقة-بالكود)
5. [القواعد العامة الإلزامية](#5-القواعد-العامة-الإلزامية)
6. [نظام الترجمة i18n](#6-نظام-الترجمة-i18n)
7. [نظام الحماية والصلاحيات](#7-نظام-الحماية-والصلاحيات)
8. [نظام الـ Pagination](#8-نظام-الـ-pagination)
9. [نظام التعامل مع الأخطاء](#9-نظام-التعامل-مع-الأخطاء)
10. [Audit Logging](#10-audit-logging)
11. [Checklist قبل الانتهاء](#11-checklist-قبل-الانتهاء)
12. [مثال عملي كامل](#12-مثال-عملي-كامل)

---

## 1) هيكل المشروع والمعمارية

### 1.1 المعمارية العامة (Layered Architecture)

```
Controller → Service → Use Cases → Repository → Prisma (DB)
     ↑            ↑          ↑            ↑
   Swagger      DTOs     Business     Data Access
  Decorators  Validation    Logic       (Pure SQL)
```

| الطبقة         | المسؤولية                                             | قاعدة                             |
| -------------- | ----------------------------------------------------- | --------------------------------- |
| **Controller** | استقبال HTTP → استخراج البيانات → ارجاع Response موحد | ❌ بدون أي Business Logic         |
| **Service**    | تنسيق بين الـ Use Cases (Orchestration فقط)           | ❌ بدون أي Business Logic         |
| **Use Case**   | Business Logic الحقيقي — كل ملف = عملية واحدة فقط     | ✅ Single Responsibility          |
| **Repository** | التعامل مع قاعدة البيانات (Prisma)                    | ❌ بدون أي Business Logic         |
| **DTO**        | Validation + Swagger Documentation                    | ✅ class-validator + @ApiProperty |
| **Swagger**    | فصل Swagger Decorators في ملف منفصل                   | ✅ نظافة الكود                    |

### 1.2 القاعدة: لا يوجد Query بدون `companyId` في where clause

```typescript
// ✅ صح — دائماً scope بال companyId
this.prisma.customer.findMany({
  where: { companyId, isDeleted: false },
});

// ❌ غلط — بدون tenant isolation
this.prisma.customer.findMany({
  where: { isDeleted: false },
});
```

---

## 2) هيكل كل موديول

```
src/modules/{module-name}/
├── {module-name}.module.ts          # Module wiring (imports, providers, exports)
├── {module-name}.controller.ts      # HTTP endpoints — thin layer
├── {module-name}.service.ts         # Orchestration — delegates to use cases
├── {module-name}.repository.ts      # Pure Prisma data access
├── dto/
│   ├── index.ts                     # Barrel export
│   ├── create-{entity}.dto.ts       # Create validation
│   ├── update-{entity}.dto.ts       # Update validation (PartialType)
│   └── query-{entity}.dto.ts        # Query/filter parameters
├── use-cases/
│   ├── index.ts                     # Barrel export
│   ├── create-{entity}.use-case.ts  # إنشاء
│   ├── update-{entity}.use-case.ts  # تعديل
│   ├── delete-{entity}.use-case.ts  # حذف (soft delete)
│   ├── get-{entity}.use-case.ts     # جلب واحد
│   └── list-{entities}.use-case.ts  # جلب قائمة + pagination
├── swagger/
│   └── {module-name}.swagger.ts     # Swagger decorators separated
└── interfaces/                      # (اختياري) Entity-specific types
    └── {module-name}.interfaces.ts
```

### 2.1 قواعد التسمية

| العنصر         | النمط                   | مثال                          |
| -------------- | ----------------------- | ----------------------------- |
| **Folder**     | kebab-case              | `customers`, `ledger-entries` |
| **File**       | kebab-case + suffix     | `create-customer.use-case.ts` |
| **Class**      | PascalCase + Suffix     | `CreateCustomerUseCase`       |
| **Method**     | camelCase               | `findByCompanyId()`           |
| **DTO**        | PascalCase + Dto        | `CreateCustomerDto`           |
| **Repository** | PascalCase + Repository | `CustomerRepository`          |
| **Service**    | PascalCase + Service    | `CustomerService`             |
| **Controller** | PascalCase + Controller | `CustomerController`          |

---

## 3) ترتيب إنشاء الملفات

عند إنشاء أي موديول جديد، اتّبع هذا الترتيب بالتحديد:

### المرحلة 1: أسس البيانات (Data Foundation)

```
الخطوة 1 → DTOs              (validation + swagger)
الخطوة 2 → Repository         (pure data access)
الخطوة 3 → i18n files         (ar + en translation keys)
```

### المرحلة 2: منطق الأعمال (Business Logic)

```
الخطوة 4 → Use Cases          (business rules — ملف لكل عملية)
الخطوة 5 → Service            (orchestration — delegates to use cases)
```

### المرحلة 3: الواجهة (Interface Layer)

```
الخطوة 6 → Swagger file       (separated decorators)
الخطوة 7 → Controller         (thin HTTP layer)
الخطوة 8 → Module             (wiring everything together)
```

### المرحلة 4: التوصيل (Integration)

```
الخطوة 9 → Register in AppModule (import new module)
الخطوة 10 → Build + Test       (nest build → nest start → test endpoints)
```

---

## 4) تفاصيل كل طبقة بالكود

---

### 4.1 الطبقة الأولى: DTOs (Data Transfer Objects)

> **الغرض:** التحقق من صحة البيانات الواردة + توثيق Swagger

#### ملف `create-{entity}.dto.ts`

```typescript
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO لإنشاء [اسم الكيان]
 * Validates all required fields with proper constraints
 */
export class CreateCustomerDto {
  @ApiProperty({
    description: 'اسم العميل',
    example: 'أحمد محمد',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'اسم العميل مطلوب' })
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'رقم الهاتف',
    example: '+201234567890',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'الرصيد الافتتاحي',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'الرصيد الافتتاحي لا يمكن أن يكون سالباً' })
  openingBalance?: number;
}
```

#### ملف `update-{entity}.dto.ts`

```typescript
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

/**
 * DTO لتعديل [اسم الكيان]
 * PartialType يجعل كل الحقول اختيارية تلقائياً
 * OmitType لاستبعاد الحقول اللي مش عايزين نعدلها (زي openingBalance)
 */
export class UpdateCustomerDto extends PartialType(
  OmitType(CreateCustomerDto, ['openingBalance'] as const),
) {}
```

#### ملف `query-{entity}.dto.ts`

```typescript
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto';

/**
 * DTO لاستعلام وتصفية [اسم الكيان]
 * يرث من PaginationQueryDto (page, limit, sortBy, sortOrder)
 */
export class QueryCustomerDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'البحث بالاسم أو الهاتف',
    example: 'أحمد',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'تصفية حسب الحالة',
    enum: ['active', 'disabled'],
  })
  @IsOptional()
  @IsString()
  status?: string;
}
```

#### ملف `dto/index.ts` (Barrel Export)

```typescript
export { CreateCustomerDto } from './create-customer.dto';
export { UpdateCustomerDto } from './update-customer.dto';
export { QueryCustomerDto } from './query-customer.dto';
```

**قواعد DTOs:**

| القاعدة                                               | التفاصيل                          |
| ----------------------------------------------------- | --------------------------------- |
| كل حقل يحتاج `@ApiProperty` أو `@ApiPropertyOptional` | لكي يظهر في Swagger               |
| رسائل الخطأ بالعربية                                  | `{ message: 'اسم العميل مطلوب' }` |
| `@MaxLength` على كل string                            | منع البيانات الكبيرة              |
| `@IsOptional()` قبل أي حقل اختياري                    | ترتيب الـ decorators مهم          |
| استخدم `PartialType` للـ Update                       | لا تكرر الحقول                    |
| الـ examples واقعية ومناسبة للنظام                    | أسماء عربية، أرقام مصرية، إلخ     |

---

### 4.2 الطبقة الثانية: Repository (Data Access)

> **الغرض:** كل التعامل مع قاعدة البيانات (Prisma) في مكان واحد — بدون أي Business Logic

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * CustomerRepository — Pure Data Access Layer
 *
 * Design decisions:
 * - All queries are company-scoped (multi-tenant isolation)
 * - Soft delete: isDeleted=false is default in all reads
 * - Atomic operations use prisma.$transaction()
 * - Returns raw Prisma objects — no transformation here
 */
@Injectable()
export class CustomerRepository {
  private readonly logger = new Logger(CustomerRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ────────────────────────────────────────────────

  /**
   * إنشاء عميل جديد مع تهيئة الرصيد — عملية atomic
   * يتم إنشاء سجل Balance في نفس الـ transaction
   */
  async createWithBalance(data: {
    companyId: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    openingBalance: number;
    createdById: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 1. إنشاء العميل
      const customer = await tx.customer.create({
        data: {
          companyId: data.companyId,
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          openingBalance: data.openingBalance,
        },
      });

      // 2. تهيئة رصيد العميل الافتتاحي
      await tx.balance.create({
        data: {
          companyId: data.companyId,
          partyType: 'CUSTOMER',
          partyId: customer.id,
          balance: data.openingBalance,
        },
      });

      // 3. تسجيل في Audit Log
      await tx.auditLog.create({
        data: {
          companyId: data.companyId,
          userId: data.createdById,
          action: 'CREATE_CUSTOMER',
          entity: 'Customer',
          entityId: customer.id,
          newData: customer as any,
        },
      });

      return customer;
    });
  }

  // ─── READ ──────────────────────────────────────────────────

  /**
   * جلب عميل واحد بالـ ID (company-scoped)
   */
  async findById(companyId: string, customerId: string) {
    return this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
        isDeleted: false,
      },
    });
  }

  /**
   * جلب قائمة العملاء مع pagination + search + filters
   *
   * Performance note: Uses skip/take for pagination.
   * For very large datasets (100k+), consider cursor-based pagination.
   */
  async findMany(
    companyId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    // Build dynamic where clause
    const where: Prisma.CustomerWhereInput = {
      companyId,
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Execute count + data in parallel for performance
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ─── UPDATE ────────────────────────────────────────────────

  /**
   * تعديل بيانات عميل (company-scoped)
   */
  async update(
    companyId: string,
    customerId: string,
    data: Prisma.CustomerUpdateInput,
  ) {
    return this.prisma.customer.updateMany({
      where: { id: customerId, companyId, isDeleted: false },
      data,
    });
  }

  // ─── SOFT DELETE ───────────────────────────────────────────

  /**
   * حذف ناعم — يمنع الحذف النهائي لأغراض التدقيق
   */
  async softDelete(companyId: string, customerId: string) {
    return this.prisma.customer.updateMany({
      where: { id: customerId, companyId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // ─── HELPERS ───────────────────────────────────────────────

  /**
   * التحقق من وجود عميل بنفس الاسم في الشركة (للمنع من التكرار)
   */
  async existsByName(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.customer.count({
      where: {
        companyId,
        name: { equals: name, mode: 'insensitive' },
        isDeleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }
}
```

**قواعد Repository:**

| القاعدة                                   | التفاصيل                           |
| ----------------------------------------- | ---------------------------------- |
| `companyId` في كل Query                   | Tenant isolation إلزامي            |
| `isDeleted: false` افتراضي في كل read     | Soft delete pattern                |
| `$transaction` لكل عملية composite        | Atomicity ضروري                    |
| `$transaction([...])` لـ parallel queries | count + data سوا للأداء            |
| `updateMany` بدل `update`                 | لأنه يضيف `companyId` في الـ where |
| Logger في كل Repository                   | للتتبع وتصحيح الأخطاء              |
| لا business logic أبداً                   | Repository = data access فقط       |

---

### 4.3 الطبقة الثالثة: Use Cases (Business Logic)

> **الغرض:** منطق الأعمال الحقيقي — كل ملف = عملية واحدة (Single Responsibility Principle)

```typescript
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CustomerRepository } from '../customer.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { CreateCustomerDto } from '../dto';

/**
 * CreateCustomerUseCase — إنشاء عميل جديد
 *
 * Business Rules:
 * 1. اسم العميل يجب أن يكون فريداً داخل الشركة
 * 2. الرصيد الافتتاحي يُهيأ في جدول Balance فوراً (atomic)
 * 3. يتم تسجيل العملية في Audit Log
 *
 * Design: Each use case handles ONE business operation.
 * Dependencies injected via constructor (testable, mockable).
 */
@Injectable()
export class CreateCustomerUseCase {
  private readonly logger = new Logger(CreateCustomerUseCase.name);

  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @param companyId - معرف الشركة (من JWT)
   * @param userId - معرف المستخدم المنشئ (من JWT)
   * @param dto - بيانات العميل المراد إنشاؤه
   * @returns العميل المنشأ
   * @throws ConflictException - إذا كان الاسم مكرراً
   */
  async execute(companyId: string, userId: string, dto: CreateCustomerDto) {
    this.logger.log(`Creating customer "${dto.name}" for company ${companyId}`);

    // ── Rule 1: Unique name check ──────────────────────────
    const exists = await this.customerRepo.existsByName(companyId, dto.name);
    if (exists) {
      throw new ConflictException(
        this.t.translate('customers.create.nameExists'),
      );
    }

    // ── Rule 2: Create customer + init balance (atomic) ────
    const customer = await this.customerRepo.createWithBalance({
      companyId,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      openingBalance: dto.openingBalance ?? 0,
      createdById: userId,
    });

    this.logger.log(`Customer created: ${customer.id}`);
    return customer;
  }
}
```

#### هيكل Use Case نموذجي لـ List (مع Pagination):

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CustomerRepository } from '../customer.repository';
import { QueryCustomerDto } from '../dto';

/**
 * ListCustomersUseCase — جلب قائمة العملاء مع pagination و search
 *
 * Returns paginated data with metadata for frontend consumption.
 */
@Injectable()
export class ListCustomersUseCase {
  private readonly logger = new Logger(ListCustomersUseCase.name);

  constructor(private readonly customerRepo: CustomerRepository) {}

  async execute(companyId: string, query: QueryCustomerDto) {
    const { data, total, page, limit } = await this.customerRepo.findMany(
      companyId,
      {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder as 'asc' | 'desc',
      },
    );

    return {
      items: data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}
```

#### ملف `use-cases/index.ts` (Barrel Export):

```typescript
export { CreateCustomerUseCase } from './create-customer.use-case';
export { UpdateCustomerUseCase } from './update-customer.use-case';
export { DeleteCustomerUseCase } from './delete-customer.use-case';
export { GetCustomerUseCase } from './get-customer.use-case';
export { ListCustomersUseCase } from './list-customers.use-case';
```

**قواعد Use Cases:**

| القاعدة                           | التفاصيل                                      |
| --------------------------------- | --------------------------------------------- |
| ملف واحد = عملية واحدة            | Single Responsibility                         |
| Method اسمه `execute()` دائماً    | توحيد عبر كل الـ Use Cases                    |
| `Logger` خاص بكل Use Case         | `new Logger(ClassName.name)`                  |
| الأخطاء بالـ NestJS Exceptions    | `NotFoundException`, `ConflictException`, إلخ |
| رسائل بالترجمة                    | `this.t.translate('module.key')`              |
| التعليقات توضح Business Rules     | JSDoc يشرح: متى يُرمى Error؟ ماذا يحدث؟       |
| لا تتعامل مع HTTP/Response مباشرة | Use Case لا يعرف شيء عن HTTP                  |

---

### 4.4 الطبقة الرابعة: Service (Orchestration)

> **الغرض:** طبقة تنسيق — تفوّض لكل Use Case بدون أي Logic

```typescript
import { Injectable } from '@nestjs/common';
import {
  CreateCustomerUseCase,
  UpdateCustomerUseCase,
  DeleteCustomerUseCase,
  GetCustomerUseCase,
  ListCustomersUseCase,
} from './use-cases';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto } from './dto';

/**
 * CustomerService — Orchestration Layer
 *
 * Design: This is a thin wrapper that delegates to use cases.
 * No business logic here — it only routes calls.
 *
 * Why not call use cases directly from controller?
 * → Service provides a single facade for other modules to import.
 * → Controller stays thin (doesn't import 5+ use cases).
 * → Other modules can use CustomerService without knowing internal use cases.
 */
@Injectable()
export class CustomerService {
  constructor(
    private readonly createUC: CreateCustomerUseCase,
    private readonly updateUC: UpdateCustomerUseCase,
    private readonly deleteUC: DeleteCustomerUseCase,
    private readonly getUC: GetCustomerUseCase,
    private readonly listUC: ListCustomersUseCase,
  ) {}

  create(companyId: string, userId: string, dto: CreateCustomerDto) {
    return this.createUC.execute(companyId, userId, dto);
  }

  update(
    companyId: string,
    userId: string,
    customerId: string,
    dto: UpdateCustomerDto,
  ) {
    return this.updateUC.execute(companyId, userId, customerId, dto);
  }

  delete(companyId: string, userId: string, customerId: string) {
    return this.deleteUC.execute(companyId, userId, customerId);
  }

  findOne(companyId: string, customerId: string) {
    return this.getUC.execute(companyId, customerId);
  }

  findAll(companyId: string, query: QueryCustomerDto) {
    return this.listUC.execute(companyId, query);
  }
}
```

**قواعد Service:**

| القاعدة                              | التفاصيل                           |
| ------------------------------------ | ---------------------------------- |
| الطبقة هي Pure Delegation            | صفر Business Logic                 |
| كل method → Use Case واحد            | 1:1 mapping                        |
| Export الـ Service فقط من الـ Module | باقي الموديولات تستخدم الـ Service |
| Document لماذا الـ Service موجود     | التعليق يشرح السبب                 |

---

### 4.5 الطبقة الخامسة: Swagger (Separated Decorators)

> **الغرض:** فصل Swagger decorators عن الـ Controller لنظافة الكود

```typescript
import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateCustomerDto, UpdateCustomerDto } from '../dto';

// ── Module Tag ─────────────────────────────────────────────
export const CustomerApiTags = () => ApiTags('👥 Customers — العملاء');

// ── Create ─────────────────────────────────────────────────
export const CreateCustomerSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إنشاء عميل جديد',
      description: `
        إنشاء عميل جديد للشركة مع تهيئة الرصيد الافتتاحي.
        - الاسم يجب أن يكون فريد داخل الشركة.
        - الرصيد الافتتاحي يُسجل تلقائياً في جدول الأرصدة.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiBody({ type: CreateCustomerDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم إنشاء العميل بنجاح',
      schema: {
        example: {
          success: true,
          data: { id: 'uuid', name: 'أحمد محمد', phone: '+201234567890' },
          message: 'تم إنشاء العميل بنجاح',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'اسم العميل موجود بالفعل',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'بيانات غير صالحة',
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'غير مصرح — توكن مفقود أو منتهي',
    }),
  );

// ── List ───────────────────────────────────────────────────
export const ListCustomersSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'قائمة العملاء',
      description: 'جلب قائمة العملاء مع البحث والترتيب والتصفح بالصفحات.',
    }),
    ApiBearerAuth('access-token'),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'قائمة العملاء',
      schema: {
        example: {
          success: true,
          data: {
            items: [{ id: 'uuid', name: 'أحمد محمد' }],
            meta: {
              page: 1,
              limit: 20,
              total: 50,
              totalPages: 3,
              hasNext: true,
              hasPrev: false,
            },
          },
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
  );

// ── Get One ────────────────────────────────────────────────
export const GetCustomerSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تفاصيل عميل',
      description: 'جلب بيانات عميل واحد بالمعرف',
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'معرف العميل (UUID)', type: String }),
    ApiResponse({ status: HttpStatus.OK, description: 'بيانات العميل' }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'العميل غير موجود',
    }),
  );

// ── Update ─────────────────────────────────────────────────
export const UpdateCustomerSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تعديل عميل',
      description: 'تعديل بيانات عميل موجود',
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'معرف العميل (UUID)', type: String }),
    ApiBody({ type: UpdateCustomerDto }),
    ApiResponse({ status: HttpStatus.OK, description: 'تم التعديل بنجاح' }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'العميل غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'اسم العميل مكرر',
    }),
  );

// ── Delete ─────────────────────────────────────────────────
export const DeleteCustomerSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'حذف عميل',
      description: 'حذف ناعم — يمكن استعادته لاحقاً',
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'معرف العميل (UUID)', type: String }),
    ApiResponse({ status: HttpStatus.OK, description: 'تم الحذف بنجاح' }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'العميل غير موجود',
    }),
  );
```

---

### 4.6 الطبقة السادسة: Controller (HTTP Layer)

> **الغرض:** طبقة HTTP رفيعة — استقبال الطلب → استدعاء Service → ارجاع Response موحد

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto } from './dto';
import { ApiResponseDto } from '../../common/dto';
import { TranslationService } from '../../common/services/translation.service';
import {
  CurrentUser,
  CurrentTenant,
  ProtectedWrite,
  ProtectedRead,
  OwnerOnly,
  RequirePermissions, // ← لفحص صلاحيات STAFF
} from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types';
import {
  CustomerApiTags,
  CreateCustomerSwagger,
  ListCustomersSwagger,
  GetCustomerSwagger,
  UpdateCustomerSwagger,
  DeleteCustomerSwagger,
} from './swagger/customer.swagger';
import { UserRole } from '@prisma/client';

/**
 * CustomerController — HTTP endpoints for customer management
 *
 * Architecture: Controller is a THIN layer. No business logic here.
 * Pattern: Extract data from request → call service → wrap in ApiResponseDto
 *
 * Guard Stack (via combined decorators):
 * 1. JwtAuthGuard → validates access token
 * 2. RolesGuard → checks user role matches endpoint requirement
 * 3. TenantSubscriptionGuard → checks subscription status + limits
 */
@Controller('customers')
@CustomerApiTags()
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly t: TranslationService,
  ) {}

  // ── POST /customers ──────────────────────────────────────
  @Post()
  @CreateCustomerSwagger()
  @ProtectedWrite(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('manageParties') // STAFF يحتاج هذا الـ flag — OWNER يتخطّاه تلقائياً
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerDto,
  ) {
    const data = await this.customerService.create(companyId, user.id, dto);
    return new ApiResponseDto(
      data,
      this.t.translate('customers.create.success'),
    );
  }

  // ── GET /customers ───────────────────────────────────────
  @Get()
  @ListCustomersSwagger()
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewParties') // STAFF يحتاج هذا الـ flag — OWNER يتخطّاه تلقائياً
  async findAll(
    @CurrentTenant() companyId: string,
    @Query() query: QueryCustomerDto,
  ) {
    const data = await this.customerService.findAll(companyId, query);
    return new ApiResponseDto(data);
  }

  // ── GET /customers/:id ───────────────────────────────────
  @Get(':id')
  @GetCustomerSwagger()
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewParties') // STAFF يحتاج هذا الـ flag
  async findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.customerService.findOne(companyId, id);
    return new ApiResponseDto(data);
  }

  // ── PATCH /customers/:id ─────────────────────────────────
  @Patch(':id')
  @UpdateCustomerSwagger()
  @HttpCode(HttpStatus.OK)
  @ProtectedWrite(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('manageParties') // STAFF يحتاج هذا الـ flag
  async update(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const data = await this.customerService.update(companyId, user.id, id, dto);
    return new ApiResponseDto(
      data,
      this.t.translate('customers.update.success'),
    );
  }

  // ── DELETE /customers/:id ────────────────────────────────
  @Delete(':id')
  @DeleteCustomerSwagger()
  @HttpCode(HttpStatus.OK)
  @OwnerOnly()
  async remove(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.customerService.delete(companyId, user.id, id);
    return new ApiResponseDto(
      data,
      this.t.translate('customers.delete.success'),
    );
  }
}
```

**قواعد Controller:**

| القاعدة                                         | التفاصيل                                          |
| ----------------------------------------------- | ------------------------------------------------- |
| صفر Business Logic                              | فقط: extract → call → wrap                        |
| `ApiResponseDto` مع كل response                 | `new ApiResponseDto(data, message?)`              |
| `@ParseUUIDPipe` لكل UUID param                 | Validation تلقائي                                 |
| Translated messages                             | `this.t.translate('module.action.key')`           |
| `import type` لأنواع غير runtime                | `import type { AuthenticatedUser }`               |
| Combined decorators                             | `@ProtectedWrite`, `@ProtectedRead`, `@OwnerOnly` |
| `@RequirePermissions` على كل endpoint فيه STAFF | OWNER يتخطّاه تلقائياً — STAFF يحتاج الـ flag     |
| لا تستخدم `@UseGuards` مباشرة                   | استخدم الـ combined decorators الجاهزة            |

---

### 4.7 الطبقة السابعة: Module (Wiring)

> **الغرض:** ربط كل شيء — imports, providers, exports

```typescript
import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerRepository } from './customer.repository';
import {
  CreateCustomerUseCase,
  UpdateCustomerUseCase,
  DeleteCustomerUseCase,
  GetCustomerUseCase,
  ListCustomersUseCase,
} from './use-cases';

/**
 * CustomerModule — Wires all customer-related providers
 *
 * Architecture:
 * - Controller handles HTTP
 * - Service orchestrates use cases
 * - Each UseCase handles one business operation
 * - Repository handles data access
 *
 * Exports CustomerService so other modules can use customer operations
 * (e.g., Ledger module needs to validate party exists)
 */
@Module({
  controllers: [CustomerController],
  providers: [
    // Core
    CustomerService,
    CustomerRepository,

    // Use Cases (one per business operation)
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    DeleteCustomerUseCase,
    GetCustomerUseCase,
    ListCustomersUseCase,
  ],
  exports: [CustomerService],
})
export class CustomerModule {}
```

ثم **سجّل الـ Module في AppModule:**

```typescript
// src/app.module.ts
import { CustomerModule } from './modules/customers/customer.module';

@Module({
  imports: [
    // ... infrastructure modules ...
    AuthModule,
    CustomerModule, // ← أضف هنا
  ],
})
export class AppModule {}
```

---

## 5) القواعد العامة الإلزامية

### 5.1 قواعد TypeScript

```typescript
// ✅ استخدم import type للأنواع التي لا تُستخدم في runtime
import type { AuthenticatedUser } from '../../common/types';
import type { Request } from 'express';

// ✅ استخدم const enum أو Prisma enums
import { UserRole } from '@prisma/client';

// ✅ استخدم readonly للخصائص المحقونة
constructor(private readonly customerService: CustomerService) {}

// ✅ اكتب JSDoc لكل method عام
/**
 * @param companyId - معرف الشركة (من JWT)
 * @returns العميل المطلوب
 * @throws NotFoundException - إذا لم يُعثر على العميل
 */

// ✅ استخدم early returns
if (!customer) {
  throw new NotFoundException(this.t.translate('customers.notFound'));
}
return customer; // لا تضعه في else block
```

### 5.2 قواعد الأمان

```
1. ❌ لا تثق بأي input من الـ Client — كل شيء يتم التحقق منه عبر DTOs
2. ✅ companyId يأتي من JWT فقط — لا تأخذه من Body أو Query
3. ✅ userId يأتي من @CurrentUser() فقط
4. ✅ Soft Delete فقط — لا hard delete أبداً (للتدقيق)
5. ✅ Atomic Operations — كل عملية composite داخل $transaction
6. ✅ Rate Limiting — @Throttle على endpoints حساسة (create, update, delete)
```

### 5.3 قواعد الأداء

```
1. ✅ Parallel queries — count + data في نفس الـ $transaction
2. ✅ Select specific fields — لا تجلب * إلا عند الحاجة
3. ✅ Limit default = 20, max = 100 — حماية من queries كبيرة
4. ✅ Index-aware queries — تأكد من وجود database indexes
5. ✅ Logger.debug لـ development, Logger.log لـ production-worthy
```

### 5.4 قواعد التعليقات

```typescript
// ✅ تعليق يشرح "لماذا" (WHY) وليس "ماذا" (WHAT)

// Good: يشرح سبب القرار
// Performance: Using $transaction for parallel count + data to avoid two DB roundtrips

// Bad: يشرح الكود الواضح
// Create a customer
const customer = await this.customerRepo.create(data);
```

---

## 6) نظام الترجمة i18n

### هيكل الملفات

```
src/i18n/
├── ar/
│   ├── auth.json
│   ├── customers.json     ← ملف لكل موديول
│   ├── suppliers.json
│   └── common.json
└── en/
    ├── auth.json
    ├── customers.json
    ├── suppliers.json
    └── common.json
```

### بنية ملف الترجمة

```json
// src/i18n/ar/customers.json
{
  "create": {
    "success": "تم إنشاء العميل بنجاح",
    "nameExists": "يوجد عميل بهذا الاسم بالفعل",
    "failed": "فشل في إنشاء العميل"
  },
  "update": {
    "success": "تم تعديل بيانات العميل بنجاح",
    "notFound": "العميل غير موجود",
    "nameExists": "يوجد عميل آخر بهذا الاسم"
  },
  "delete": {
    "success": "تم حذف العميل بنجاح",
    "notFound": "العميل غير موجود",
    "hasBalance": "لا يمكن حذف عميل لديه رصيد مستحق"
  },
  "get": {
    "notFound": "العميل غير موجود"
  },
  "list": {
    "empty": "لا يوجد عملاء"
  },
  "validation": {
    "nameRequired": "اسم العميل مطلوب",
    "invalidPhone": "رقم الهاتف غير صالح"
  }
}
```

```json
// src/i18n/en/customers.json
{
  "create": {
    "success": "Customer created successfully",
    "nameExists": "A customer with this name already exists",
    "failed": "Failed to create customer"
  },
  "update": {
    "success": "Customer updated successfully",
    "notFound": "Customer not found",
    "nameExists": "Another customer with this name already exists"
  },
  "delete": {
    "success": "Customer deleted successfully",
    "notFound": "Customer not found",
    "hasBalance": "Cannot delete a customer with outstanding balance"
  },
  "get": {
    "notFound": "Customer not found"
  },
  "list": {
    "empty": "No customers found"
  },
  "validation": {
    "nameRequired": "Customer name is required",
    "invalidPhone": "Invalid phone number"
  }
}
```

### الاستخدام في الكود

```typescript
// في Use Case أو Controller
this.t.translate('customers.create.success'); // رسالة نجاح
this.t.translate('customers.create.nameExists'); // رسالة خطأ

// مع Parameters (interpolation)
this.t.translate('customers.limit.exceeded', { max: 50 });
// في json: "exceeded": "تجاوزت الحد الأقصى ({max} عميل)"
```

---

## 7) نظام الحماية والصلاحيات

### Combined Decorators المتاحة

| Decorator                                         | الاستخدام                                                 | Guards                                |
| ------------------------------------------------- | --------------------------------------------------------- | ------------------------------------- |
| `@ProtectedWrite(UserRole.OWNER, UserRole.STAFF)` | Endpoints اللي بتعدل بيانات (POST, PATCH, DELETE)         | JWT + Roles + Subscription            |
| `@ProtectedRead(UserRole.OWNER, UserRole.STAFF)`  | Endpoints اللي بتقرأ بس (GET) — الشركات المعلقة تقدر تقرأ | JWT + Roles + Subscription (ReadOnly) |
| `@OwnerOnly()`                                    | حصري للـ Owner والـ Super Admin                           | JWT + Roles + Subscription            |
| `@StaffWrite()`                                   | Owner + Staff + Super Admin                               | JWT + Roles + Subscription            |
| `@NoSubscriptionCheck(UserRole.OWNER)`            | يتخطى فحص الاشتراك — للدفع والتجديد فقط                   | JWT + Roles                           |

### مثال الاستخدام

```typescript
@Controller('customers')
export class CustomerController {
  // ── WRITE endpoints — تحتاج اشتراك فعال ──
  @Post()
  @ProtectedWrite(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  async create() {
    /* ... */
  }

  @Patch(':id')
  @ProtectedWrite(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  async update() {
    /* ... */
  }

  // ── READ endpoints — الشركات المعلقة تقدر تقرأ ──
  @Get()
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  async findAll() {
    /* ... */
  }

  // ── OWNER-ONLY — حذف حصري للمالك ──
  @Delete(':id')
  @OwnerOnly()
  async remove() {
    /* ... */
  }
}
```

### Permissions Guard (StaffPermission Flags)

> **المبدأ:** `@RequirePermissions` تفحص فقط المستخدمين من نوع STAFF.
> الـ OWNER و SUPER_ADMIN يتخطّوا هذا الفحص تلقائياً (PermissionsGuard يعفيهم).

#### جدول الصلاحيات المتاحة (StaffPermissionsMap)

| Flag            | الوصف                               | يُستخدم في            |
| --------------- | ----------------------------------- | --------------------- |
| `manageUsers`   | إدارة الموظفين / Staff              | Users module          |
| `viewParties`   | عرض العملاء والموردين               | Customers, Suppliers  |
| `manageParties` | إضافة وتعديل وحذف العملاء والموردين | Customers, Suppliers  |
| `viewLedger`    | عرض حركات الدفتر                    | Ledger, LedgerEntries |
| `manageLedger`  | إضافة وحذف حركات الدفتر             | Ledger Engine         |
| `viewReports`   | عرض التقارير                        | Reports module        |

> ⚠️ **إضافة permission جديدة = صفر migrations** — فقط أضف الـ flag في `StaffPermissionsMap` و `StaffPermissionsDto`.

#### قواعد الاستخدام

```
✅ READ endpoint  → @RequirePermissions('viewThing')
✅ WRITE endpoint → @RequirePermissions('manageThing')
✅ OWNER-only     → @OwnerOnly() — لا تحتاج @RequirePermissions
❌ لا تضع @RequirePermissions بدون @ProtectedWrite/@ProtectedRead
```

#### مثال كامل على Controller مع Permissions

```typescript
import { RequirePermissions } from '../../common/decorators';

@Controller('customers')
export class CustomerController {
  // ── POST — STAFF يحتاج 'manageParties' ─────────────────
  @Post()
  @ProtectedWrite(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('manageParties')
  async create() {
    /* ... */
  }

  // ── GET — STAFF يحتاج 'viewParties' ────────────────────
  @Get()
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewParties')
  async findAll() {
    /* ... */
  }

  // ── GET/:id — STAFF يحتاج 'viewParties' ────────────────
  @Get(':id')
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewParties')
  async findOne() {
    /* ... */
  }

  // ── PATCH — STAFF يحتاج 'manageParties' ────────────────
  @Patch(':id')
  @ProtectedWrite(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('manageParties')
  async update() {
    /* ... */
  }

  // ── DELETE — Owner فقط، لا يحتاج @RequirePermissions ──
  @Delete(':id')
  @OwnerOnly()
  async remove() {
    /* ... */
  }
}
```

#### كيف يعمل PermissionsGuard داخلياً

```
طلب وارد
    ↓
JwtAuthGuard → يتحقق من التوكن ويضع user في request
    ↓
RolesGuard → يتحقق أن role المستخدم في القائمة المسموحة
    ↓
TenantSubscriptionGuard → يتحقق من الاشتراك
    ↓
PermissionsGuard → إذا كان @RequirePermissions موجود:
    ├─ OWNER أو SUPER_ADMIN → ✅ يمر تلقائياً (bypass)
    └─ STAFF → يفحص user.permissions[flag] === true
               ├─ true  → ✅ يمر
               └─ false/undefined → ❌ ForbiddenException
```

---

## 8) نظام الـ Pagination

### PaginationQueryDto (جاهز في Common)

```typescript
// src/common/dto/pagination-query.dto.ts — جاهز للاستخدام
export class PaginationQueryDto {
  page?: number; // default: 1, min: 1
  limit?: number; // default: 20, min: 1, max: 100
  sortBy?: string; // default: 'createdAt'
  sortOrder?: string; // 'asc' | 'desc', default: 'desc'
  includeDeleted?: boolean; // default: false
}
```

### هيكل Response الموحد للقوائم

```typescript
// كل list endpoint يرجع بهذا الشكل:
{
  "success": true,
  "data": {
    "items": [ /* ... array of entities ... */ ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

---

## 9) نظام التعامل مع الأخطاء

### NestJS Exceptions المستخدمة

| Exception                      | HTTP Code | متى تُستخدم         |
| ------------------------------ | --------- | ------------------- |
| `BadRequestException`          | 400       | بيانات غير صالحة    |
| `UnauthorizedException`        | 401       | توكن مفقود أو منتهي |
| `ForbiddenException`           | 403       | لا يملك الصلاحية    |
| `NotFoundException`            | 404       | الكيان غير موجود    |
| `ConflictException`            | 409       | تكرار (اسم موجود)   |
| `TooManyRequestsException`     | 429       | تجاوز Rate Limit    |
| `InternalServerErrorException` | 500       | خطأ غير متوقع       |

### نمط الاستخدام

```typescript
// في Use Case:
if (!customer) {
  throw new NotFoundException(this.t.translate('customers.get.notFound'));
}

if (nameExists) {
  throw new ConflictException(this.t.translate('customers.create.nameExists'));
}
```

### شكل Response الخطأ (يتم تلقائياً من Global Exception Filter)

```json
{
  "success": false,
  "error": "العميل غير موجود",
  "statusCode": 404,
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/v1/customers/uuid-here"
}
```

---

## 10) Audit Logging

### متى نسجل في Audit Log

```
✅ إنشاء كيان (CREATE)
✅ تعديل كيان (UPDATE) — مع oldData + newData
✅ حذف كيان (DELETE)
✅ عمليات حساسة (تغيير صلاحيات، تغيير كلمة مرور)
❌ عمليات القراءة (GET/LIST) — لا تحتاج تسجيل
```

### نمط التسجيل (داخل الـ Transaction)

```typescript
// في Repository — داخل $transaction:
await tx.auditLog.create({
  data: {
    companyId,
    userId: performedById,
    action: 'CREATE_CUSTOMER', // VERB_ENTITY pattern
    entity: 'Customer',
    entityId: customer.id,
    oldData: null, // null for create
    newData: customer as any, // الحالة الجديدة
  },
});
```

### تسمية الـ Actions

```
CREATE_CUSTOMER, UPDATE_CUSTOMER, DELETE_CUSTOMER
CREATE_SUPPLIER, UPDATE_SUPPLIER, DELETE_SUPPLIER
CREATE_EMPLOYEE, UPDATE_EMPLOYEE, DELETE_EMPLOYEE
CREATE_LEDGER_ENTRY, DELETE_LEDGER_ENTRY
CREATE_STAFF, UPDATE_STAFF_PERMISSIONS, DISABLE_STAFF
CHANGE_PASSWORD, LOGIN, REGISTER
```

---

## 11) Checklist قبل الانتهاء

### ✅ Checklist لكل موديول جديد

```
□ DTOs
  □ Create DTO مع كل validations + @ApiProperty
  □ Update DTO (PartialType)
  □ Query DTO (extends PaginationQueryDto)
  □ index.ts barrel export
  □ رسائل الخطأ بالعربية في validators

□ Repository
  □ كل query فيه companyId
  □ isDeleted: false في كل read
  □ $transaction للعمليات المركبة
  □ Audit Log في كل write operation
  □ Logger موجود

□ Use Cases
  □ ملف لكل عملية (SRP)
  □ Method اسمه execute()
  □ Logger خاص بكل use case
  □ Business rules مشروحة في التعليقات
  □ Error handling مع ترجمة
  □ Edge cases معالجة

□ Service
  □ Pure delegation — لا logic
  □ 1:1 mapping مع Use Cases

□ Swagger
  □ ملف منفصل
  □ ApiTags مع emoji + عربي
  □ كل endpoint موثق
  □ Response examples واقعية

□ Controller
  □ Thin layer — لا logic
  □ Combined decorators (@ProtectedWrite, @ProtectedRead)
  □ @RequirePermissions على endpoints اللي فيها STAFF (view → 'viewThing', write → 'manageThing')
  □ @OwnerOnly() للعمليات الحساسة — لا تحتاج @RequirePermissions
  □ ApiResponseDto مع كل response
  □ ParseUUIDPipe لكل UUID param
  □ Translated messages

□ Module
  □ كل providers مسجلة
  □ Exports الـ Service فقط
  □ مسجل في AppModule

□ i18n
  □ ملف عربي (ar/{module}.json)
  □ ملف إنجليزي (en/{module}.json)
  □ كل الرسائل موجودة

□ Testing
  □ Build passes (nest build)
  □ Server starts (nest start)
  □ Routes mapped في الـ console
  □ Swagger docs تعرض الـ endpoints
  □ Test POST/GET/PATCH/DELETE

□ Plan
  □ تحديث Implementation_Plan.md
```

---

## 12) مثال عملي كامل

### إنشاء موديول Customers — الترتيب الفعلي

```
الخطوة 1:  أنشئ src/modules/customers/dto/create-customer.dto.ts
الخطوة 2:  أنشئ src/modules/customers/dto/update-customer.dto.ts
الخطوة 3:  أنشئ src/modules/customers/dto/query-customer.dto.ts
الخطوة 4:  أنشئ src/modules/customers/dto/index.ts
الخطوة 5:  أنشئ src/modules/customers/customer.repository.ts
الخطوة 6:  أنشئ src/i18n/ar/customers.json
الخطوة 7:  أنشئ src/i18n/en/customers.json
الخطوة 8:  أنشئ src/modules/customers/use-cases/create-customer.use-case.ts
الخطوة 9:  أنشئ src/modules/customers/use-cases/update-customer.use-case.ts
الخطوة 10: أنشئ src/modules/customers/use-cases/delete-customer.use-case.ts
الخطوة 11: أنشئ src/modules/customers/use-cases/get-customer.use-case.ts
الخطوة 12: أنشئ src/modules/customers/use-cases/list-customers.use-case.ts
الخطوة 13: أنشئ src/modules/customers/use-cases/index.ts
الخطوة 14: أنشئ src/modules/customers/customer.service.ts
الخطوة 15: أنشئ src/modules/customers/swagger/customer.swagger.ts
الخطوة 16: أنشئ src/modules/customers/customer.controller.ts
الخطوة 17: أنشئ src/modules/customers/customer.module.ts
الخطوة 18: سجّل CustomerModule في AppModule
الخطوة 19: npx nest build — تأكد من صفر أخطاء
الخطوة 20: npx nest start — تأكد الـ routes ظهرت
الخطوة 21: اختبر الـ endpoints من Swagger أو Postman
الخطوة 22: حدّث Implementation_Plan.md
```

---

## 📌 ملخص سريع

```
🏗️ المعمارية:     Controller → Service → Use Cases → Repository → Prisma
🔒 الحماية:       @ProtectedWrite / @ProtectedRead / @OwnerOnly (combined decorators)
� الـ Permissions: @RequirePermissions('flag') — STAFF فقط، OWNER يتخطّاه تلقائياً
                   READ → 'viewThing' | WRITE → 'manageThing' | OWNER-only → @OwnerOnly() بدون @RequirePermissions
�📦 الـ Response:  دائماً ApiResponseDto(data, message?)
🌍 الترجمة:      this.t.translate('module.action.key')
📝 الـ Audit:     AuditLog في كل write operation داخل $transaction
📄 الـ Swagger:   ملف منفصل + applyDecorators()
🗑️ الحذف:        Soft Delete فقط (isDeleted + deletedAt)
🏢 الـ Tenant:    companyId في كل query — لا استثناء
📊 الـ Pagination: items[] + meta{} — شكل موحد
```

---

> **تذكير:** هذا الدليل هو المرجع الأساسي. كل موديول جديد لازم يتبع نفس الهيكل والأنماط. لو فيه حالة استثنائية تحتاج خروج عن النمط، وثّقها في تعليق يشرح السبب.
