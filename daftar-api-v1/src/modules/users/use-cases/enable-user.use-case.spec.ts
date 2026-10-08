// ============================================
// Enable User Use Case — Unit Tests
// ============================================
// Tests all business rules:
//   1. User not found → NotFoundException
//   2. Already ACTIVE → idempotent return (no DB write)
//   3. Plan limit reached → ForbiddenException
//   4. Happy path → user enabled + audit logged
// ============================================

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { EnableUserUseCase } from './enable-user.use-case';
import { UsersRepository } from '../users.repository';
import { TranslationService } from '../../../common/services/translation.service';

// ─── Shared mock user fixture ────────────────────────────────────────────────
const mockUserBase = {
  id: 'user-uuid',
  companyId: 'company-uuid',
  fullName: 'سارة أحمد',
  email: 'sara@company.com',
  phone: null,
  role: 'STAFF' as const,
  isDeleted: false,
  deletedAt: null,
  version: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  permissions: null,
};

describe('EnableUserUseCase', () => {
  let useCase: EnableUserUseCase;
  let repo: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnableUserUseCase,
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
            countActiveUsers: jest.fn(),
            getCompanyUserLimit: jest.fn(),
            enableUser: jest.fn(),
          },
        },
        {
          provide: TranslationService,
          // Returns the key itself — easy to assert against
          useValue: { translate: jest.fn((key: string) => key) },
        },
      ],
    }).compile();

    useCase = module.get<EnableUserUseCase>(EnableUserUseCase);
    repo = module.get(UsersRepository) as jest.Mocked<UsersRepository>;
  });

  afterEach(() => jest.clearAllMocks());

  // ── Test 1: User not found ────────────────────────────────────────────────
  it('should throw NotFoundException when user does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('company-uuid', 'missing-uuid', 'actor-uuid'),
    ).rejects.toThrow(NotFoundException);

    expect(repo.enableUser).not.toHaveBeenCalled();
  });

  // ── Test 2: Idempotent — already ACTIVE ──────────────────────────────────
  it('should return user without calling enableUser if already ACTIVE', async () => {
    repo.findById.mockResolvedValue({
      ...mockUserBase,
      status: UserStatus.ACTIVE,
      passwordHash: 'hashed_secret',
    });

    const result = await useCase.execute(
      'company-uuid',
      'user-uuid',
      'actor-uuid',
    );

    // Must not trigger a DB write
    expect(repo.enableUser).not.toHaveBeenCalled();
    expect(repo.countActiveUsers).not.toHaveBeenCalled();

    // passwordHash must NEVER leak
    expect(result).not.toHaveProperty('passwordHash');
    expect((result as any).id).toBe('user-uuid');
  });

  // ── Test 3: Plan limit reached ────────────────────────────────────────────
  it('should throw ForbiddenException when plan user limit is reached', async () => {
    repo.findById.mockResolvedValue({
      ...mockUserBase,
      status: UserStatus.DISABLED,
      passwordHash: 'hashed_secret',
    });
    repo.getCompanyUserLimit.mockResolvedValue(5); // plan max = 5
    repo.countActiveUsers.mockResolvedValue(5); // already at limit

    await expect(
      useCase.execute('company-uuid', 'user-uuid', 'actor-uuid'),
    ).rejects.toThrow(ForbiddenException);

    expect(repo.enableUser).not.toHaveBeenCalled();
  });

  // ── Test 4: Plan limit null (unlimited) — should succeed ─────────────────
  it('should enable user when plan has no limit (null)', async () => {
    repo.findById.mockResolvedValue({
      ...mockUserBase,
      status: UserStatus.DISABLED,
      passwordHash: 'hashed_secret',
    });
    repo.getCompanyUserLimit.mockResolvedValue(null); // no limit
    repo.enableUser.mockResolvedValue({
      ...mockUserBase,
      status: UserStatus.ACTIVE,
    });

    const result = await useCase.execute(
      'company-uuid',
      'user-uuid',
      'actor-uuid',
    );

    // countActiveUsers must NOT be called when limit is null
    expect(repo.countActiveUsers).not.toHaveBeenCalled();
    expect(repo.enableUser).toHaveBeenCalledWith(
      'company-uuid',
      'user-uuid',
      'actor-uuid',
    );
    expect(result).toHaveProperty('status', UserStatus.ACTIVE);
  });

  // ── Test 5: Happy path — under limit ─────────────────────────────────────
  it('should enable user when plan limit is not reached', async () => {
    repo.findById.mockResolvedValue({
      ...mockUserBase,
      status: UserStatus.DISABLED,
      passwordHash: 'hashed_secret',
    });
    repo.getCompanyUserLimit.mockResolvedValue(10); // plan max = 10
    repo.countActiveUsers.mockResolvedValue(7); // 7 < 10 → ok
    repo.enableUser.mockResolvedValue({
      ...mockUserBase,
      status: UserStatus.ACTIVE,
    });

    await useCase.execute('company-uuid', 'user-uuid', 'actor-uuid');

    expect(repo.enableUser).toHaveBeenCalledWith(
      'company-uuid',
      'user-uuid',
      'actor-uuid',
    );
  });

  // ── Test 6: Exactly at limit boundary (count === limit) ───────────────────
  it('should throw ForbiddenException when count equals plan limit (boundary)', async () => {
    repo.findById.mockResolvedValue({
      ...mockUserBase,
      status: UserStatus.DISABLED,
      passwordHash: 'hashed_secret',
    });
    repo.getCompanyUserLimit.mockResolvedValue(3);
    repo.countActiveUsers.mockResolvedValue(3); // equal → should block

    await expect(
      useCase.execute('company-uuid', 'user-uuid', 'actor-uuid'),
    ).rejects.toThrow(ForbiddenException);
  });
});
