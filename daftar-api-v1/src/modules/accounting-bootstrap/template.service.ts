import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AccountingAccountType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

export const REQUIRED_TEMPLATE_SYSTEM_KEYS = [
  'AR_CONTROL',
  'AP_CONTROL',
  'SALES_REVENUE',
  'DEFAULT_EXPENSE',
  'RETAINED_EARNINGS',
  'OPENING_BALANCE_EQUITY',
  'TAX_PAYABLE',
  'TAX_RECOVERABLE',
  'INVENTORY',
  'COGS',
  'EXCHANGE_GAIN',
  'EXCHANGE_LOSS',
  'ROUNDING',
] as const;

type DbLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async loadActive(code: string, version: number, db: DbLike = this.prisma) {
    const template = await db.accountingTemplate.findFirst({
      where: { code, version, isActive: true },
      include: { accounts: { orderBy: { stableKey: 'asc' } } },
    });
    if (!template)
      throw new NotFoundException('Active accounting template not found');
    this.validateHierarchy(template.accounts);
    TemplateService.assertRequiredSystemKeys(
      new Set(
        template.accounts
          .map((account) => account.systemKey)
          .filter((key): key is string => Boolean(key)),
      ),
    );
    return template;
  }

  static assertRequiredSystemKeys(keys: Set<string>) {
    const missing = REQUIRED_TEMPLATE_SYSTEM_KEYS.filter(
      (key) => !keys.has(key),
    );
    if (missing.length)
      throw new BadRequestException(
        `Accounting template is missing system keys: ${missing.join(', ')}`,
      );
  }

  async instantiate(
    db: Prisma.TransactionClient,
    companyId: string,
    template: Awaited<ReturnType<TemplateService['loadActive']>>,
  ) {
    const accountsByTemplateId = new Map<string, string>();
    const pending = [...template.accounts];
    const created: Array<{
      id: string;
      templateKey: string | null;
      accountType: AccountingAccountType;
    }> = [];
    while (pending.length) {
      const index = pending.findIndex(
        (account) =>
          !account.parentId || accountsByTemplateId.has(account.parentId),
      );
      if (index === -1)
        throw new BadRequestException(
          'Accounting template hierarchy cannot be instantiated',
        );
      const [account] = pending.splice(index, 1);
      const companyAccount = await db.accountingAccount.create({
        data: {
          companyId,
          code: account.code,
          name: account.englishName,
          accountType: account.accountType,
          // Normal ledger accounts accept transaction currencies. A currency
          // constraint is reserved for explicitly currency-specific cash/bank
          // accounts configured after bootstrap.
          currencyCode: null,
          parentId: account.parentId
            ? accountsByTemplateId.get(account.parentId)
            : undefined,
          allowDirectPosting: account.allowDirectPosting,
          isControlAccount: account.isControlAccount,
          reconciliationEligible: account.reconciliationEligible,
          templateCode: template.code,
          templateVersion: template.version,
          templateKey: account.stableKey,
        },
      });
      accountsByTemplateId.set(account.id, companyAccount.id);
      created.push(companyAccount);
    }
    return created;
  }

  private validateHierarchy(
    accounts: Array<{ id: string; parentId: string | null; stableKey: string }>,
  ) {
    const ids = new Set(accounts.map((account) => account.id));
    const keys = new Set<string>();
    for (const account of accounts) {
      if (keys.has(account.stableKey))
        throw new BadRequestException(
          `Duplicate template key ${account.stableKey}`,
        );
      keys.add(account.stableKey);
      if (account.parentId && !ids.has(account.parentId))
        throw new BadRequestException(
          `Template parent is missing for ${account.stableKey}`,
        );
      const seen = new Set<string>();
      let current: string | null = account.id;
      while (current) {
        if (seen.has(current))
          throw new BadRequestException(
            'Accounting template hierarchy contains a cycle',
          );
        seen.add(current);
        current =
          accounts.find((candidate) => candidate.id === current)?.parentId ??
          null;
      }
    }
  }
}
