import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const forbiddenRoles = ["ACCOUNTANT", "RECEPTION"];

// Keep scope intentionally narrow to active role contract paths.
const filesToCheck = [
  "src/config/rbac.ts",
  "src/config/route-access.ts",
  "src/stores/auth-store.ts",
];

const violations = [];

for (const relativePath of filesToCheck) {
  const absolutePath = resolve(process.cwd(), relativePath);
  const content = readFileSync(absolutePath, "utf8");

  for (const role of forbiddenRoles) {
    if (content.includes(`"${role}"`)) {
      violations.push({ file: relativePath, role });
    }
  }
}

if (violations.length > 0) {
  console.error("Role contract check failed:");
  for (const violation of violations) {
    console.error(`- ${violation.file} contains forbidden role "${violation.role}"`);
  }
  process.exit(1);
}

console.log("Role contract check passed.");
