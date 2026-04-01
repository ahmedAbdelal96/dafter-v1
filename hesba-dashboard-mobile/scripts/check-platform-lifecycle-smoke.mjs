import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const checks = [
  {
    file: 'src/features/platform/api/platform.api.ts',
    snippets: [
      'updateCompany: async (id: string, dto: UpdateCompanyDto)',
      'archiveCompany: async (id: string, dto?: ArchiveCompanyDto)',
      'restoreCompany: async (id: string, dto?: ArchiveCompanyDto)',
      'changePlan: async (dto: ChangePlanDto)',
      "'Idempotency-Key': idempotencyKey",
      "mode: 'IMMEDIATE'",
    ],
  },
  {
    file: 'src/features/platform/hooks/usePlatformMutations.ts',
    snippets: [
      'export function useUpdateCompany()',
      'export function useArchiveCompany()',
      'export function useRestoreCompany()',
      'export function useChangePlan()',
      'invalidateCompany(qc, dto.companyId)',
    ],
  },
  {
    file: 'src/features/platform/components/CompanyDetailSheet.tsx',
    snippets: [
      "setSubAction('editCompany')",
      "setSubAction('changePlan')",
      "setShowArchiveConfirm(true)",
      "setShowRestoreConfirm(true)",
      'canHardDeleteCompany && company.isDeleted',
    ],
  },
  {
    file: 'src/features/platform/utils/platform-errors.ts',
    snippets: [
      "case 'HARD_DELETE_DISABLED'",
      "case 'IDEMPOTENCY_HASH_MISMATCH'",
      "case 'IDEMPOTENCY_IN_PROGRESS'",
      "case 'LIVE_SUBSCRIPTION_CONFLICT'",
    ],
  },
  {
    file: 'src/features/platform/api/platform.api.ts',
    snippets: [
      'listAuditLogs: async (',
      'getAuditLookups: async (',
      'getSettings: async ()',
      'getFeatureFlags: async ()',
    ],
  },
  {
    file: 'src/features/platform/hooks/usePlatform.ts',
    snippets: [
      'export function usePlatformAuditLogs(',
      'export function usePlatformAuditLookups(',
      'export function usePlatformSettings(',
      'export function usePlatformFeatureFlags(',
    ],
  },
  {
    file: 'src/app/(platform)/audit-logs.tsx',
    snippets: [
      "useTranslation('platform')",
      'usePlatformAuditLogs(',
      'usePlatformAuditLookups(',
      "t('auditLogs.title')",
    ],
  },
  {
    file: 'src/app/(platform)/platform-settings.tsx',
    snippets: [
      "useTranslation('platform')",
      'usePlatformSettings(',
      'usePlatformFeatureFlags(',
      "t('platformSettings.readOnlyNote')",
    ],
  },
  {
    file: 'src/app/(platform)/more.tsx',
    snippets: [
      "router.push('/(platform)/audit-logs')",
      "router.push('/(platform)/platform-settings')",
      "t('more.auditLogs')",
      "t('more.platformSettings')",
    ],
  },
  {
    file: 'src/app/(platform)/_layout.tsx',
    snippets: [
      'name="audit-logs"',
      'name="platform-settings"',
    ],
  },
];

const failures = [];

for (const check of checks) {
  const absolutePath = resolve(process.cwd(), check.file);
  const content = readFileSync(absolutePath, 'utf8');

  for (const snippet of check.snippets) {
    if (!content.includes(snippet)) {
      failures.push(`${check.file} is missing required snippet: ${snippet}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Platform lifecycle smoke check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Platform lifecycle smoke check passed.');
