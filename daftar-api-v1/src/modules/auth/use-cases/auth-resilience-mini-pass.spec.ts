import { UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CacheService } from '../../../common/cache/cache.service';
import { TranslationService } from '../../../common/services/translation.service';
import { AuthRepository } from '../auth.repository';
import { TokenService } from '../services/token.service';
import { LoginUseCase } from './login.use-case';
import { RefreshTokenUseCase } from './refresh-token.use-case';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

class TestClock {
  private nowMs = Date.parse('2026-04-01T00:00:00.000Z');

  now(): number {
    return this.nowMs;
  }

  advanceBySeconds(seconds: number): void {
    this.nowMs += seconds * 1000;
  }
}

class InMemoryCacheDouble {
  private readonly store = new Map<string, { value: string; expiresAtMs: number | null }>();
  failNextGet = false;
  failNextSet = false;
  failNextDel = false;

  constructor(private readonly clock: TestClock) {}

  async get<T>(key: string): Promise<T | null> {
    if (this.failNextGet) {
      this.failNextGet = false;
      throw new Error('cache-get-failure');
    }

    const current = this.store.get(key);
    if (!current) return null;
    if (current.expiresAtMs !== null && this.clock.now() >= current.expiresAtMs) {
      this.store.delete(key);
      return null;
    }

    return current.value as unknown as T;
  }

  async set(key: string, value: string, options?: { ttl?: number }): Promise<void> {
    if (this.failNextSet) {
      this.failNextSet = false;
      throw new Error('cache-set-failure');
    }

    const expiresAtMs =
      options?.ttl && options.ttl > 0 ? this.clock.now() + options.ttl * 1000 : null;
    this.store.set(key, { value, expiresAtMs });
  }

  async del(key: string): Promise<void> {
    if (this.failNextDel) {
      this.failNextDel = false;
      throw new Error('cache-del-failure');
    }
    this.store.delete(key);
  }
}

type StoredRefreshTokenRecord = {
  userId: string;
  revokedAt: Date | null;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    role: UserRole;
    companyId: string | null;
    status: UserStatus;
    isDeleted: boolean;
    company: { isActive: boolean; isDeleted: boolean } | null;
  };
};

class InMemoryRefreshTokenStore {
  readonly tokens = new Map<string, StoredRefreshTokenRecord>();
}

