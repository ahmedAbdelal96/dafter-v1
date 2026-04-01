import { NotFoundException } from '@nestjs/common';
import { ArchiveCompanyUseCase } from './archive-company.use-case';

describe('ArchiveCompanyUseCase', () => {
  const platformRepo = {
    findCompanyByIdBasic: jest.fn(),
    archiveCompany: jest.fn(),
  };

  const t = {
    translate: jest.fn((key: string) => key),
  };

  const useCase = new ArchiveCompanyUseCase(platformRepo as any, t as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('archives company when found', async () => {
    platformRepo.findCompanyByIdBasic.mockResolvedValue({
      id: 'company-id',
      isDeleted: false,
    });
    platformRepo.archiveCompany.mockResolvedValue({
      id: 'company-id',
      isDeleted: true,
    });

    await expect(
      useCase.execute(
        'company-id',
        { reason: 'cleanup' } as any,
        'actor-user-id',
      ),
    ).resolves.toEqual({
      id: 'company-id',
      isDeleted: true,
    });
  });

  it('throws not found when company is missing', async () => {
    platformRepo.findCompanyByIdBasic.mockResolvedValue(null);

    await expect(
      useCase.execute(
        'company-id',
        { reason: 'cleanup' } as any,
        'actor-user-id',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
