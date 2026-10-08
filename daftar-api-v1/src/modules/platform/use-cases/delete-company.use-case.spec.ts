import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DeleteCompanyUseCase } from './delete-company.use-case';

describe('DeleteCompanyUseCase (archival-first policy)', () => {
  const platformRepo = {
    findCompanyByIdAnyState: jest.fn(),
    countHardDeleteBlockers: jest.fn(),
    hardDeleteCompany: jest.fn(),
    logBlockedHardDeleteAttempt: jest.fn(),
  };

  const t = {
    translate: jest.fn((key: string) => key),
  };

  const useCase = new DeleteCompanyUseCase(platformRepo as any, t as any);

  const dto = {
    confirmCompanyName: 'Alpha Traders',
    reason: 'policy check',
  };

  const actorUserId = '6d7f0f8f-4621-47f8-8c4a-01d3dbe63001';

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ALLOW_COMPANY_HARD_DELETE;
    process.env.NODE_ENV = 'test';

    platformRepo.findCompanyByIdAnyState.mockResolvedValue({
      id: 'company-id',
      name: 'Alpha Traders',
      isActive: false,
      isDeleted: true,
    });
    platformRepo.countHardDeleteBlockers.mockResolvedValue({ total: 0 });
    platformRepo.hardDeleteCompany.mockResolvedValue(undefined);
  });

  it('blocks hard delete by default', async () => {
    await expect(
      useCase.execute('company-id', dto as any, actorUserId),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(platformRepo.logBlockedHardDeleteAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-id',
        reasonCode: 'HARD_DELETE_DISABLED',
      }),
    );
  });

  it('forces hard delete disabled in production even if override is true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_COMPANY_HARD_DELETE = 'true';

    await expect(
      useCase.execute('company-id', dto as any, actorUserId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires exact company name confirmation', async () => {
    process.env.ALLOW_COMPANY_HARD_DELETE = 'true';

    await expect(
      useCase.execute(
        'company-id',
        { ...dto, confirmCompanyName: 'wrong-name' } as any,
        actorUserId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires archived state before hard delete', async () => {
    process.env.ALLOW_COMPANY_HARD_DELETE = 'true';
    platformRepo.findCompanyByIdAnyState.mockResolvedValue({
      id: 'company-id',
      name: 'Alpha Traders',
      isActive: false,
      isDeleted: false,
    });

    await expect(
      useCase.execute('company-id', dto as any, actorUserId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks hard delete when financial/audit blockers exist', async () => {
    process.env.ALLOW_COMPANY_HARD_DELETE = 'true';
    platformRepo.countHardDeleteBlockers.mockResolvedValue({
      liveSubscriptions: 0,
      invoices: 1,
      ledgerEntries: 0,
      expenses: 0,
      deferredSales: 0,
      installmentContracts: 0,
      subscriptionPayments: 0,
      auditLogs: 0,
      total: 1,
    });

    await expect(
      useCase.execute('company-id', dto as any, actorUserId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows hard delete only in non-production with explicit override and no blockers', async () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_COMPANY_HARD_DELETE = 'true';

    await expect(
      useCase.execute('company-id', dto as any, actorUserId),
    ).resolves.toEqual({ id: 'company-id', deleted: true });

    expect(platformRepo.hardDeleteCompany).toHaveBeenCalledWith('company-id');
  });

  it('throws not-found for missing company', async () => {
    process.env.ALLOW_COMPANY_HARD_DELETE = 'true';
    platformRepo.findCompanyByIdAnyState.mockResolvedValue(null);

    await expect(
      useCase.execute('company-id', dto as any, actorUserId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
