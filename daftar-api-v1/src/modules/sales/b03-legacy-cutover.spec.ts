import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('B03 legacy sales cutover', () => {
  it('registers only the authoritative Sales module for active sales APIs', () => {
    const appModuleSource = readFileSync(
      resolve(__dirname, '../../app.module.ts'),
      'utf8',
    );

    expect(appModuleSource).toContain(
      "import { SalesModule } from './modules/sales/sales.module';",
    );
    expect(appModuleSource).not.toContain('InvoicesModule');
    expect(appModuleSource).not.toContain('PricingModule');
  });
});
