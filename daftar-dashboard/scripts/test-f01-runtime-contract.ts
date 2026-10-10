import assert from "node:assert/strict";
import {
  buildPaymentAllocation,
  canReversePayment,
  filterPaymentAccounts,
  getOpenItemDisplayValues,
  splitOpenItems,
} from "../src/features/operations/utils/runtime-contract.ts";
import type { AccountingAccount, OpenItem } from "../src/lib/api/types/operations.ts";

const arItem: OpenItem = {
  id: "debit-line-id",
  type: "DEBIT",
  maturityId: "maturity-id",
  invoiceId: "invoice-id",
  businessPartnerId: "party-id",
  originalTransactionAmount: "1000.00",
  originalBaseAmount: "1000.00",
  activeReconciledTransactionAmount: "200.00",
  activeReconciledBaseAmount: "200.00",
  remainingTransactionAmount: "800.00",
  remainingBaseAmount: "800.00",
  currencyCode: "EGP",
  dueDate: "2026-10-11T00:00:00.000Z",
  documentReference: "INV-1001",
  sourceType: "SALES_INVOICE",
  sourceId: "source-id",
};

const apItem: OpenItem = {
  ...arItem,
  id: "credit-line-id",
  type: "CREDIT",
  documentReference: "PINV-1001",
  originalTransactionAmount: "600.00",
  originalBaseAmount: "600.00",
  activeReconciledTransactionAmount: "0.00",
  activeReconciledBaseAmount: "0.00",
  remainingTransactionAmount: "600.00",
  remainingBaseAmount: "600.00",
};

const split = splitOpenItems([arItem, apItem]);
assert.deepEqual(split.debit.map((item) => item.id), ["debit-line-id"]);
assert.deepEqual(split.credit.map((item) => item.id), ["credit-line-id"]);
assert.deepEqual(getOpenItemDisplayValues(arItem), {
  id: "debit-line-id",
  reference: "INV-1001",
  originalTransactionAmount: "1000.00",
  activeReconciledTransactionAmount: "200.00",
  remainingTransactionAmount: "800.00",
  currencyCode: "EGP",
  dueDate: "2026-10-11",
});
assert.equal("journalLineId" in arItem, false);

const allocation = buildPaymentAllocation("1000", arItem, "600");
assert.deepEqual(allocation, [{ journalLineId: "debit-line-id", amount: "600" }]);
assert.throws(() => buildPaymentAllocation("1000", arItem, "1001"));
assert.deepEqual(buildPaymentAllocation("1000", undefined, "0"), []);

const accounts: AccountingAccount[] = [
  { id: "cash", code: "1010", name: "Cash", accountType: "ASSET_CASH" },
  { id: "bank", code: "1020", name: "Bank", accountType: "ASSET_BANK" },
  { id: "expense", code: "5000", name: "Expense", accountType: "EXPENSE" },
];
assert.deepEqual(filterPaymentAccounts(accounts, "CASH").map((account) => account.id), ["cash"]);
assert.deepEqual(filterPaymentAccounts(accounts, "BANK_TRANSFER").map((account) => account.id), ["bank"]);
assert.deepEqual(filterPaymentAccounts(accounts, "CHEQUE").map((account) => account.id), ["bank"]);
assert.deepEqual(filterPaymentAccounts(accounts, "OTHER").map((account) => account.id), ["cash", "bank"]);

assert.equal(
  canReversePayment("supplier", { status: "POSTED" }, { postSupplierPayment: true, reverseSupplierPayments: false }),
  false,
);
assert.equal(
  canReversePayment("supplier", { status: "POSTED" }, { postSupplierPayment: true, reverseSupplierPayments: true }),
  true,
);

console.log("F01 runtime contract tests passed (13 assertions).");
