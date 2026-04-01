const fs = require("fs");
const path = require("path");

const base = "d:/Web/full-projects/daftar-v1/dafter-dashboard/messages";

function flat(o, p) {
  p = p || "";
  const r = {};
  for (const k of Object.keys(o)) {
    const fk = p ? p + "." + k : k;
    if (typeof o[k] === "object" && o[k] !== null) {
      Object.assign(r, flat(o[k], fk));
    } else {
      r[fk] = o[k];
    }
  }
  return r;
}

function compareFiles(name) {
  const arPath = base + "/ar/" + name;
  const enPath = base + "/en/" + name;
  if (!fs.existsSync(arPath) || !fs.existsSync(enPath)) {
    console.log("[SKIP] " + name + " - missing one side");
    return;
  }
  const ar = JSON.parse(fs.readFileSync(arPath, "utf8"));
  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const af = flat(ar);
  const ef = flat(en);

  const same = [];
  const missing = [];
  const onlyAscii = [];

  for (const k of Object.keys(ef)) {
    if (!(k in af)) {
      missing.push(k);
    } else if (af[k] === ef[k]) {
      same.push({ k, v: ef[k] });
    } else if (
      af[k] &&
      /^[A-Za-z0-9\s\.\,\!\?\:\;\-\_\(\)\{\}\[\]\/\\@#$%^&*+=<>|~`"'{}]+$/.test(
        af[k],
      )
    ) {
      onlyAscii.push({ k, v: af[k] });
    }
  }

  if (same.length || missing.length || onlyAscii.length) {
    console.log("\n=== " + name + " ===");
    if (same.length) {
      console.log("  UNTRANSLATED (same as EN):");
      for (const item of same)
        console.log("    " + item.k + " = " + JSON.stringify(item.v));
    }
    if (missing.length) {
      console.log("  MISSING IN AR:");
      for (const k of missing) console.log("    " + k);
    }
    if (onlyAscii.length) {
      console.log("  LIKELY STILL ENGLISH (ASCII only in AR):");
      for (const item of onlyAscii)
        console.log("    " + item.k + " = " + JSON.stringify(item.v));
    }
  } else {
    console.log(name + ": OK (all translated)");
  }
}

// Get all en/*.json files
const enFiles = fs.readdirSync(base + "/en").filter((f) => f.endsWith(".json"));
console.log("Files to check: " + enFiles.join(", "));
for (const f of enFiles) {
  compareFiles(f);
}
