import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(process.cwd(), '..');
const b02ModuleRoots = [
  'business-partners',
  'payment-terms',
  'accounting-bootstrap',
  'opening-balances',
].map((moduleName) =>
  join(repositoryRoot, 'daftar-api-v1', 'src', 'modules', moduleName),
);

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? collectTypeScriptFiles(path)
      : path.endsWith('.ts')
        ? [path]
        : [];
  });
}

describe('B02 legacy boundary', () => {
  it('keeps the authoritative BusinessPartner architecture documented', () => {
    const documentPath = join(
      repositoryRoot,
      'docs',
      '02_BUSINESS_PARTNER_AND_ACCOUNTING_BOOTSTRAP.md',
    );
    const document = readFileSync(documentPath, 'utf8');

    expect(document).toContain('BusinessPartner');
    expect(document).toContain('B03');
    expect(document).toContain('B04');
  });

  it('does not import or query legacy Customer/Supplier modules', () => {
    const legacyReference =
      /(?:from\s+['"].*(?:customers|suppliers)|prisma\.(?:customer|supplier)|(?:customer|supplier)Repository)/i;
    const violations = b02ModuleRoots
      .flatMap(collectTypeScriptFiles)
      .flatMap((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        return legacyReference.test(source) ? [filePath] : [];
      });

    expect(violations).toEqual([]);
  });
});
