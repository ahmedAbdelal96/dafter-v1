const fs = require("fs");
const path = require("path");
const dir = "d:/Web/full-projects/daftar-v1/dafter-dashboard/messages/ar";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

const garbled = [];
const ok = [];

files.forEach((f) => {
  const content = fs.readFileSync(path.join(dir, f), "utf8");
  // Detect mojibake: Arabic UTF-8 2-byte sequences decoded as Latin-1 appear as Ø followed by § or similar
  // U+00D8 = 0xC3 0x98 in UTF-8, U+00A7 = 0xC2 0xA7 in UTF-8
  // Common mojibake patterns from Arabic:
  const hasGarbled =
    content.includes("\u00D8\u00A7") || // Ø§ = ا
    content.includes("\u00D8\u00A8") || // Ø¨ = ب
    content.includes("\u00D9\u0081") || // Ù = ف
    content.includes("\u00D8\u00A9"); // Ø© = ة
  if (hasGarbled) {
    garbled.push(f);
  } else {
    ok.push(f);
  }
});

console.log("=== GARBLED FILES ===");
garbled.forEach((f) => console.log("  " + f));
console.log("\n=== OK FILES ===");
ok.forEach((f) => console.log("  " + f));
console.log("\nTotal garbled: " + garbled.length + ", Total OK: " + ok.length);

// Apply fix to all garbled files
console.log("\n=== APPLYING FIXES ===");
garbled.forEach((f) => {
  const fp = path.join(dir, f);
  const raw = fs.readFileSync(fp, "utf8");
  const fixed = Buffer.from(raw, "latin1").toString("utf8");

  // Validate JSON before writing
  try {
    JSON.parse(fixed);
    fs.writeFileSync(fp, fixed, "utf8");
    console.log("Fixed: " + f);
  } catch (e) {
    console.log("ERROR parsing " + f + ": " + e.message);
  }
});

console.log("\nDone.");
