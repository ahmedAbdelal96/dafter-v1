import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateSupplierUseCase } from './create-supplier.use-case';
import { SuppliersRepository } from '../suppliers.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { EntitlementService } from '../../../common/entitlements/entitlement.service';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('CreateSupplierUseCase', () => {
  let useCase: CreateSupplierUseCase;
  let repo: jest.Mocked<SuppliersRepository>;
  let entitlement: { assertQuota: jest.Mock };
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSupplierUseCase,
        {
          provide: SuppliersRepository,
          useValue: {
            existsByName: jest.fn(),
            createWithBalance: jest.fn(),
          },
        },
        {
          provide: TranslationService,
          useValue: { translate: jest.fn((key: string) => key) },
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

    useCase = module.get(CreateSupplierUseCase);
    repo = module.get(SuppliersRepository) as jest.Mocked<SuppliersRepository>;
    entitlement = module.get(EntitlementService) as unknown as { assertQuota: jest.Mock };
    prisma = module.get(PrismaService) as unknown as { $transaction: jest.Mock };
  });

  it('creates supplier when under quota and passes tx', async () => {
    repo.existsByName.mockResolvedValue(false);
    repo.createWithBalance.mockResolvedValue({ id: 'sup-1' } as any);

    const result = await useCase.execute('c1', 'u1', { name: 'Supplier A' } as any);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(entitlement.assertQuota).toHaveBeenCalledWith(
      'c1',
      'suppliers',
      expect.any(Object),
    );
    expect(repo.createWithBalance).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'c1', actorUserId: 'u1', name: 'Supplier A' }),
      expect.any(Object),
    );
    expect(result).toEqual({ id: 'sup-1' });
  });

  it('blocks supplier creation when quota is exceeded', async () => {
    repo.existsByName.mockResolvedValue(false);
    entitlement.assertQuota.mockRejectedValue(new ForbiddenException('limit reached'));

    await expect(
      useCase.execute('c1', 'u1', { name: 'Supplier A' } as any),
    ).rejects.toThrow(ForbiddenException);

    expect(repo.createWithBalance).not.toHaveBeenCalled();
  });

  it('throws conflict when supplier name already exists', async () => {
    repo.existsByName.mockResolvedValue(true);

    await expect(
      useCase.execute('c1', 'u1', { name: 'Supplier A' } as any),
    ).rejects.toThrow(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
