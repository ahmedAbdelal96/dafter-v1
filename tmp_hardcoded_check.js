const fs = require("fs");
const path = require("path");

const base = "d:/Web/full-projects/daftar-v1/dafter-dashboard/src";

const files = [
  base + "/features/invoices/components/InvoiceCreateModal.tsx",
  base + "/features/invoices/components/InvoicesPageClient.tsx",
  base + "/features/invoices/components/InvoicesTable.tsx",
  base + "/features/invoices/components/InvoicesToolbar.tsx",
  base + "/features/invoices/components/InvoiceDetailsPageClient.tsx",
  base + "/app/[locale]/(admin)/invoices/page.tsx",
  base + "/app/[locale]/(admin)/invoices/[id]/page.tsx",
];

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log("NOT FOUND: " + f);
    continue;
  }
  const content = fs.readFileSync(f, "utf8");
  const name =
    path.basename(f, ".tsx") + " (" + path.dirname(f).split("/").pop() + ")";
  const lines = content.split("\n");
  const hits = [];

  lines.forEach((line, i) => {
    // Skip lines with t( calls, comments, import, or type annotations
    const trimmed = line.trim();
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("import ")
    )
      return;
    // Skip if line contains t("... or t('...
    if (/\bt\(["'`]/.test(line)) return;

    // Pattern 1: JSX text nodes with English words
    const jsxText = line.match(/>([A-Z][a-z][A-Za-z0-9 \-,.'!?:()]{4,})</);
    if (jsxText) {
      hits.push(i + 1 + ": JSX TEXT: " + jsxText[1].trim());
    }

    // Pattern 2: placeholder="English text" (not using t())
    const placeholder = line.match(
      /placeholder=["'`]([A-Z][a-z][A-Za-z0-9 \-,.'!?:]{4,})["'`]/,
    );
    if (placeholder) {
      hits.push(i + 1 + ": PLACEHOLDER: " + placeholder[1]);
    }

    // Pattern 3: Hardcoded string in toast calls
    const toast = line.match(
      /(?:toast|Toast|sonner)\.[a-z]+\(["'`]([A-Za-z][A-Za-z0-9 \-,.'!?:]{4,})["'`]/,
    );
    if (toast) {
      hits.push(i + 1 + ": TOAST: " + toast[1]);
    }

    // Pattern 4: label={" or label="English (not t())
    const label = line.match(
      /\blabel=["'`]([A-Z][a-z][A-Za-z0-9 \-,.'!?:]{4,})["'`]/,
    );
    if (label) {
      hits.push(i + 1 + ": LABEL: " + label[1]);
    }
  });

  if (hits.length > 0) {
    console.log("=== " + name + " ===");
    hits.forEach((h) => console.log("  " + h));
  } else {
    console.log(name + ": OK");
  }
}
