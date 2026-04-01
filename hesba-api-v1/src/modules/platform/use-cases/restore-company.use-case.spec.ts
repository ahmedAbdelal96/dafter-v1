import { NotFoundException } from '@nestjs/common';
import { RestoreCompanyUseCase } from './restore-company.use-case';

describe('RestoreCompanyUseCase', () => {
  const platformRepo = {
    findCompanyByIdAnyState: jest.fn(),
    restoreCompany: jest.fn(),
  };

  const t = {
    translate: jest.fn((key: string) => key),
  };

  const useCase = new RestoreCompanyUseCase(platformRepo as any, t as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('restores archived company when found', async () => {
    platformRepo.findCompanyByIdAnyState.mockResolvedValue({
      id: 'company-id',
      isDeleted: true,
    });
    platformRepo.restoreCompany.mockResolvedValue({
      id: 'company-id',
      isDeleted: false,
    });

    await expect(
      useCase.execute(
        'company-id',
        { reason: 'reactivation' } as any,
        'actor-user-id',
      ),
    ).resolves.toEqual({
      id: 'company-id',
      isDeleted: false,
    });
  });

  it('throws not found when company is missing', async () => {
    platformRepo.findCompanyByIdAnyState.mockResolvedValue(null);

    await expect(
      useCase.execute(
        'company-id',
        { reason: 'reactivation' } as any,
        'actor-user-id',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
