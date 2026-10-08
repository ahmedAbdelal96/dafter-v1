import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  InvoiceStatus,
  InvoicePaymentStatus,
  PartyType,
  Prisma,
} from '@prisma/client';
import { UpdateInvoiceUseCase } from './update-invoice.use-case';
import { InvoicesRepository } from '../invoices.repository';
import { TranslationService } from '../../../common/services/translation.service';
import {
  computeDraftItems,
  normalizeIssueDateToUtcStart,
  sumItemTotals,
  validateDraftItemProducts,
} from './invoice-draft-preparation.util';

jest.mock('./invoice-draft-preparation.util', () => ({
  validateDraftItemProducts: jest.fn(),
  computeDraftItems: jest.fn(),
  sumItemTotals: jest.fn(),
  normalizeIssueDateToUtcStart: jest.fn(),
}));

describe('UpdateInvoiceUseCase', () => {
  let useCase: UpdateInvoiceUseCase;
  let repo: jest.Mocked<InvoicesRepository>;
  let t: jest.Mocked<TranslationService>;

  const draftInvoice = {
    id: 'invoice-1',
    companyId: 'company-1',
    invoiceNumber: 'INV-2026-0001',
    status: InvoiceStatus.DRAFT,
    deferredSaleId: null,
    partyType: PartyType.CUSTOMER,
    partyId: 'party-1',
    partyName: 'Customer 1',
    partyPhone: '010',
    partyAddress: null,
    totalAmount: new Prisma.Decimal(30),
    taxAmount: new Prisma.Decimal(2),
    paidAmount: new Prisma.Decimal(0),
    invoicePaymentStatus: InvoicePaymentStatus.UNPAID,
    notes: null,
    issueDate: new Date('2026-03-17T00:00:00.000Z'),
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date('2026-03-17T00:00:00.000Z'),
    updatedAt: new Date('2026-03-17T00:00:00.000Z'),
    createdById: 'user-1',
    createdBy: { id: 'user-1', fullName: 'User 1' },
    items: [],
  };

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      findItemsForDiff: jest.fn(),
      withTransaction: jest.fn(),
      updateDraft: jest.fn(),
      createAuditLog: jest.fn(),
    } as unknown as jest.Mocked<InvoicesRepository>;

    t = {
      translate: jest.fn((key: string) => key),
    } as unknown as jest.Mocked<TranslationService>;

    useCase = new UpdateInvoiceUseCase(repo, t);
    jest.clearAllMocks();
  });

  it('throws NotFoundException when invoice is missing', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute('invoice-1', 'company-1', 'user-1', { notes: 'x' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(validateDraftItemProducts).not.toHaveBeenCalled();
    expect(repo.withTransaction).not.toHaveBeenCalled();
    expect(t.translate).toHaveBeenCalledWith('invoices.notFound');
  });

  it('throws BadRequestException when invoice is not DRAFT', async () => {
    repo.findOne.mockResolvedValue({
      ...draftInvoice,
      status: InvoiceStatus.APPROVED,
    } as any);

    await expect(
      useCase.execute('invoice-1', 'company-1', 'user-1', { notes: 'x' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(validateDraftItemProducts).not.toHaveBeenCalled();
    expect(repo.withTransaction).not.toHaveBeenCalled();
    expect(t.translate).toHaveBeenCalledWith('invoices.updateOnlyDraft');
  });

  it('updates draft with items and tax using shared preparation helpers', async () => {
    const dto = {
      items: [{ description: 'new item', quantity: 2, unitPrice: 10 }],
      taxAmount: 4,
      issueDate: '2026-03-20',
      notes: 'updated',
    };
    const beforeItems = [
      {
        id: 'old-item',
        description: 'old',
        quantity: new Prisma.Decimal(1),
        unitPrice: new Prisma.Decimal(5),
      },
    ];
    const computedItems = [
      {
        productId: null,
        description: 'new item',
        quantity: new Prisma.Decimal(2),
        unitPrice: new Prisma.Decimal(10),
        total: new Prisma.Decimal(20),
      },
    ];
    const normalizedDate = new Date('2026-03-20T00:00:00.000Z');
    const tx = { txId: 'tx-1' };
    const updated = { id: 'invoice-1', status: InvoiceStatus.DRAFT };

    repo.findOne.mockResolvedValue(draftInvoice as any);
    repo.findItemsForDiff.mockResolvedValue(beforeItems as any);
    repo.withTransaction.mockImplementation(async (_existing, fn) => fn(tx as any));
    repo.updateDraft.mockResolvedValue(updated as any);
    repo.createAuditLog.mockResolvedValue(undefined as any);

    (validateDraftItemProducts as jest.Mock).mockResolvedValue(undefined);
    (computeDraftItems as jest.Mock).mockReturnValue(computedItems);
    (sumItemTotals as jest.Mock).mockReturnValue(new Prisma.Decimal(20));
    (normalizeIssueDateToUtcStart as jest.Mock).mockReturnValue(normalizedDate);

    const result = await useCase.execute('invoice-1', 'company-1', 'user-1', dto as any);
    expect(result).toBe(updated);

    expect(validateDraftItemProducts).toHaveBeenCalledWith(dto.items, 'company-1', repo, t);
    expect(computeDraftItems).toHaveBeenCalledWith(dto.items);
    expect(sumItemTotals).toHaveBeenCalledWith(computedItems);
    expect(normalizeIssueDateToUtcStart).toHaveBeenCalledWith(dto.issueDate);

    expect(repo.updateDraft).toHaveBeenCalledTimes(1);
    const [, , updatePayload, updateTx] = repo.updateDraft.mock.calls[0];
    expect(updateTx).toBe(tx);
    expect(updatePayload.items).toBe(computedItems);
    expect(updatePayload.issueDate).toBe(normalizedDate);
    expect(updatePayload.taxAmount.toString()).toBe('4');
    expect(updatePayload.totalAmount.toString()).toBe('24');
    expect(updatePayload.notes).toBe('updated');

    expect(repo.createAuditLog).toHaveBeenCalledTimes(1);
    const [, auditPayload] = repo.createAuditLog.mock.calls[0];
    expect(auditPayload.action).toBe('invoice.update');
    expect(auditPayload.entityType).toBe('Invoice');
    expect(auditPayload.entityId).toBe('invoice-1');
    expect(auditPayload.metadata.invoiceNumber).toBe('INV-2026-0001');
    expect(auditPayload.metadata.fieldsChanged).toEqual([
      'items',
      'issueDate',
      'taxAmount',
      'notes',
    ]);
    expect(auditPayload.diff).toEqual({
      before: [
        {
          description: 'old',
          unitPrice: '5',
          quantity: '1',
        },
      ],
      after: [
        {
          description: 'new item',
          unitPrice: '10',
          quantity: '2',
        },
      ],
    });
  });

  it('updates total using existing items when only tax is provided', async () => {
    const beforeItems = [
      {
        id: 'old-item',
        description: 'old',
        quantity: new Prisma.Decimal(1),
        unitPrice: new Prisma.Decimal(5),
      },
    ];
    const tx = { txId: 'tx-tax-only' };
    const updated = { id: 'invoice-1', status: InvoiceStatus.DRAFT };

    repo.findOne.mockResolvedValue(draftInvoice as any);
    repo.findItemsForDiff.mockResolvedValue(beforeItems as any);
    repo.withTransaction.mockImplementation(async (_existing, fn) => fn(tx as any));
    repo.updateDraft.mockResolvedValue(updated as any);
    repo.createAuditLog.mockResolvedValue(undefined as any);

    (validateDraftItemProducts as jest.Mock).mockResolvedValue(undefined);

    const result = await useCase.execute(
      'invoice-1',
      'company-1',
      'user-1',
      { taxAmount: 5 } as any,
    );

    expect(result).toBe(updated);
    expect(validateDraftItemProducts).toHaveBeenCalledWith(undefined, 'company-1', repo, t);
    expect(computeDraftItems).not.toHaveBeenCalled();
    expect(sumItemTotals).not.toHaveBeenCalled();
    expect(normalizeIssueDateToUtcStart).not.toHaveBeenCalled();

    const [, , updatePayload] = repo.updateDraft.mock.calls[0];
    expect(updatePayload.items).toBeUndefined();
    expect(updatePayload.taxAmount.toString()).toBe('5');
    expect(updatePayload.totalAmount.toString()).toBe('33');
    expect(updatePayload.issueDate).toBeUndefined();

    expect(repo.createAuditLog).toHaveBeenCalledTimes(1);
    const [, auditPayload] = repo.createAuditLog.mock.calls[0];
    expect(auditPayload.metadata.fieldsChanged).toEqual(['taxAmount']);
    expect(auditPayload.diff).toEqual({
      before: [
        {
          description: 'old',
          unitPrice: '5',
          quantity: '1',
        },
      ],
      after: [
        {
          description: 'old',
          unitPrice: '5',
          quantity: '1',
        },
      ],
    });
  });
});
