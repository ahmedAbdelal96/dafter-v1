import { computeTaxSetupReadiness, normalizeTaxCode } from '../services/tax-setup.utils';

describe('tax setup utils', () => {
  it('normalizes tax codes consistently', () => {
    expect(normalizeTaxCode(' vat standard ')).toBe('VAT_STANDARD');
  });

  it('marks readiness only when core configuration exists', () => {
    expect(
      computeTaxSetupReadiness({
        hasProfile: true,
        hasTaxRates: true,
        hasTaxTreatments: true,
        hasDefaultPolicy: true,
        hasAccountBinding: true,
      }),
    ).toBe('READY');

    expect(
      computeTaxSetupReadiness({
        hasProfile: true,
        hasTaxRates: false,
        hasTaxTreatments: false,
        hasDefaultPolicy: false,
        hasAccountBinding: false,
      }),
    ).toBe('PARTIALLY_CONFIGURED');
  });
});
