// Diagnostic script to understand the mojibake issue
const fs = require("fs");
const path = require("path");
const dir = "d:/Web/full-projects/daftar-v1/dafter-dashboard/messages/ar";

const files = [
  "platform-management.json",
  "invoices.json",
  "payments.json",
  "reports.json",
];

files.forEach((f) => {
  console.log("\n=== " + f + " ===");
  const fp = path.join(dir, f);

  // Read raw bytes
  const rawBytes = fs.readFileSync(fp);

  // Try the fix: read as latin1, decode as utf8
  const rawStr = rawBytes.toString("utf8");

  // Check for C1 control characters in the string (U+0080 to U+009F)
  let c1Count = 0;
  let highCount = 0;
  let maxChar = 0;
  for (let i = 0; i < rawStr.length; i++) {
    const code = rawStr.charCodeAt(i);
    if (code >= 0x80 && code <= 0x9f) c1Count++;
    if (code > 0xff) highCount++;
    if (code > maxChar) maxChar = code;
  }
  console.log("  C1 control chars (0x80-0x9F): " + c1Count);
  console.log("  Chars > 0xFF: " + highCount);
  console.log(
    "  Max char code: " +
      maxChar +
      " (U+" +
      maxChar.toString(16).padStart(4, "0").toUpperCase() +
      ")",
  );

  // Try fix method 1: read bytes as latin1 and decode as utf8
  try {
    const method1 = rawBytes.toString("latin1");
    // Now treat each char as a byte
    const fixedBuf = Buffer.from(method1, "latin1");
    const fixedStr = fixedBuf.toString("utf8");
    JSON.parse(fixedStr);
    console.log("  Method 1 (readFile latin1 → decode utf8): VALID JSON");
  } catch (e) {
    console.log("  Method 1 FAILED: " + e.message.substring(0, 100));
  }

  // Try fix method 2: interpret file bytes directly
  // The file bytes should already be the double-encoded sequence
  // We need to decode: file bytes as UTF-8 → get chars → each char < 256 is a byte → decode those bytes as UTF-8
  try {
    // Read bytes as latin1
    const asLatin1 = rawBytes.toString("latin1");
    // Each char is in range 0-255 (since latin1 decoding)
    const bytes = Buffer.alloc(asLatin1.length);
    for (let i = 0; i < asLatin1.length; i++) {
      bytes[i] = asLatin1.charCodeAt(i);
    }
    const utf8str = bytes.toString("utf8");
    JSON.parse(utf8str);
    console.log("  Method 2 (byte-by-byte latin1): VALID JSON");
    // Save first 200 chars for inspection
    console.log("  Preview: " + utf8str.substring(0, 200));
  } catch (e) {
    console.log("  Method 2 FAILED: " + e.message.substring(0, 100));
  }

  // Check if file has characters > 0xFF that would indicate some strings are ALREADY correct Unicode
  if (highCount > 0) {
    console.log(
      "  NOTE: File has " +
        highCount +
        " chars > U+00FF — mixed content (some already-correct Arabic)",
    );

    // Show context around first high char
    for (let i = 0; i < rawStr.length; i++) {
      if (rawStr.charCodeAt(i) > 0xff) {
        const start = Math.max(0, i - 20);
        const end = Math.min(rawStr.length, i + 20);
        console.log(
          "  First U+0100+ at pos " +
            i +
            ': "' +
            rawStr.substring(start, end).replace(/[\x00-\x1F]/g, "?") +
            '"',
        );
        break;
      }
    }
  }
});

console.log("\nDone.");
