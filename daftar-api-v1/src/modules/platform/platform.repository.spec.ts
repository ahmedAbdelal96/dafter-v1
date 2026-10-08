import { PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { PlatformRepository } from './platform.repository';

describe('PlatformRepository concurrency behavior', () => {
  it('locks company row before mutating subscription lifecycle', async () => {
    const createdSubscription = {
      id: 'sub-id',
      companyId: 'company-id',
      planId: 'plan-id',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      autoRenew: false,
      paymentStatus: PaymentStatus.PAID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tx = {
      companySubscription: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue(createdSubscription),
      },
      company: {
        update: jest.fn().mockResolvedValue({ id: 'company-id' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-id' }),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };

    const subscriptionGovernance = {
      lockCompanyForSubscriptionMutation: jest.fn().mockResolvedValue(undefined),
    };

    const repo = new PlatformRepository(
      prisma as any,
      subscriptionGovernance as any,
    );

    const result = await repo.activateSubscription({
      companyId: 'company-id',
      planId: 'plan-id',
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      autoRenew: false,
      actorUserId: 'actor-id',
      note: 'test',
    });

    expect(subscriptionGovernance.lockCompanyForSubscriptionMutation).toHaveBeenCalledWith(
      'company-id',
      tx,
    );
    expect(tx.companySubscription.create).toHaveBeenCalledTimes(1);
    expect(result).toBe(createdSubscription);
  });
});
