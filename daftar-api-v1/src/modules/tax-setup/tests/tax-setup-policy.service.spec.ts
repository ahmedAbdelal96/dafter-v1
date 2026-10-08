import { TaxSetupPolicyService } from '../services/tax-setup-policy.service';

describe('TaxSetupPolicyService', () => {
  function createService() {
    const prisma = {
      taxRate: { findFirst: jest.fn() },
      taxTreatment: { findFirst: jest.fn() },
      taxRegistrationProfile: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      taxDefaultPolicy: { upsert: jest.fn(), findUnique: jest.fn() },
      taxAccountBinding: { upsert: jest.fn(), findUnique: jest.fn() },
      taxModuleApplicabilityRule: { upsert: jest.fn(), findMany: jest.fn() },
    } as any;
    return new TaxSetupPolicyService(prisma as any);
  }

  it('builds a normalized rate code and rejects duplicates', async () => {
    const service = createService();
    const db = {
      taxRate: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'rate-1' }),
      },
      taxTreatment: { findFirst: jest.fn() },
      taxRegistrationProfile: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      taxDefaultPolicy: { upsert: jest.fn(), findUnique: jest.fn() },
      taxAccountBinding: { upsert: jest.fn(), findUnique: jest.fn() },
      taxModuleApplicabilityRule: { upsert: jest.fn(), findMany: jest.fn() },
    } as any;

    await expect(service.assertUniqueRateCode('company-1', ' vat standard ', undefined, db)).resolves.toBe('VAT_STANDARD');
    await expect(service.assertUniqueRateCode('company-1', ' vat standard ', undefined, db)).rejects.toThrow('tax_setup.rate_code_exists');
  });
});
