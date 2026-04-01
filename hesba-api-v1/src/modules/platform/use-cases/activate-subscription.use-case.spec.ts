import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ActivateSubscriptionUseCase } from './activate-subscription.use-case';

describe('ActivateSubscriptionUseCase', () => {
  const platformRepo = {
    findCompanyById: jest.fn(),
    findPlanById: jest.fn(),
    findActiveSubscription: jest.fn(),
    activateSubscription: jest.fn(),
  };

  const platformSettingsService = {
    getSettings: jest.fn(),
  };

  const t = {
    translate: jest.fn((key: string) => key),
  };

  const useCase = new ActivateSubscriptionUseCase(
    platformRepo as any,
    platformSettingsService as any,
    t as any,
  );

  const dto = {
    companyId: '550e8400-e29b-41d4-a716-446655440000',
    planId: '550e8400-e29b-41d4-a716-446655440001',
    endDate: '2099-01-01T00:00:00.000Z',
    autoRenew: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    platformRepo.findCompanyById.mockResolvedValue({ id: dto.companyId });
    platformRepo.findPlanById.mockResolvedValue({
      id: dto.planId,
      isActive: true,
      price: 100,
    });
    platformRepo.findActiveSubscription.mockResolvedValue(null);
    platformSettingsService.getSettings.mockResolvedValue({
      subscriptionPolicies: {
        allowPlanUpgrade: true,
        allowPlanDowngrade: true,
      },
    });
  });

  it('maps unique-conflict to HTTP 409 (concurrency-safe behavior)', async () => {
    platformRepo.activateSubscription.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute(dto as any, 'actor-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('maps unknown DB failures to HTTP 500', async () => {
    platformRepo.activateSubscription.mockRejectedValue(new Error('boom'));

    await expect(useCase.execute(dto as any, 'actor-id')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
