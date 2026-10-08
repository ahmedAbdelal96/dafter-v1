import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../auth.repository';
import { LoginUseCase } from './login.use-case';
import { TokenService } from '../services/token.service';
import { TranslationService } from '../../../common/services/translation.service';
import { CacheService } from '../../../common/cache/cache.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let authRepo: jest.Mocked<AuthRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let t: jest.Mocked<TranslationService>;
  let cacheService: jest.Mocked<CacheService>;

  const compareMock = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

  const activeUser = {
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
    authRepo = {
      findUserByEmail: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;

    tokenService = {
      generateAndStoreTokens: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;

    t = {
      translate: jest.fn((key: string) => key),
    } as unknown as jest.Mocked<TranslationService>;

    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;

    useCase = new LoginUseCase(authRepo, tokenService, t, cacheService);
    jest.clearAllMocks();
  });

  it('logs in successfully and only then issues tokens + clears attempts', async () => {
    cacheService.get.mockResolvedValue(null);
    authRepo.findUserByEmail.mockResolvedValue(activeUser as any);
    compareMock.mockResolvedValue(true as any);
    tokenService.generateAndStoreTokens.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    } as any);

    const result = await useCase.execute(
      {
        email: '  OWNER@EXAMPLE.COM ',
        password: 'StrongPass123!',
        rememberMe: true,
      } as any,
      { userAgent: 'ua', ip: '127.0.0.1' },
    );

    expect(authRepo.findUserByEmail).toHaveBeenCalledWith('owner@example.com');
    expect(compareMock).toHaveBeenCalledWith('StrongPass123!', 'hashed-password');
    expect(tokenService.generateAndStoreTokens).toHaveBeenCalledWith(
      {
        sub: 'user-1',
        email: 'owner@example.com',
        role: UserRole.OWNER,
        companyId: 'company-1',
      },
      {
        userAgent: 'ua',
        ip: '127.0.0.1',
        rememberMe: true,
      },
    );
    expect(cacheService.del).toHaveBeenCalledWith('login_attempts:owner@example.com');
    expect(result).toEqual({
      user: {
        id: 'user-1',
        fullName: 'Owner User',
        email: 'owner@example.com',
        role: UserRole.OWNER,
        companyId: 'company-1',
      },
      tokens: { accessToken: 'access', refreshToken: 'refresh' },
    });
  });

  it('short-circuits with lockout error before repository/password/token work', async () => {
    cacheService.get.mockResolvedValue('5');

    await expect(
      useCase.execute(
        { email: 'owner@example.com', password: 'x' } as any,
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(t.translate).toHaveBeenCalledWith('auth.login.accountLocked', {
      minutes: 15,
    });
    expect(authRepo.findUserByEmail).not.toHaveBeenCalled();
    expect(compareMock).not.toHaveBeenCalled();
    expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
  });

  it('increments failed attempts and throws when user is not found', async () => {
    cacheService.get
      .mockResolvedValueOnce(null) // checkLockout
      .mockResolvedValueOnce(null); // incrementFailedAttempts current
    authRepo.findUserByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute(
        { email: 'owner@example.com', password: 'x' } as any,
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(cacheService.set).toHaveBeenCalledWith(
      'login_attempts:owner@example.com',
      '1',
      { ttl: 900 },
    );
    expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
    expect(cacheService.del).not.toHaveBeenCalled();
  });

  it('increments failed attempts and throws when password is invalid', async () => {
    cacheService.get
      .mockResolvedValueOnce(null) // checkLockout
      .mockResolvedValueOnce('2'); // incrementFailedAttempts current
    authRepo.findUserByEmail.mockResolvedValue(activeUser as any);
    compareMock.mockResolvedValue(false as any);

    await expect(
      useCase.execute(
        { email: 'owner@example.com', password: 'wrong' } as any,
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(cacheService.set).toHaveBeenCalledWith(
      'login_attempts:owner@example.com',
      '3',
      { ttl: 900 },
    );
    expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
    expect(cacheService.del).not.toHaveBeenCalled();
  });

  it('rejects disabled user before token issuance', async () => {
    cacheService.get.mockResolvedValue(null);
    authRepo.findUserByEmail.mockResolvedValue({
      ...activeUser,
      status: UserStatus.DISABLED,
    } as any);
    compareMock.mockResolvedValue(true as any);

    await expect(
      useCase.execute(
        { email: 'owner@example.com', password: 'ok' } as any,
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(t.translate).toHaveBeenCalledWith('auth.login.accountDisabled');
    expect(cacheService.set).not.toHaveBeenCalled();
    expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
    expect(cacheService.del).not.toHaveBeenCalled();
  });

  it('rejects deleted user before token issuance', async () => {
    cacheService.get.mockResolvedValue(null);
    authRepo.findUserByEmail.mockResolvedValue({
      ...activeUser,
      isDeleted: true,
    } as any);
    compareMock.mockResolvedValue(true as any);

    await expect(
      useCase.execute(
        { email: 'owner@example.com', password: 'ok' } as any,
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(t.translate).toHaveBeenCalledWith('auth.login.accountDisabled');
    expect(cacheService.set).not.toHaveBeenCalled();
    expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
    expect(cacheService.del).not.toHaveBeenCalled();
  });

  it('rejects inactive/deleted company before token issuance', async () => {
    cacheService.get.mockResolvedValue(null);
    authRepo.findUserByEmail.mockResolvedValue({
      ...activeUser,
      company: { ...activeUser.company, isActive: false },
    } as any);
    compareMock.mockResolvedValue(true as any);

    await expect(
      useCase.execute(
        { email: 'owner@example.com', password: 'ok' } as any,
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(t.translate).toHaveBeenCalledWith('auth.login.companyDisabled');
    expect(cacheService.set).not.toHaveBeenCalled();
    expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
    expect(cacheService.del).not.toHaveBeenCalled();
  });

  it('rejects deleted company before token issuance', async () => {
    cacheService.get.mockResolvedValue(null);
    authRepo.findUserByEmail.mockResolvedValue({
      ...activeUser,
      company: { ...activeUser.company, isDeleted: true },
    } as any);
    compareMock.mockResolvedValue(true as any);

    await expect(
      useCase.execute(
        { email: 'owner@example.com', password: 'ok' } as any,
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(t.translate).toHaveBeenCalledWith('auth.login.companyDisabled');
    expect(cacheService.set).not.toHaveBeenCalled();
    expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
    expect(cacheService.del).not.toHaveBeenCalled();
  });

  it('allows login for active user without company and still issues tokens', async () => {
    cacheService.get.mockResolvedValue(null);
    authRepo.findUserByEmail.mockResolvedValue({
      ...activeUser,
      company: null,
      companyId: null,
    } as any);
    compareMock.mockResolvedValue(true as any);
    tokenService.generateAndStoreTokens.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    } as any);

    const result = await useCase.execute(
      {
        email: 'owner@example.com',
        password: 'StrongPass123!',
      } as any,
      {},
    );

    expect(tokenService.generateAndStoreTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-1',
        companyId: null,
      }),
      expect.any(Object),
    );
    expect(cacheService.del).toHaveBeenCalledWith('login_attempts:owner@example.com');
    expect(result.tokens).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('increments to lockout threshold deterministically on invalid password', async () => {
    cacheService.get
      .mockResolvedValueOnce(null) // checkLockout
      .mockResolvedValueOnce('4'); // incrementFailedAttempts current
    authRepo.findUserByEmail.mockResolvedValue(activeUser as any);
    compareMock.mockResolvedValue(false as any);

    await expect(
      useCase.execute(
        { email: 'owner@example.com', password: 'wrong' } as any,
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(cacheService.set).toHaveBeenCalledWith(
      'login_attempts:owner@example.com',
      '5',
      { ttl: 900 },
    );
    expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
    expect(cacheService.del).not.toHaveBeenCalled();
  });
});
