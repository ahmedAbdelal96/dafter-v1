import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const checks = [
  {
    file: "src/lib/api/config.ts",
    requiredSnippets: ['changePlan: "/platform/subscriptions/change-plan"'],
  },
  {
    file: "src/lib/api/services/platform.ts",
    requiredSnippets: ["async changePlan(", "API_ENDPOINTS.platform.changePlan"],
  },
  {
    file: "src/lib/api/hooks/use-platform.ts",
    requiredSnippets: [
      "export function useChangePlatformSubscriptionPlan()",
      "platformApi.changePlan(payload)",
    ],
  },
  {
    file: "src/features/platform-management/components/PlatformSubscriptionsPageClient.tsx",
    requiredSnippets: [
      "useChangePlatformSubscriptionPlan",
      "changePlanMutation.mutateAsync",
    ],
  },
];

const failures = [];

for (const check of checks) {
  const absolutePath = resolve(process.cwd(), check.file);
  const content = readFileSync(absolutePath, "utf8");

  for (const snippet of check.requiredSnippets) {
    if (!content.includes(snippet)) {
      failures.push(`${check.file} is missing required snippet: ${snippet}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Platform subscription contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Platform subscription contract check passed.");
