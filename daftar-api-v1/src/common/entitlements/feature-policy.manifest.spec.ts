import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  CONTROLLER_FEATURE_POLICY,
  type ControllerFeaturePolicy,
} from './feature-policy.manifest';

const MODULES_DIR = join(process.cwd(), 'src', 'modules');

function listControllerRelativePaths(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true });
  const output: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(root, entry.name);

    if (entry.isDirectory()) {
      output.push(...listControllerRelativePaths(absolutePath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
      output.push(relative(MODULES_DIR, absolutePath).replaceAll('\\', '/'));
    }
  }

  return output.sort();
}

function assertPolicy(content: string, policy: ControllerFeaturePolicy): boolean {
  if (policy === 'feature-gated') {
    return (
      content.includes('@RequireFeature(') || content.includes('@ProtectedFeature(')
    );
  }

  if (policy === 'role-guarded') {
    return (
      content.includes('@ProtectedRead(') ||
      content.includes('@ProtectedWrite(') ||
      content.includes('@OwnerOnly(')
    );
  }

  // Platform/admin and auth-public controllers intentionally use mixed guard styles
  // (class-level guards, route-level public decorators, and module-specific protection).
  // For these groups, explicit manifest coverage is the enforcement baseline.
  return true;
}

describe('Controller feature-policy manifest', () => {
  it('contains an explicit policy entry for every controller', () => {
    const controllers = listControllerRelativePaths(MODULES_DIR);
    const missing = controllers.filter((controller) => !(controller in CONTROLLER_FEATURE_POLICY));

    expect(missing).toEqual([]);
  });

  it('enforces minimum decorator baseline per declared policy', () => {
    const violations: string[] = [];

    for (const [relativePath, policy] of Object.entries(CONTROLLER_FEATURE_POLICY)) {
      const absolutePath = join(MODULES_DIR, relativePath);
      const content = readFileSync(absolutePath, 'utf8');

      if (!assertPolicy(content, policy)) {
        violations.push(`${relativePath} => ${policy}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
