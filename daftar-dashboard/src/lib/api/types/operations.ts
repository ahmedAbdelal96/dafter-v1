export type BusinessPartnerType = "PERSON" | "ORGANIZATION";
export type BusinessPartnerRole = "CUSTOMER" | "SUPPLIER";
export type BusinessPartnerAddressType = "BILLING" | "SHIPPING" | "REGISTERED" | "OTHER";

export interface BusinessPartnerProfile {
  id: string;
  isActive: boolean;
  paymentTermId?: string | null;
  preferredCurrencyCode?: string | null;
  creditLimit?: string | null;
  receivableAccountId?: string | null;
  payableAccountId?: string | null;
}

export interface BusinessPartnerAddress {
  id: string;
  addressType: BusinessPartnerAddressType;
  line1: string;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface BusinessPartnerContact {
  id: string;
  name: string;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
  isActive: boolean;
}

export interface BusinessPartner {
  id: string;
  companyId: string;
  partnerCode: string;
  partnerType: BusinessPartnerType;
  displayName: string;
  legalName?: string | null;
  taxRegistrationNumber?: string | null;
  commercialRegistrationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
  isActive: boolean;
  version: number;
  customerProfile?: BusinessPartnerProfile | null;
  supplierProfile?: BusinessPartnerProfile | null;
  addresses?: BusinessPartnerAddress[];
  contacts?: BusinessPartnerContact[];
}

export interface BusinessPartnerFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface BusinessPartnerInput {
  partnerCode: string;
  partnerType: BusinessPartnerType;
  displayName: string;
  legalName?: string;
  taxRegistrationNumber?: string;
  commercialRegistrationNumber?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
  roles?: BusinessPartnerRole[];
  customerProfile?: {
    paymentTermId?: string;
    creditLimit?: string | null;
    receivableAccountId?: string;
    preferredCurrencyCode?: string;
    isActive?: boolean;
  };
  supplierProfile?: {
    paymentTermId?: string;
    payableAccountId?: string;
    preferredCurrencyCode?: string;
    isActive?: boolean;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface SalesInvoiceLineInput {
  productId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountType?: "NONE" | "PERCENTAGE" | "FIXED";
  discountValue?: string;
  taxRateId?: string;
  taxTreatmentId?: string;
  taxOverrideReason?: string;
}

export interface SalesInvoiceInput {
  businessPartnerId: string;
  documentDate: string;
  currencyCode?: string;
  exchangeRate: string;
  paymentTermId?: string;
  customerReference?: string;
  notes?: string;
  lines: SalesInvoiceLineInput[];
}

export interface SalesInvoiceLine {
  id: string;
  sequence: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discountType?: string;
  discountValue?: string;
  netAmount?: string;
  taxAmount?: string;
  grossAmount?: string;
  taxRateId?: string | null;
  taxTreatmentId?: string | null;
}

export interface PaymentSchedule {
  id: string;
  sequence: number;
  dueDate: string;
  amount: string;
  settledAmount?: string;
  remainingAmount?: string;
  journalLineId?: string | null;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber?: string | null;
  status: "DRAFT" | "POSTED";
  businessPartnerId: string;
  businessPartner?: BusinessPartner;
  documentDate: string;
  postingDate?: string | null;
  currencyCode: string;
  exchangeRate: string;
  subtotal: string;
  taxTotal: string;
  grandTotal: string;
  customerReference?: string | null;
  notes?: string | null;
  lines: SalesInvoiceLine[];
  paymentSchedules?: PaymentSchedule[];
  journalEntry?: { id: string; entryNumber?: string | null } | null;
}

export interface SalesCreditNoteInput {
  salesInvoiceId: string;
  documentDate: string;
  reason: string;
  lines: Array<{ originalSalesInvoiceLineId: string; quantity: string }>;
}

export interface SalesCreditNote {
  id: string;
  creditNoteNumber?: string | null;
  status: "DRAFT" | "POSTED";
  salesInvoiceId: string;
  businessPartnerId: string;
  documentDate: string;
  postingDate?: string | null;
  reason: string;
  subtotal: string;
  taxTotal: string;
  grandTotal: string;
  lines: SalesInvoiceLine[];
}

export interface PurchaseLineInput extends SalesInvoiceLineInput {
  accountType?: "EXPENSE" | "ASSET";
  expenseAccountId?: string;
  assetAccountId?: string;
}

export interface PurchaseDocumentInput {
  businessPartnerId: string;
  documentDate: string;
  requestedDeliveryDate?: string;
  dueDate?: string;
  currencyCode?: string;
  exchangeRate: string;
  paymentTermId?: string;
  supplierReference?: string;
  notes?: string;
  purchaseOrderId?: string;
  lines: PurchaseLineInput[];
}

export interface PurchaseDocument {
  id: string;
  documentNumber?: string | null;
  status: "DRAFT" | "APPROVED" | "POSTED" | "CANCELLED";
  businessPartnerId: string;
  businessPartner?: BusinessPartner;
  documentDate: string;
  postingDate?: string | null;
  currencyCode: string;
  exchangeRate: string;
  subtotal?: string;
  taxTotal?: string;
  grandTotal?: string;
  supplierReference?: string | null;
  purchaseOrderId?: string | null;
  lines: SalesInvoiceLine[];
  paymentSchedule?: PaymentSchedule[];
}

export interface SupplierCreditNoteInput {
  supplierInvoiceId: string;
  documentDate: string;
  reason: string;
  lines: Array<{ originalSupplierInvoiceLineId: string; quantity: string }>;
}

export interface SupplierCreditNote {
  id: string;
  creditNoteNumber?: string | null;
  status: "DRAFT" | "POSTED";
  supplierInvoiceId: string;
  businessPartnerId: string;
  documentDate: string;
  postingDate?: string | null;
  reason: string;
  subtotal?: string;
  taxTotal?: string;
  grandTotal?: string;
  lines: SalesInvoiceLine[];
}

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CHEQUE" | "CARD" | "OTHER";
export type PaymentStatus = "DRAFT" | "POSTED" | "REVERSED";

export interface PaymentAllocationInput {
  journalLineId: string;
  salesInvoicePaymentScheduleId?: string;
  supplierInvoicePaymentScheduleId?: string;
  amount: string;
}

export interface PaymentInput {
  businessPartnerId: string;
  paymentDate: string;
  method: PaymentMethod;
  destinationAccountId?: string;
  sourceAccountId?: string;
  transactionCurrencyCode: string;
  exchangeRate: string;
  amount: string;
  notes?: string;
  reference?: string;
  allocations: PaymentAllocationInput[];
}

export interface PaymentRecord {
  id: string;
  status: PaymentStatus;
  businessPartnerId: string;
  businessPartner?: BusinessPartner;
  paymentDate: string;
  postingDate?: string | null;
  method: PaymentMethod;
  transactionCurrencyCode: string;
  exchangeRate: string;
  amount: string;
  remainingUnappliedAmount?: string;
  allocations?: PaymentAllocationInput[];
  journalLineId?: string | null;
  reference?: string | null;
  notes?: string | null;
}

export interface OpenItem {
  id: string;
  type: "DEBIT" | "CREDIT";
  maturityId?: string | null;
  invoiceId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  businessPartnerId: string;
  businessPartner?: BusinessPartner;
  originalTransactionAmount: string;
  originalBaseAmount: string;
  activeReconciledTransactionAmount: string;
  activeReconciledBaseAmount: string;
  remainingTransactionAmount: string;
  remainingBaseAmount: string;
  remainingAmount?: string;
  currencyCode: string;
  dueDate?: string | null;
  documentReference?: string | null;
  arAccount?: { id: string; code: string; name: string };
  apAccount?: { id: string; code: string; name: string };
}

export interface AccountingAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  isActive?: boolean;
}

export interface AccountingReadiness {
  status: "NOT_CONFIGURED" | "IN_PROGRESS" | "READY" | "BLOCKED";
  isReady: boolean;
  baseCurrencyCode?: string;
  missingRequirements?: string[];
  postingDate?: string;
}
