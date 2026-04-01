#!/usr/bin/env node
/**
 * fix-ar-encoding.js
 * ==================
 * يصلح مشكلة الترميز المزدوج (Mojibake) في ملفات الترجمة العربية.
 *
 * المشكلة: نصوص عربية UTF-8 تم حفظها بشكل خاطئ كـ Windows-1252 ثم أُعيد
 * ترميزها كـ UTF-8، مما يظهرها كرموز غريبة مثل: "Ø§Ø¨Ø­Ø«" بدلاً من "ابحث".
 *
 * الحل: عكس العملية — تحويل كل حرف إلى قيمته البايتية في Win-1252، ثم فك
 * ترميز البايتات كـ UTF-8. يتكرر حتى الاستقرار (لملفات التشفير الثلاثي).
 *
 * Usage:
 *   node scripts/fix-ar-encoding.js                    # يصلح dafter-dashboard/messages/ar
 *   node scripts/fix-ar-encoding.js --dir <path>       # مسار مخصص
 *   node scripts/fix-ar-encoding.js --dry-run          # معاينة فقط بدون حفظ
 *   node scripts/fix-ar-encoding.js --verbose          # تفاصيل أكثر
 */

const fs = require("fs");
const path = require("path");

// ─── CLI Arguments ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VERBOSE = args.includes("--verbose");
const dirIdx = args.indexOf("--dir");
const TARGET_DIR =
  dirIdx !== -1
    ? path.resolve(args[dirIdx + 1])
    : path.resolve(__dirname, "../dafter-dashboard/messages/ar");

// ─── Windows-1252 Special Range (0x80–0x9F) ─────────────────────────────────
// Latin-1 maps 0x80-0x9F to the same code points, but Win-1252 maps them
// to printable characters. We need to reverse those printable chars back
// to their original byte values.
const WIN1252_UNICODE_TO_BYTE = {
  0x20ac: 0x80, // €
  0x201a: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201e: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02c6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8a, // Š
  0x2039: 0x8b, // ‹
  0x0152: 0x8c, // Œ
  0x017d: 0x8e, // Ž
  0x2018: 0x91, // '
  0x2019: 0x92, // '
  0x201c: 0x93, // "
  0x201d: 0x94, // "
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02dc: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9a, // š
  0x203a: 0x9b, // ›
  0x0153: 0x9c, // œ
  0x017e: 0x9e, // ž
  0x0178: 0x9f, // Ÿ
};

// ─── Core Fix Logic ──────────────────────────────────────────────────────────

/**
 * One pass: reverse Win-1252 encoding on a string.
 * Each character ≤ 0xFF maps to itself as a byte.
 * Win-1252 special chars (> 0xFF but in the table) map to their Win-1252 byte.
 * Anything else is kept as-is (already correct Unicode).
 */
function fixOnePass(str) {
  const bytes = [];
  let i = 0;
  while (i < str.length) {
    const code = str.charCodeAt(i);
    if (code <= 0xff) {
      bytes.push(code);
      i++;
    } else {
      const mapped = WIN1252_UNICODE_TO_BYTE[code];
      if (mapped !== undefined) {
        bytes.push(mapped);
        i++;
      } else {
        // Already-correct high Unicode — re-encode as UTF-8 bytes
        const cp = str.codePointAt(i);
        const encoded = Buffer.from(String.fromCodePoint(cp), "utf8");
        for (const b of encoded) bytes.push(b);
        i += cp > 0xffff ? 2 : 1;
      }
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

/**
 * Quick detection: does the string contain typical Arabic mojibake?
 * Arabic in UTF-8 uses bytes 0xD8-0xDB followed by 0x80-0xBF.
 * When those bytes are read as Win-1252, 0xD8 → Ø (U+00D8) and 0xA7 → § (U+00A7).
 */
function hasMojibake(str) {
  // Ø followed by one of the common Arabic UTF-8 continuation byte characters
  return (
    str.includes("\u00D8\u00A7") || // Ø§ → ا
    str.includes("\u00D8\u00A8") || // Ø¨ → ب
    str.includes("\u00D8\u00A9") || // Ø© → ة
    str.includes("\u00D9\u0081") || // Ù → ف
    str.includes("\u00D8\u00B9") || // Ø¹ → ع
    str.includes("\u00D9\u0084") // Ù„ → ل
  );
}

/**
 * Apply fix passes until the string stabilises (handles double/triple encoding).
 * Returns { fixed, passes } where passes = 0 means no change needed.
 */
function fixMojibake(content) {
  let current = content;
  let passes = 0;

  while (passes < 5) {
    if (!hasMojibake(current)) break;
    const next = fixOnePass(current);
    if (next === current) break;
    current = next;
    passes++;
  }

  return { fixed: current, passes };
}

// ─── File Processing ─────────────────────────────────────────────────────────

function processFile(filePath) {
  const fileName = path.relative(TARGET_DIR, filePath);
  const raw = fs.readFileSync(filePath, "utf8");

  if (!hasMojibake(raw)) {
    if (VERBOSE) console.log(`  ✓  ${fileName}`);
    return { status: "ok" };
  }

  const { fixed, passes } = fixMojibake(raw);

  // Validate JSON
  try {
    JSON.parse(fixed);
  } catch (err) {
    console.error(`  ✗  ${fileName} — JSON invalid after fix: ${err.message}`);
    return { status: "error", reason: err.message };
  }

  const reduction = raw.length - fixed.length;
  if (DRY_RUN) {
    console.log(
      `  ●  ${fileName} — would fix (${passes} pass${passes !== 1 ? "es" : ""}, -${reduction} chars)`,
    );
    return { status: "would-fix" };
  }

  fs.writeFileSync(filePath, fixed, "utf8");
  console.log(
    `  ✔  ${fileName} — fixed (${passes} pass${passes !== 1 ? "es" : ""}, -${reduction} chars)`,
  );
  return { status: "fixed" };
}

function collectJsonFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push(full);
    }
  }
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log("=".repeat(60));
  console.log("  Arabic Encoding Fix (Mojibake Repair)");
  console.log("=".repeat(60));
  console.log(`  Directory : ${TARGET_DIR}`);
  console.log(
    `  Mode      : ${DRY_RUN ? "DRY RUN (no files written)" : "LIVE"}`,
  );
  console.log("=".repeat(60));

  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`\n  ERROR: Directory not found:\n  ${TARGET_DIR}\n`);
    console.error(
      "  Usage: node scripts/fix-ar-encoding.js [--dir <path>] [--dry-run] [--verbose]",
    );
    process.exit(1);
  }

  const files = collectJsonFiles(TARGET_DIR);
  const summary = { ok: 0, fixed: 0, wouldFix: 0, error: 0 };

  console.log(`\n  Scanning ${files.length} JSON file(s)...\n`);

  for (const f of files) {
    const result = processFile(f);
    if (result.status === "ok") summary.ok++;
    else if (result.status === "fixed") summary.fixed++;
    else if (result.status === "would-fix") summary.wouldFix++;
    else summary.error++;
  }

  console.log("\n" + "=".repeat(60));
  console.log("  Summary");
  console.log("=".repeat(60));
  if (DRY_RUN) {
    console.log(`  Would fix : ${summary.wouldFix}`);
  } else {
    console.log(`  Fixed     : ${summary.fixed}`);
  }
  console.log(`  Already OK: ${summary.ok}`);
  if (summary.error > 0) {
    console.log(`  Errors    : ${summary.error}  ← check output above`);
  }
  console.log("=".repeat(60) + "\n");

  if (summary.error > 0) process.exit(1);
}

main();
