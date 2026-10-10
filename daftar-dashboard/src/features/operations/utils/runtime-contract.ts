import type {
  AccountingAccount,
  OpenItem,
  PaymentAllocationInput,
  PaymentMethod,
  PaymentRecord,
} from "@/lib/api/types/operations";

export function splitOpenItems(items: OpenItem[]): {
  debit: OpenItem[];
  credit: OpenItem[];
} {
  return {
    debit: items.filter((item) => item.type === "DEBIT"),
    credit: items.filter((item) => item.type === "CREDIT"),
  };
}

export function getOpenItemRemainingAmount(item: OpenItem): string {
  return item.remainingTransactionAmount || item.remainingAmount || "0";
}

export function getOpenItemDisplayValues(item: OpenItem) {
  return {
    id: item.id,
    reference: item.documentReference ?? item.sourceType ?? item.id.slice(0, 8),
    originalTransactionAmount: item.originalTransactionAmount,
    activeReconciledTransactionAmount: item.activeReconciledTransactionAmount,
    remainingTransactionAmount: getOpenItemRemainingAmount(item),
    currencyCode: item.currencyCode,
    dueDate: item.dueDate?.slice(0, 10) ?? "—",
  };
}

export function buildPaymentAllocation(
  paymentAmount: string,
  selectedItem: OpenItem | undefined,
  allocationAmount: string,
): PaymentAllocationInput[] {
  if (!selectedItem) return [];

  const payment = Number(paymentAmount);
  const allocation = Number(allocationAmount);
  if (!Number.isFinite(payment) || payment <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }
  if (!Number.isFinite(allocation) || allocation <= 0) {
    throw new Error("Allocation amount must be greater than zero");
  }
  if (allocation > payment) {
    throw new Error("Allocation amount cannot exceed payment amount");
  }

  return [{ journalLineId: selectedItem.id, amount: allocationAmount }];
}

export function filterPaymentAccounts(
  accounts: AccountingAccount[],
  method: PaymentMethod,
): AccountingAccount[] {
  const allowedTypes =
    method === "CASH"
      ? ["ASSET_CASH"]
      : method === "OTHER"
        ? ["ASSET_CASH", "ASSET_BANK"]
        : ["ASSET_BANK"];
  return accounts.filter((account) => allowedTypes.includes(account.accountType));
}

export function canReversePayment(
  mode: "customer" | "supplier",
  payment: Pick<PaymentRecord, "status">,
  permissions: Record<string, boolean | undefined>,
): boolean {
  if (payment.status !== "POSTED") return false;
  return mode === "supplier"
    ? permissions.reverseSupplierPayments === true
    : permissions.postCustomerPayment === true;
}
