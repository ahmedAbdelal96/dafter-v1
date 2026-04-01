/**
 * Fix Windows-1252 mojibake in Arabic JSON translation files.
 *
 * The mojibake happened when Arabic UTF-8 bytes were mistakenly interpreted
 * as Windows-1252 characters, then re-saved as UTF-8.
 * Fix: map each character back to its Win-1252 byte, then decode those bytes as UTF-8.
 */

const fs = require("fs");
const path = require("path");

// Windows-1252 special characters (bytes 0x80-0x9F that differ from Latin-1)
// Maps Unicode code point -> byte value
const WIN1252_UNICODE_TO_BYTE = {
  0x20ac: 0x80, // € U+20AC
  0x201a: 0x82, // ‚ U+201A
  0x0192: 0x83, // ƒ U+0192
  0x201e: 0x84, // „ U+201E
  0x2026: 0x85, // … U+2026
  0x2020: 0x86, // † U+2020
  0x2021: 0x87, // ‡ U+2021
  0x02c6: 0x88, // ˆ U+02C6
  0x2030: 0x89, // ‰ U+2030
  0x0160: 0x8a, // Š U+0160
  0x2039: 0x8b, // ‹ U+2039
  0x0152: 0x8c, // Œ U+0152
  0x017d: 0x8e, // Ž U+017D
  0x2018: 0x91, // ' U+2018
  0x2019: 0x92, // ' U+2019
  0x201c: 0x93, // " U+201C
  0x201d: 0x94, // " U+201D
  0x2022: 0x95, // • U+2022
  0x2013: 0x96, // – U+2013
  0x2014: 0x97, // — U+2014
  0x02dc: 0x98, // ˜ U+02DC
  0x2122: 0x99, // ™ U+2122
  0x0161: 0x9a, // š U+0161
  0x203a: 0x9b, // › U+203A
  0x0153: 0x9c, // œ U+0153
  0x017e: 0x9e, // ž U+017E
  0x0178: 0x9f, // Ÿ U+0178
};

/**
 * Given a string that resulted from reading a Windows-1252-mojibake UTF-8 file,
 * recover the original UTF-8 text.
 *
 * Steps:
 * 1. For each character, map it back to its Windows-1252 byte value
 * 2. Collect those bytes
 * 3. Decode those bytes as UTF-8
 * 4. Any characters that can't be mapped (already correct high Unicode) are kept as UTF-8
 */
function fixWin1252Mojibake(str) {
  const bytes = [];
  let i = 0;
  while (i < str.length) {
    const code = str.charCodeAt(i);

    if (code <= 0x7f) {
      // ASCII: same byte value
      bytes.push(code);
      i++;
    } else if (code <= 0xff) {
      // Latin-1 range: byte value equals code point
      bytes.push(code);
      i++;
    } else {
      // Above Latin-1: check Win-1252 special mapping
      const mappedByte = WIN1252_UNICODE_TO_BYTE[code];
      if (mappedByte !== undefined) {
        bytes.push(mappedByte);
        i++;
      } else {
        // Not a Win-1252 special char — this character is already correct Unicode
        // Keep it as UTF-8
        const cp = str.codePointAt(i);
        const encoded = Buffer.from(String.fromCodePoint(cp), "utf8");
        for (const b of encoded) bytes.push(b);
        i += cp > 0xffff ? 2 : 1; // Surrogate pairs for codepoints > 0xFFFF
      }
    }
  }

  return Buffer.from(bytes).toString("utf8");
}

// Files to fix
const dir = "d:/Web/full-projects/daftar-v1/dafter-dashboard/messages/ar";
const filesToFix = [
  "platform-management.json",
  "invoices.json",
  "payments.json",
  "reports.json",
];

filesToFix.forEach((f) => {
  const fp = path.join(dir, f);
  console.log("\n=== Processing: " + f + " ===");

  const raw = fs.readFileSync(fp, "utf8");
  const fixed = fixWin1252Mojibake(raw);

  // Validate JSON
  try {
    const parsed = JSON.parse(fixed);
    console.log("  JSON valid: YES");

    // Show a sample of the fixed content
    const sample = fixed.substring(0, 300).replace(/[\x00-\x1F\x7F]/g, "?");
    console.log("  Sample preview:\n" + sample);

    // Check if fix actually changed anything
    if (raw === fixed) {
      console.log("  No changes needed (already correct)");
    } else {
      const changes = raw.length - fixed.length;
      console.log("  Content changed! Length diff: " + changes + " chars");
      fs.writeFileSync(fp, fixed, "utf8");
      console.log("  File SAVED");
    }
  } catch (e) {
    console.log("  JSON INVALID after fix: " + e.message);
    console.log("  File NOT saved");

    // Show problematic area
    const errPos = parseInt(e.message.match(/position (\d+)/)?.[1] || "0");
    if (errPos > 0) {
      const context = fixed.substring(Math.max(0, errPos - 30), errPos + 30);
      console.log(
        "  Context at error pos " +
          errPos +
          ': "' +
          context.replace(/[\x00-\x1F\x7F]/g, "?") +
          '"',
      );
    }
  }
});

console.log("\nAll done.");
