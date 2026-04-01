import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateEmployeeUseCase } from './create-employee.use-case';
import { EmployeesRepository } from '../employees.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { EntitlementService } from '../../../common/entitlements/entitlement.service';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('CreateEmployeeUseCase', () => {
  let useCase: CreateEmployeeUseCase;
  let repo: jest.Mocked<EmployeesRepository>;
  let entitlement: { assertQuota: jest.Mock };
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateEmployeeUseCase,
        {
          provide: EmployeesRepository,
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

    useCase = module.get(CreateEmployeeUseCase);
    repo = module.get(EmployeesRepository) as jest.Mocked<EmployeesRepository>;
    entitlement = module.get(EntitlementService) as unknown as { assertQuota: jest.Mock };
    prisma = module.get(PrismaService) as unknown as { $transaction: jest.Mock };
  });

  it('creates employee when under quota and passes tx', async () => {
    repo.existsByName.mockResolvedValue(false);
    repo.createWithBalance.mockResolvedValue({ id: 'emp-1' } as any);

    const result = await useCase.execute('c1', 'u1', { name: 'Employee A' } as any);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(entitlement.assertQuota).toHaveBeenCalledWith(
      'c1',
      'employees',
      expect.any(Object),
    );
    expect(repo.createWithBalance).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'c1', actorUserId: 'u1', name: 'Employee A' }),
      expect.any(Object),
    );
    expect(result).toEqual({ id: 'emp-1' });
  });

  it('blocks employee creation when quota is exceeded', async () => {
    repo.existsByName.mockResolvedValue(false);
    entitlement.assertQuota.mockRejectedValue(new ForbiddenException('limit reached'));

    await expect(
      useCase.execute('c1', 'u1', { name: 'Employee A' } as any),
    ).rejects.toThrow(ForbiddenException);

    expect(repo.createWithBalance).not.toHaveBeenCalled();
  });

  it('throws conflict when employee name already exists', async () => {
    repo.existsByName.mockResolvedValue(true);

    await expect(
      useCase.execute('c1', 'u1', { name: 'Employee A' } as any),
    ).rejects.toThrow(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
