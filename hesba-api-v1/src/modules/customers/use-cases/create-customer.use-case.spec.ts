import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateCustomerUseCase } from './create-customer.use-case';
import { CustomersRepository } from '../customers.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { EntitlementService } from '../../../common/entitlements/entitlement.service';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let repo: jest.Mocked<CustomersRepository>;
  let entitlement: { assertQuota: jest.Mock };
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCustomerUseCase,
        {
          provide: CustomersRepository,
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

    useCase = module.get(CreateCustomerUseCase);
    repo = module.get(CustomersRepository) as jest.Mocked<CustomersRepository>;
    entitlement = module.get(EntitlementService) as unknown as { assertQuota: jest.Mock };
    prisma = module.get(PrismaService) as unknown as { $transaction: jest.Mock };
  });

  it('creates customer when under quota and passes tx to quota + repo', async () => {
    repo.existsByName.mockResolvedValue(false);
    repo.createWithBalance.mockResolvedValue({ id: 'cust-1' } as any);

    const result = await useCase.execute('c1', 'u1', { name: 'ACME' } as any);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(entitlement.assertQuota).toHaveBeenCalledWith(
      'c1',
      'customers',
      expect.any(Object),
    );
    expect(repo.createWithBalance).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'c1', actorUserId: 'u1', name: 'ACME' }),
      expect.any(Object),
    );
    expect(result).toEqual({ id: 'cust-1' });
  });

  it('blocks creation when quota is exceeded', async () => {
    repo.existsByName.mockResolvedValue(false);
    entitlement.assertQuota.mockRejectedValue(new ForbiddenException('limit reached'));

    await expect(
      useCase.execute('c1', 'u1', { name: 'ACME' } as any),
    ).rejects.toThrow(ForbiddenException);

    expect(repo.createWithBalance).not.toHaveBeenCalled();
  });

  it('throws conflict when name already exists before transaction', async () => {
    repo.existsByName.mockResolvedValue(true);

    await expect(
      useCase.execute('c1', 'u1', { name: 'ACME' } as any),
    ).rejects.toThrow(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
