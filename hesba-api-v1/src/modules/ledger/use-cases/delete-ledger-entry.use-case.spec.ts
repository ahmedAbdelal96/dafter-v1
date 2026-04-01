// ============================================
// Delete Ledger Entry Use Case — Unit Tests
// ============================================
// Tests all business rules:
//   1. Entry not found at all → NotFoundException
//   2. Entry already soft-deleted → BadRequestException
//   3. Happy path → softDeleteEntry called
// ============================================

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DeleteLedgerEntryUseCase } from './delete-ledger-entry.use-case';
import { LedgerRepository } from '../ledger.repository';
import { TranslationService } from '../../../common/services/translation.service';

const mockEntry = {
  id: 'entry-uuid',
  companyId: 'company-uuid',
  partyType: 'CUSTOMER' as const,
  partyId: 'party-uuid',
  entryType: 'CREDIT' as const,
  signedAmount: { toNumber: () => 1500 },
  entryDate: new Date('2026-02-01'),
  dueDate: null,
  note: null,
  isDeleted: false,
  createdAt: new Date(),
};

describe('DeleteLedgerEntryUseCase', () => {
  let useCase: DeleteLedgerEntryUseCase;
  let repo: jest.Mocked<LedgerRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLedgerEntryUseCase,
        {
          provide: LedgerRepository,
          useValue: {
            findById: jest.fn(),
            findByIdIncludeDeleted: jest.fn(),
            softDeleteEntry: jest.fn(),
          },
        },
        {
          provide: TranslationService,
          useValue: { translate: jest.fn((key: string) => key) },
        },
      ],
    }).compile();

    useCase = module.get<DeleteLedgerEntryUseCase>(DeleteLedgerEntryUseCase);
    repo = module.get(LedgerRepository) as jest.Mocked<LedgerRepository>;
  });

  afterEach(() => jest.clearAllMocks());

  // ── Test 1: Entry does not exist at all ───────────────────────────────────
  it('should throw NotFoundException when entry does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    repo.findByIdIncludeDeleted.mockResolvedValue(null); // truly doesn't exist

    await expect(
      useCase.execute('company-uuid', 'entry-uuid', 'actor-uuid'),
    ).rejects.toThrow(NotFoundException);

    expect(repo.softDeleteEntry).not.toHaveBeenCalled();
  });

  // ── Test 2: Entry already soft-deleted ────────────────────────────────────
  it('should throw BadRequestException when entry is already deleted', async () => {
    repo.findById.mockResolvedValue(null); // not visible (already deleted)
    repo.findByIdIncludeDeleted.mockResolvedValue({
      ...mockEntry,
      isDeleted: true, // the "already deleted" path
    } as any);

    await expect(
      useCase.execute('company-uuid', 'entry-uuid', 'actor-uuid'),
    ).rejects.toThrow(BadRequestException);

    expect(repo.softDeleteEntry).not.toHaveBeenCalled();
  });

  // ── Test 3: Happy path ────────────────────────────────────────────────────
  it('should call softDeleteEntry on happy path', async () => {
    repo.findById.mockResolvedValue(mockEntry as any); // entry exists and is active
    repo.softDeleteEntry.mockResolvedValue(undefined as any);

    await useCase.execute('company-uuid', 'entry-uuid', 'actor-uuid');

    expect(repo.softDeleteEntry).toHaveBeenCalledWith(
      'company-uuid',
      'entry-uuid',
      'actor-uuid',
    );
    // findByIdIncludeDeleted should NOT be called (entry was found by findById)
    expect(repo.findByIdIncludeDeleted).not.toHaveBeenCalled();
  });

  // ── Test 4: Multi-tenant isolation ───────────────────────────────────────
  it('should not find entry from a different company (tenant isolation)', async () => {
    // entry belongs to 'other-company' → findById returns null for 'our-company'
    repo.findById.mockResolvedValue(null);
    repo.findByIdIncludeDeleted.mockResolvedValue(null); // not in this company either

    await expect(
      useCase.execute('our-company', 'entry-uuid', 'actor-uuid'),
    ).rejects.toThrow(NotFoundException);
  });
});
