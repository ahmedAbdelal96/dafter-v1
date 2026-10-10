import { BadRequestException } from '@nestjs/common';
import {
  AccountingAccountType,
  AccountingConfigAccountKey,
  AccountingConfigJournalKey,
  AccountingJournalType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

export type AccountingDb = PrismaService | Prisma.TransactionClient;

const ACCOUNT_MAPPING_COMPATIBILITY: Record<
  AccountingConfigAccountKey,
  readonly AccountingAccountType[]
> = {
  [AccountingConfigAccountKey.RECEIVABLE]: [
    AccountingAccountType.ASSET_RECEIVABLE,
  ],
  [AccountingConfigAccountKey.PAYABLE]: [
    AccountingAccountType.LIABILITY_PAYABLE,
  ],
  [AccountingConfigAccountKey.INCOME]: [
    AccountingAccountType.INCOME_OPERATING_REVENUE,
    AccountingAccountType.INCOME_OTHER,
  ],
  [AccountingConfigAccountKey.EXPENSE]: [
    AccountingAccountType.EXPENSE_OPERATING,
    AccountingAccountType.EXPENSE_OTHER,
  ],
  [AccountingConfigAccountKey.RETAINED_EARNINGS]: [
    AccountingAccountType.EQUITY,
  ],
  [AccountingConfigAccountKey.EXCHANGE_GAIN]: [
    AccountingAccountType.INCOME_OTHER,
  ],
  [AccountingConfigAccountKey.EXCHANGE_LOSS]: [
    AccountingAccountType.EXPENSE_OTHER,
  ],
  [AccountingConfigAccountKey.ROUNDING]: [
    AccountingAccountType.INCOME_OTHER,
    AccountingAccountType.EXPENSE_OTHER,
  ],
  [AccountingConfigAccountKey.TAX_PAYABLE]: [
    AccountingAccountType.LIABILITY_TAX,
  ],
  [AccountingConfigAccountKey.TAX_RECOVERABLE]: [
    AccountingAccountType.ASSET_CURRENT,
  ],
  [AccountingConfigAccountKey.INVENTORY]: [
    AccountingAccountType.ASSET_INVENTORY,
  ],
  [AccountingConfigAccountKey.COGS]: [AccountingAccountType.EXPENSE_COGS],
};

const JOURNAL_MAPPING_COMPATIBILITY: Record<
  AccountingConfigJournalKey,
  readonly AccountingJournalType[]
> = {
  [AccountingConfigJournalKey.GENERAL]: [AccountingJournalType.GENERAL],
  [AccountingConfigJournalKey.SALES]: [AccountingJournalType.SALES],
  [AccountingConfigJournalKey.PURCHASE]: [AccountingJournalType.PURCHASE],
  [AccountingConfigJournalKey.CASH]: [AccountingJournalType.CASH],
  [AccountingConfigJournalKey.BANK]: [AccountingJournalType.BANK],
  [AccountingConfigJournalKey.EXCHANGE_DIFFERENCE]: [
    AccountingJournalType.GENERAL,
    AccountingJournalType.BANK,
  ],
};

export function assertAccountMappingCompatibility(
  key: AccountingConfigAccountKey,
  type: AccountingAccountType,
): void {
  if (!ACCOUNT_MAPPING_COMPATIBILITY[key]?.includes(type)) {
    throw new BadRequestException(
      `Account type ${type} is not compatible with ${key}`,
    );
  }
}

export function assertJournalMappingCompatibility(
  key: AccountingConfigJournalKey,
  type: AccountingJournalType,
): void {
  if (!JOURNAL_MAPPING_COMPATIBILITY[key]?.includes(type)) {
    throw new BadRequestException(
      `Journal type ${type} is not compatible with ${key}`,
    );
  }
}

export async function validateAccountingCounterparty(
  db: AccountingDb,
  input: {
    companyId: string;
    accountType: AccountingAccountType;
    businessPartnerId?: string | null;
    isControlAccount?: boolean;
    reconciliationEligible?: boolean;
  },
) {
  const requiresCustomer =
    input.accountType === AccountingAccountType.ASSET_RECEIVABLE;
  const requiresSupplier =
    input.accountType === AccountingAccountType.LIABILITY_PAYABLE;

  if (!input.businessPartnerId && !requiresCustomer && !requiresSupplier)
    return null;
  if (!input.businessPartnerId) {
    throw new BadRequestException(
      requiresCustomer
        ? 'Receivable journal lines require a business partner with an active customer role'
        : 'Payable journal lines require a business partner with an active supplier role',
    );
  }
  if (
    (requiresCustomer || requiresSupplier) &&
    (!input.isControlAccount || !input.reconciliationEligible)
  ) {
    throw new BadRequestException(
      'Receivable and payable journal lines require a control account eligible for reconciliation',
    );
  }

  const partner = await db.businessPartner.findFirst({
    where: {
      id: input.businessPartnerId,
      companyId: input.companyId,
      isActive: true,
    },
    include: {
      customerProfile: { select: { isActive: true } },
      supplierProfile: { select: { isActive: true } },
    },
  });
  if (!partner) {
    throw new BadRequestException(
      'Journal line business partner does not belong to this company or is inactive',
    );
  }
  if (requiresCustomer && !partner.customerProfile?.isActive) {
    throw new BadRequestException(
      'Receivable journal lines require an active customer role',
    );
  }
  if (requiresSupplier && !partner.supplierProfile?.isActive) {
    throw new BadRequestException(
      'Payable journal lines require an active supplier role',
    );
  }
  return partner;
}
