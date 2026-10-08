import { NotFoundException } from '@nestjs/common';
import { Prisma, PartyType } from '@prisma/client';
import { CreateInvoiceUseCase } from './create-invoice.use-case';
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

describe('CreateInvoiceUseCase', () => {
  let useCase: CreateInvoiceUseCase;
  let repo: jest.Mocked<InvoicesRepository>;
  let t: jest.Mocked<TranslationService>;

  beforeEach(() => {
    repo = {
      getPartySnapshot: jest.fn(),
      withTransaction: jest.fn(),
      generateInvoiceNumber: jest.fn(),
      create: jest.fn(),
      createAuditLog: jest.fn(),
    } as unknown as jest.Mocked<InvoicesRepository>;

    t = {
      translate: jest.fn((key: string) => key),
    } as unknown as jest.Mocked<TranslationService>;

    useCase = new CreateInvoiceUseCase(repo, t);
    jest.clearAllMocks();
  });

  it('creates draft invoice with expected orchestration and repository payload', async () => {
    const dto = {
      partyType: PartyType.CUSTOMER,
      partyId: 'party-1',
      issueDate: '2026-03-17',
      taxAmount: 14,
      notes: 'draft note',
      items: [{ description: 'item A', quantity: 2, unitPrice: 10 }],
    };
    const computedItems = [
      {
        productId: null,
        description: 'item A',
        quantity: new Prisma.Decimal(2),
        unitPrice: new Prisma.Decimal(10),
        total: new Prisma.Decimal(20),
      },
    ];
    const normalizedDate = new Date('2026-03-17T00:00:00.000Z');
    const tx = { txId: 'tx-1' };
    const created = { id: 'invoice-1' };

    repo.getPartySnapshot.mockResolvedValue({ name: 'Customer 1', phone: '010' });
    repo.withTransaction.mockImplementation(async (_existing, fn) => fn(tx as any));
    repo.generateInvoiceNumber.mockResolvedValue('INV-2026-0001');
    repo.create.mockResolvedValue(created as any);
    repo.createAuditLog.mockResolvedValue(undefined as any);

    (validateDraftItemProducts as jest.Mock).mockResolvedValue(undefined);
    (computeDraftItems as jest.Mock).mockReturnValue(computedItems);
    (sumItemTotals as jest.Mock).mockReturnValue(new Prisma.Decimal(20));
    (normalizeIssueDateToUtcStart as jest.Mock).mockReturnValue(normalizedDate);

    const result = await useCase.execute('company-1', 'user-1', dto as any);

    expect(result).toBe(created);
    expect(validateDraftItemProducts).toHaveBeenCalledWith(
      dto.items,
      'company-1',
      repo,
      t,
    );
    expect(computeDraftItems).toHaveBeenCalledWith(dto.items);
    expect(sumItemTotals).toHaveBeenCalledWith(computedItems);
    expect(normalizeIssueDateToUtcStart).toHaveBeenCalledWith(dto.issueDate);
    expect(repo.generateInvoiceNumber).toHaveBeenCalledWith('company-1', expect.any(Number), tx);

    expect(repo.create).toHaveBeenCalledTimes(1);
    const [createPayload, createTx] = repo.create.mock.calls[0];
    expect(createTx).toBe(tx);
    expect(createPayload.invoiceNumber).toBe('INV-2026-0001');
    expect(createPayload.partyName).toBe('Customer 1');
    expect(createPayload.issueDate).toBe(normalizedDate);
    expect(createPayload.items).toBe(computedItems);
    expect(createPayload.taxAmount.toString()).toBe('14');
    expect(createPayload.totalAmount.toString()).toBe('34');

    expect(repo.createAuditLog).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException when party snapshot is missing', async () => {
    repo.getPartySnapshot.mockResolvedValue(null);

    await expect(
      useCase.execute(
        'company-1',
        'user-1',
        {
          partyType: PartyType.CUSTOMER,
          partyId: 'party-1',
          issueDate: '2026-03-17',
          items: [{ description: 'item', quantity: 1, unitPrice: 10 }],
        } as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(validateDraftItemProducts).not.toHaveBeenCalled();
    expect(repo.withTransaction).not.toHaveBeenCalled();
    expect(t.translate).toHaveBeenCalledWith('invoices.partyNotFound');
  });

  it('propagates validation-helper rejection and does not open transaction', async () => {
    repo.getPartySnapshot.mockResolvedValue({ name: 'Customer 1', phone: null });
    (validateDraftItemProducts as jest.Mock).mockRejectedValue(
      new NotFoundException('invoices.productNotFound'),
    );

    await expect(
      useCase.execute(
        'company-1',
        'user-1',
        {
          partyType: PartyType.CUSTOMER,
          partyId: 'party-1',
          issueDate: '2026-03-17',
          items: [{ productId: 'bad-id', description: 'item', quantity: 1, unitPrice: 10 }],
        } as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repo.withTransaction).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });
});