describe('Auth Integration / Resilience Mini Pass', () => {
  const compareMock = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

  const baseUser = {
    id: 'user-1',
    fullName: 'Owner User',
    email: 'owner@example.com',
    passwordHash: 'hashed-password',
    role: UserRole.OWNER,
    companyId: 'company-1',
    status: UserStatus.ACTIVE,
    isDeleted: false,
    company: {
      id: 'company-1',
      name: 'Acme',
      isActive: true,
      isDeleted: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginUseCase lockout persistence and resilience', () => {
    let clock: TestClock;
    let cache: InMemoryCacheDouble;
    let authRepo: jest.Mocked<AuthRepository>;
    let tokenService: jest.Mocked<TokenService>;
    let t: jest.Mocked<TranslationService>;
    let useCase: LoginUseCase;

    beforeEach(() => {
      clock = new TestClock();
      cache = new InMemoryCacheDouble(clock);

      authRepo = {
        findUserByEmail: jest.fn().mockResolvedValue(baseUser as any),
      } as unknown as jest.Mocked<AuthRepository>;

      tokenService = {
        generateAndStoreTokens: jest.fn().mockResolvedValue({
          accessToken: 'access',
          refreshToken: 'refresh',
        }),
      } as unknown as jest.Mocked<TokenService>;

      t = {
        translate: jest.fn((key: string) => key),
      } as unknown as jest.Mocked<TranslationService>;

      useCase = new LoginUseCase(
        authRepo,
        tokenService,
        t,
        cache as unknown as CacheService,
      );
    });

    it('persists lockout attempts across repeated requests and short-circuits when locked', async () => {
      compareMock.mockResolvedValue(false as any);

      for (let i = 0; i < 5; i += 1) {
        await expect(
          useCase.execute(
            {
              email: '  OWNER@EXAMPLE.COM  ',
              password: 'wrong-pass',
            } as any,
            {},
          ),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }

      await expect(
        useCase.execute(
          {
            email: 'owner@example.com',
            password: 'wrong-pass',
          } as any,
          {},
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(t.translate).toHaveBeenCalledWith('auth.login.accountLocked', { minutes: 15 });
      expect(authRepo.findUserByEmail).toHaveBeenCalledTimes(5);
      expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
    });

    it('enforces lockout before expiry and allows login after deterministic expiry window', async () => {
      compareMock.mockImplementation(async (raw: string) => raw === 'Correct123!');

      for (let i = 0; i < 5; i += 1) {
        await expect(
          useCase.execute(
            {
              email: 'owner@example.com',
              password: 'wrong-pass',
            } as any,
            {},
          ),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }

      await expect(
        useCase.execute(
          {
            email: 'owner@example.com',
            password: 'Correct123!',
          } as any,
          {},
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      clock.advanceBySeconds(15 * 60 + 1);

      const result = await useCase.execute(
        {
          email: 'owner@example.com',
          password: 'Correct123!',
        } as any,
        {},
      );

      expect(tokenService.generateAndStoreTokens).toHaveBeenCalledTimes(1);
      expect(result.tokens).toEqual({
        accessToken: 'access',
        refreshToken: 'refresh',
      });
    });

    it('fails safely when cache get throws and does not issue tokens', async () => {
      cache.failNextGet = true;
      compareMock.mockResolvedValue(true as any);

      await expect(
        useCase.execute(
          {
            email: 'owner@example.com',
            password: 'Correct123!',
          } as any,
          {},
        ),
      ).rejects.toThrow('cache-get-failure');

      expect(authRepo.findUserByEmail).not.toHaveBeenCalled();
      expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
    });

    it('fails safely when cache set throws on invalid credentials and does not issue tokens', async () => {
      cache.failNextSet = true;
      compareMock.mockResolvedValue(false as any);

      await expect(
        useCase.execute(
          {
            email: 'owner@example.com',
            password: 'wrong-pass',
          } as any,
          {},
        ),
      ).rejects.toThrow('cache-set-failure');

      expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
    });

    it('fails safely when bcrypt compare throws and does not issue tokens', async () => {
      compareMock.mockRejectedValue(new Error('bcrypt-compare-failure'));

      await expect(
        useCase.execute(
          {
            email: 'owner@example.com',
            password: 'any-pass',
          } as any,
          {},
        ),
      ).rejects.toThrow('bcrypt-compare-failure');

      expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
    });
  });

  describe('RefreshTokenUseCase persistence side effects', () => {
    let store: InMemoryRefreshTokenStore;
    let authRepo: jest.Mocked<AuthRepository>;
    let tokenService: jest.Mocked<TokenService>;
    let t: jest.Mocked<TranslationService>;
    let useCase: RefreshTokenUseCase;
    let refreshCounter: number;

    const refreshUser = {
      id: 'user-1',
      email: 'owner@example.com',
      role: UserRole.OWNER,
      companyId: 'company-1',
      status: UserStatus.ACTIVE,
      isDeleted: false,
      company: { isActive: true, isDeleted: false },
    };

    beforeEach(() => {
      store = new InMemoryRefreshTokenStore();
      refreshCounter = 0;

      authRepo = {
        findRefreshTokenByHash: jest.fn(async (tokenHash: string) => {
          return (store.tokens.get(tokenHash) ?? null) as any;
        }),
        revokeRefreshToken: jest.fn(async (tokenHash: string) => {
          const current = store.tokens.get(tokenHash);
          if (current) {
            current.revokedAt = new Date();
          }
          return current as any;
        }),
        revokeAllUserTokens: jest.fn(async (userId: string) => {
          for (const token of store.tokens.values()) {
            if (token.userId === userId && !token.revokedAt) {
              token.revokedAt = new Date();
            }
          }
          return { count: 1 } as any;
        }),
      } as unknown as jest.Mocked<AuthRepository>;

      tokenService = {
        hashToken: jest.fn((raw: string) => `hash:${raw}`),
        generateAndStoreTokens: jest.fn(async () => {
          refreshCounter += 1;
          const refreshToken = `new-refresh-${refreshCounter}`;
          store.tokens.set(`hash:${refreshToken}`, {
            userId: refreshUser.id,
            revokedAt: null,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            user: refreshUser,
          });
          return {
            accessToken: `new-access-${refreshCounter}`,
            refreshToken,
          };
        }),
      } as unknown as jest.Mocked<TokenService>;

      t = {
        translate: jest.fn((key: string) => key),
      } as unknown as jest.Mocked<TranslationService>;

      useCase = new RefreshTokenUseCase(authRepo, tokenService, t);
    });

    it('rotates valid refresh token and persists revoke + new session token', async () => {
      store.tokens.set('hash:old-refresh', {
        userId: refreshUser.id,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: refreshUser,
      });

      const result = await useCase.execute(
        { refreshToken: 'old-refresh' } as any,
        { userAgent: 'ua', ip: '127.0.0.1' },
      );

      expect(authRepo.revokeRefreshToken).toHaveBeenCalledWith('hash:old-refresh');
      expect(store.tokens.get('hash:old-refresh')?.revokedAt).not.toBeNull();
      expect(store.tokens.get(`hash:${result.tokens.refreshToken}`)?.revokedAt).toBeNull();
      expect(tokenService.generateAndStoreTokens).toHaveBeenCalledTimes(1);
    });

    it('revokes all sessions when revoked token is reused and does not issue new tokens', async () => {
      store.tokens.set('hash:revoked-token', {
        userId: refreshUser.id,
        revokedAt: new Date('2026-03-01T00:00:00.000Z'),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: refreshUser,
      });
      store.tokens.set('hash:another-active-token', {
        userId: refreshUser.id,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: refreshUser,
      });

      await expect(
        useCase.execute({ refreshToken: 'revoked-token' } as any, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(authRepo.revokeAllUserTokens).toHaveBeenCalledWith(refreshUser.id);
      expect(store.tokens.get('hash:another-active-token')?.revokedAt).not.toBeNull();
      expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
    });

    it('rejects missing token hash without creating new token/session', async () => {
      await expect(
        useCase.execute({ refreshToken: 'missing-token' } as any, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(authRepo.findRefreshTokenByHash).toHaveBeenCalledWith('hash:missing-token');
      expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
      expect(store.tokens.size).toBe(0);
    });
  });
});

