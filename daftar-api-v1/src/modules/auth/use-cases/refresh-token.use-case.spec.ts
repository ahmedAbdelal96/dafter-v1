import { UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthRepository } from '../auth.repository';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { TokenService } from '../services/token.service';
import { TranslationService } from '../../../common/services/translation.service';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let authRepo: jest.Mocked<AuthRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let t: jest.Mocked<TranslationService>;

  const activeUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: UserRole.OWNER,
    companyId: 'company-1',
    status: UserStatus.ACTIVE,
    isDeleted: false,
    company: { id: 'company-1', name: 'Acme', isActive: true, isDeleted: false },
  };

  beforeEach(() => {
    authRepo = {
      findRefreshTokenByHash: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      revokeRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;

    tokenService = {
      hashToken: jest.fn(),
      generateAndStoreTokens: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;

    t = {
      translate: jest.fn((key: string) => key),
    } as unknown as jest.Mocked<TranslationService>;

    useCase = new RefreshTokenUseCase(authRepo, tokenService, t);
    jest.clearAllMocks();
  });

  it('throws unauthorized when refresh token is not found', async () => {
    tokenService.hashToken.mockReturnValue('hash-1');
    authRepo.findRefreshTokenByHash.mockResolvedValue(null);

    await expect(
      useCase.execute({ refreshToken: 'raw-token' } as any, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(t.translate).toHaveBeenCalledWith('auth.refresh.invalidToken');
    expect(authRepo.revokeAllUserTokens).not.toHaveBeenCalled();
    expect(authRepo.revokeRefreshToken).not.toHaveBeenCalled();
  });

  it('revokes all sessions and throws when revoked token is reused', async () => {
    tokenService.hashToken.mockReturnValue('hash-2');
    authRepo.findRefreshTokenByHash.mockResolvedValue({
      userId: 'user-1',
      revokedAt: new Date('2026-03-01T00:00:00.000Z'),
      expiresAt: new Date('2026-12-01T00:00:00.000Z'),
      user: activeUser,
    } as any);

    await expect(
      useCase.execute({ refreshToken: 'raw-token' } as any, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authRepo.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    expect(t.translate).toHaveBeenCalledWith('auth.refresh.revoked');
    expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
  });

  it('revokes current token and issues new pair on valid refresh flow', async () => {
    tokenService.hashToken.mockReturnValue('hash-3');
    tokenService.generateAndStoreTokens.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    } as any);
    authRepo.findRefreshTokenByHash.mockResolvedValue({
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date('2026-12-01T00:00:00.000Z'),
      user: activeUser,
    } as any);

    const result = await useCase.execute(
      { refreshToken: 'raw-token' } as any,
      { userAgent: 'ua', ip: '127.0.0.1' },
    );

    expect(authRepo.revokeRefreshToken).toHaveBeenCalledWith('hash-3');
    expect(tokenService.generateAndStoreTokens).toHaveBeenCalledWith(
      {
        sub: 'user-1',
        email: 'user@example.com',
        role: UserRole.OWNER,
        companyId: 'company-1',
      },
      { userAgent: 'ua', ip: '127.0.0.1' },
    );
    expect(result).toEqual({
      tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' },
    });
  });

  it('revokes provided token and rejects when user is disabled', async () => {
    tokenService.hashToken.mockReturnValue('hash-4');
    authRepo.findRefreshTokenByHash.mockResolvedValue({
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date('2026-12-01T00:00:00.000Z'),
      user: { ...activeUser, status: UserStatus.DISABLED },
    } as any);

    await expect(
      useCase.execute({ refreshToken: 'raw-token' } as any, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authRepo.revokeRefreshToken).toHaveBeenCalledWith('hash-4');
    expect(t.translate).toHaveBeenCalledWith('auth.login.accountDisabled');
    expect(tokenService.generateAndStoreTokens).not.toHaveBeenCalled();
  });
});
