// ============================================
// Disable User Use Case — Unit Tests
// ============================================
// Tests all business rules:
//   1. User not found → NotFoundException
//   2. Already DISABLED → idempotent return
//   3. Last active OWNER → BadRequestException
//   4. OWNER with siblings → allowed
//   5. STAFF → always allowed
// ============================================

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { DisableUserUseCase } from './disable-user.use-case';
import { UsersRepository } from '../users.repository';
import { TranslationService } from '../../../common/services/translation.service';

const mockUserBase = {
  id: 'user-uuid',
  companyId: 'company-uuid',
  fullName: 'أحمد علي',
  email: 'ahmed@company.com',
  phone: null,
  isDeleted: false,
  deletedAt: null,
  version: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  permissions: null,
};

describe('DisableUserUseCase', () => {
  let useCase: DisableUserUseCase;
  let repo: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisableUserUseCase,
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
            countActiveOwners: jest.fn(),
            disableUser: jest.fn(),
          },
        },
        {
          provide: TranslationService,
          useValue: { translate: jest.fn((key: string) => key) },
        },
      ],
    }).compile();

    useCase = module.get<DisableUserUseCase>(DisableUserUseCase);
    repo = module.get(UsersRepository) as jest.Mocked<UsersRepository>;
  });

  afterEach(() => jest.clearAllMocks());

  // ── Test 1: User not found ────────────────────────────────────────────────
  it('should throw NotFoundException when user does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('company-uuid', 'missing-uuid', 'actor-uuid'),
    ).rejects.toThrow(NotFoundException);

    expect(repo.disableUser).not.toHaveBeenCalled();
  });

  // ── Test 2: Idempotent — already DISABLED ────────────────────────────────
  it('should return user without DB write if already DISABLED', async () => {
    repo.findById.mockResolvedValue({
      ...mockUserBase,
      role: UserRole.STAFF,
      status: UserStatus.DISABLED,
      passwordHash: 'hashed_secret',
    });

    const result = await useCase.execute(
      'company-uuid',
      'user-uuid',
      'actor-uuid',
    );

    expect(repo.disableUser).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('passwordHash');
  });

  // ── Test 3: Last OWNER → blocked ─────────────────────────────────────────
  it('should throw BadRequestException when trying to disable the last active OWNER', async () => {
    repo.findById.mockResolvedValue({
      ...mockUserBase,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      passwordHash: 'hashed_secret',
    });
    repo.countActiveOwners.mockResolvedValue(1); // only one owner left

    await expect(
      useCase.execute('company-uuid', 'user-uuid', 'actor-uuid'),
    ).rejects.toThrow(BadRequestException);

    expect(repo.disableUser).not.toHaveBeenCalled();
  });

  // ── Test 4: OWNER but not the last → allowed ──────────────────────────────
  it('should disable OWNER when there are other active owners', async () => {
    repo.findById.mockResolvedValue({
      ...mockUserBase,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      passwordHash: 'hashed_secret',
    });
    repo.countActiveOwners.mockResolvedValue(2); // 2 owners — safe to disable one
    repo.disableUser.mockResolvedValue({
      ...mockUserBase,
      role: UserRole.OWNER,
      status: UserStatus.DISABLED,
    });

    await useCase.execute('company-uuid', 'user-uuid', 'actor-uuid');

    expect(repo.disableUser).toHaveBeenCalledWith(
      'company-uuid',
      'user-uuid',
      'actor-uuid',
    );
  });

  // ── Test 5: STAFF → no owner guard needed ────────────────────────────────
  it('should disable STAFF without checking owner count', async () => {
    repo.findById.mockResolvedValue({
      ...mockUserBase,
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      passwordHash: 'hashed_secret',
    });
    repo.disableUser.mockResolvedValue({
      ...mockUserBase,
      role: UserRole.STAFF,
      status: UserStatus.DISABLED,
    });

    await useCase.execute('company-uuid', 'user-uuid', 'actor-uuid');

    expect(repo.countActiveOwners).not.toHaveBeenCalled();
    expect(repo.disableUser).toHaveBeenCalledWith(
      'company-uuid',
      'user-uuid',
      'actor-uuid',
    );
  });
});
