import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateStaffUseCase } from './create-staff.use-case';
import { UsersRepository } from '../users.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { EntitlementService } from '../../../common/entitlements/entitlement.service';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('CreateStaffUseCase', () => {
  let useCase: CreateStaffUseCase;
  let repo: jest.Mocked<UsersRepository>;
  let entitlement: { assertQuota: jest.Mock };
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateStaffUseCase,
        {
          provide: UsersRepository,
          useValue: {
            emailExists: jest.fn(),
            createStaff: jest.fn(),
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

    useCase = module.get(CreateStaffUseCase);
    repo = module.get(UsersRepository) as jest.Mocked<UsersRepository>;
    entitlement = module.get(EntitlementService) as unknown as { assertQuota: jest.Mock };
    prisma = module.get(PrismaService) as unknown as { $transaction: jest.Mock };
  });

  it('creates staff when under quota and passes tx', async () => {
    repo.emailExists.mockResolvedValue(false);
    repo.createStaff.mockResolvedValue({
      id: 'staff-1',
      fullName: 'Staff One',
      email: 's1@example.com',
      passwordHash: 'hashed',
      permissions: {},
    } as any);

    const result = await useCase.execute('c1', 'u1', {
      fullName: 'Staff One',
      email: 's1@example.com',
      password: 'StrongPass1',
      permissions: {},
    } as any);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(entitlement.assertQuota).toHaveBeenCalledWith(
      'c1',
      'users',
      expect.any(Object),
    );
    expect(repo.createStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'c1',
        actorUserId: 'u1',
        fullName: 'Staff One',
      }),
      expect.any(Object),
    );
    expect((result as any).passwordHash).toBeUndefined();
  });

  it('blocks staff creation when quota is exceeded', async () => {
    repo.emailExists.mockResolvedValue(false);
    entitlement.assertQuota.mockRejectedValue(new ForbiddenException('limit reached'));

    await expect(
      useCase.execute('c1', 'u1', {
        fullName: 'Staff One',
        email: 's1@example.com',
        password: 'StrongPass1',
      } as any),
    ).rejects.toThrow(ForbiddenException);

    expect(repo.createStaff).not.toHaveBeenCalled();
  });

  it('throws bad request when email already exists', async () => {
    repo.emailExists.mockResolvedValue(true);

    await expect(
      useCase.execute('c1', 'u1', {
        fullName: 'Staff One',
        email: 's1@example.com',
        password: 'StrongPass1',
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
