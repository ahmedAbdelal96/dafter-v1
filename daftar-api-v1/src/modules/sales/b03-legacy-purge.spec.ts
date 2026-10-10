import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

describe('B03 legacy purge architecture', () => {
  const repositoryRoot = resolve(process.cwd(), '..');
  const apiRoot = join(repositoryRoot, 'daftar-api-v1');
  const sourceRoot = join(apiRoot, 'src');
  const schemaPath = join(apiRoot, 'prisma', 'schema.prisma');

  it('has no active legacy sales/accounting module roots', () => {
    for (const moduleName of [
      'customers',
      'suppliers',
      'invoices',
      'ledger',
      'deferred-sales',
      'installments',
      'statements',
      'reports',
      'dashboard',
      'pricing',
    ]) {
      expect(existsSync(join(sourceRoot, 'modules', moduleName))).toBe(false);
    }
  });

  it('keeps the only active document and accounting authorities', () => {
    const schema = readFileSync(schemaPath, 'utf8');
    expect(schema).toContain('model BusinessPartner {');
    expect(schema).toContain('model SalesInvoice {');
    expect(schema).toContain('model JournalEntry {');
    expect(schema).toContain('model JournalLine {');
    expect(schema).not.toContain('model Invoice {');
    expect(schema).not.toContain('model LedgerEntry {');
    expect(schema).not.toContain('model Balance {');
    expect(schema).not.toContain('openingBalance Decimal');
  });

  it('does not register removed routes in AppModule', () => {
    const appModule = readFileSync(join(sourceRoot, 'app.module.ts'), 'utf8');
    for (const removedModule of [
      'CustomersModule',
      'SuppliersModule',
      'InvoicesModule',
      'LedgerModule',
      'DeferredSalesModule',
      'InstallmentsModule',
      'ReportsModule',
      'DashboardModule',
    ]) {
      expect(appModule).not.toContain(removedModule);
    }
  });
});
