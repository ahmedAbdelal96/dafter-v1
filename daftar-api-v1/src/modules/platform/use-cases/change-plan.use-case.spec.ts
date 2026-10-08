import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ChangePlanUseCase } from './change-plan.use-case';
import { ChangePlanMode } from '../dto';

describe('ChangePlanUseCase', () => {
  const platformRepo = {
    findCompanyByIdBasic: jest.fn(),
    findPlanById: jest.fn(),
    findActiveSubscription: jest.fn(),
    changePlanImmediate: jest.fn(),
  };

  const platformSettingsService = {
    getSettings: jest.fn(),
  };

  const useCase = new ChangePlanUseCase(
    platformRepo as any,
    platformSettingsService as any,
  );

  const dto = {
    companyId: '550e8400-e29b-41d4-a716-446655440000',
    newPlanId: '550e8400-e29b-41d4-a716-446655440001',
    mode: ChangePlanMode.IMMEDIATE,
    reason: 'Customer requested plan change',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FEATURE_CHANGE_PLAN_IMMEDIATE_ENABLED;

    platformRepo.findCompanyByIdBasic.mockResolvedValue({ id: dto.companyId });
    platformRepo.findPlanById.mockResolvedValue({
      id: dto.newPlanId,
      isActive: true,
      price: 150,
    });
    platformRepo.findActiveSubscription.mockResolvedValue({
      id: 'sub-live-1',
      companyId: dto.companyId,
      planId: 'old-plan-id',
      endDate: new Date('2099-01-10T00:00:00.000Z'),
      autoRenew: false,
      paymentStatus: 'PAID',
      plan: { id: 'old-plan-id', price: 100 },
    });
    platformRepo.changePlanImmediate.mockResolvedValue({ id: 'sub-live-2' });
    platformSettingsService.getSettings.mockResolvedValue({
      subscriptionPolicies: {
        allowPlanUpgrade: true,
        allowPlanDowngrade: true,
      },
    });
  });

  it('fails when feature flag disables endpoint', async () => {
    process.env.FEATURE_CHANGE_PLAN_IMMEDIATE_ENABLED = 'false';

    await expect(useCase.execute(dto as any, 'actor-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects any mode other than IMMEDIATE', async () => {
    await expect(
      useCase.execute(
        { ...dto, mode: 'NEXT_CYCLE' as any },
        'actor-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when company is missing', async () => {
    platformRepo.findCompanyByIdBasic.mockResolvedValue(null);

    await expect(useCase.execute(dto as any, 'actor-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when target plan is missing/inactive', async () => {
    platformRepo.findPlanById.mockResolvedValue(null);

    await expect(useCase.execute(dto as any, 'actor-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when no live subscription exists', async () => {
    platformRepo.findActiveSubscription.mockResolvedValue(null);

    await expect(useCase.execute(dto as any, 'actor-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when target plan equals current plan', async () => {
    platformRepo.findActiveSubscription.mockResolvedValue({
      id: 'sub-live-1',
      companyId: dto.companyId,
      planId: dto.newPlanId,
      endDate: new Date('2099-01-10T00:00:00.000Z'),
      autoRenew: false,
      paymentStatus: 'PAID',
      plan: { id: dto.newPlanId, price: 100 },
    });

    await expect(useCase.execute(dto as any, 'actor-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when upgrade is disallowed by policy', async () => {
    platformSettingsService.getSettings.mockResolvedValue({
      subscriptionPolicies: {
        allowPlanUpgrade: false,
        allowPlanDowngrade: true,
      },
    });

    await expect(useCase.execute(dto as any, 'actor-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps unique conflict to HTTP 409', async () => {
    platformRepo.changePlanImmediate.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute(dto as any, 'actor-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('changes plan immediately when all checks pass', async () => {
    const result = await useCase.execute(dto as any, 'actor-id');

    expect(platformRepo.changePlanImmediate).toHaveBeenCalledWith({
      companyId: dto.companyId,
      newPlanId: dto.newPlanId,
      actorUserId: 'actor-id',
      reason: dto.reason,
    });
    expect(result).toEqual({ id: 'sub-live-2' });
  });
});

