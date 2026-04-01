jest.mock('../../notifications/notifications.service', () => ({
  NotificationsService: class NotificationsService {
    send = jest.fn().mockResolvedValue(undefined);
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateLedgerEntryUseCase } from './create-ledger-entry.use-case';
import { LedgerRepository } from '../ledger.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { CreateLedgerEntryDto } from '../dto';
import { LedgerEntryType, PartyType } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { EntitlementService } from '../../../common/entitlements/entitlement.service';
import { PrismaService } from '../../../database/prisma/prisma.service';

const validDto: CreateLedgerEntryDto = {
  partyType: PartyType.CUSTOMER,
  partyId: 'party-uuid',
  entryType: LedgerEntryType.INVOICE,
  signedAmount: 1500.5,
  entryDate: '2026-02-01',
  dueDate: '2026-02-28',
  note: 'فاتورة #101',
};

const mockEntry = {
  id: 'entry-uuid',
  companyId: 'company-uuid',
  partyType: PartyType.CUSTOMER,
  partyId: 'party-uuid',
  entryType: LedgerEntryType.INVOICE,
  signedAmount: { toNumber: () => 1500.5 },
  entryDate: new Date('2026-02-01'),
  dueDate: new Date('2026-02-28'),
  note: 'فاتورة #101',
  isDeleted: false,
  createdAt: new Date(),
};

describe('CreateLedgerEntryUseCase', () => {
  let useCase: CreateLedgerEntryUseCase;
  let repo: jest.Mocked<LedgerRepository>;
  let entitlement: { assertQuota: jest.Mock };
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLedgerEntryUseCase,
        {
          provide: LedgerRepository,
          useValue: {
            partyExists: jest.fn(),
            createEntryWithTx: jest.fn(),
          },
        },
        {
          provide: TranslationService,
          useValue: { translate: jest.fn((key: string) => key) },
        },
        {
          provide: NotificationsService,
          useValue: { send: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: EntitlementService,
          useValue: { assertQuota: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(async (cb: (tx: object) => unknown) => cb({})),
          },
        },
      ],
    }).compile();

    useCase = module.get<CreateLedgerEntryUseCase>(CreateLedgerEntryUseCase);
    repo = module.get(LedgerRepository) as jest.Mocked<LedgerRepository>;
    entitlement = module.get(EntitlementService) as unknown as { assertQuota: jest.Mock };
    prisma = module.get(PrismaService) as unknown as { $transaction: jest.Mock };
  });

  afterEach(() => jest.clearAllMocks());

  it('should throw NotFoundException when party does not exist in company', async () => {
    repo.partyExists.mockResolvedValue(false);

    await expect(
      useCase.execute('company-uuid', 'actor-uuid', validDto),
    ).rejects.toThrow(NotFoundException);

    expect(repo.createEntryWithTx).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when signedAmount is 0', async () => {
    const zeroDto = { ...validDto, signedAmount: 0 };

    await expect(
      useCase.execute('company-uuid', 'actor-uuid', zeroDto),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when dueDate is before entryDate', async () => {
    const invalidDateDto: CreateLedgerEntryDto = {
      ...validDto,
      signedAmount: 500,
      entryDate: '2026-02-20',
      dueDate: '2026-02-10',
    };

    await expect(
      useCase.execute('company-uuid', 'actor-uuid', invalidDateDto),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should allow dueDate equal to entryDate', async () => {
    repo.partyExists.mockResolvedValue(true);
    repo.createEntryWithTx.mockResolvedValue(mockEntry as any);

    const sameDayDto: CreateLedgerEntryDto = {
      ...validDto,
      entryDate: '2026-02-15',
      dueDate: '2026-02-15',
    };

    await expect(
      useCase.execute('company-uuid', 'actor-uuid', sameDayDto),
    ).resolves.not.toThrow();

    expect(repo.createEntryWithTx).toHaveBeenCalledTimes(1);
  });

  it('should create entry and return result on happy path', async () => {
    repo.partyExists.mockResolvedValue(true);
    repo.createEntryWithTx.mockResolvedValue(mockEntry as any);

    const result = await useCase.execute('company-uuid', 'actor-uuid', validDto);

    expect(entitlement.assertQuota).toHaveBeenCalledWith(
      'company-uuid',
      'ledgerEntries',
      expect.any(Object),
    );
    expect(repo.partyExists).toHaveBeenCalledWith(
      'company-uuid',
      'CUSTOMER',
      'party-uuid',
      expect.any(Object),
    );
    expect(repo.createEntryWithTx).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockEntry);
  });
});
