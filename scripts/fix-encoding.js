#!/usr/bin/env node
/**
 * fix-encoding.js — converts a CSV (or any text file) to real UTF-8 with a BOM.
 *
 * Polish exports from Excel/Azure DevOps are very often saved as
 * Windows-1250 (or occasionally ISO-8859-2), not UTF-8. If you open one of
 * those in a tool that assumes UTF-8, every Polish diacritic (ą ć ę ł ń ó
 * ś ź ż) turns into "�" (U+FFFD, the Unicode replacement character) — that
 * exact symptom is what this script fixes.
 *
 * It does NOT just relabel the file — it re-decodes the original bytes
 * using the correct source encoding and writes out genuine UTF-8 bytes,
 * prefixed with a UTF-8 BOM. The BOM matters: when you double-click a CSV,
 * Excel on a Polish Windows reads a BOM-less UTF-8 file as Windows-1250 and
 * mangles every diacritic (ś -> Ĺ›, ń -> Ĺ„, ...) — and that mojibake then
 * carries through when you paste the rows into the Azure Test Plans grid.
 *
 * Usage:
 *   node scripts/fix-encoding.js style/examples/TC_foo.csv
 *     -> auto-detects source encoding, writes UTF-8 back to the same file
 *        (keeps a .bak backup of the original)
 *
 *   node scripts/fix-encoding.js style/examples/TC_foo.csv --out fixed.csv
 *     -> writes to a new file instead of overwriting
 *
 *   node scripts/fix-encoding.js style/examples/TC_foo.csv --encoding windows-1250
 *     -> skip auto-detection, force a specific source encoding
 *        (other useful values: iso-8859-2, cp852)
 *
 *   node scripts/fix-encoding.js --dir style/examples
 *     -> fix every .csv file in a directory (in place, with .bak backups)
 */
const fs = require("fs");
const path = require("path");

const CANDIDATE_ENCODINGS = ["utf-8", "windows-1250", "iso-8859-2", "cp852"];

function decodesCleanly(buf, encoding) {
  try {
    const text = new TextDecoder(encoding, { fatal: encoding === "utf-8" }).decode(buf);
    return { ok: !text.includes("\uFFFD"), text };
  } catch {
    return { ok: false, text: null };
  }
}

function detectEncoding(buf) {
  for (const enc of CANDIDATE_ENCODINGS) {
    const { ok, text } = decodesCleanly(buf, enc);
    if (ok) return { encoding: enc, text };
  }
  // Fall back to utf-8 non-fatal decode (best effort) so we still produce output
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  return { encoding: "utf-8 (forced, may still have errors)", text };
}

function fixFile(filePath, { forcedEncoding, outPath } = {}) {
  const buf = fs.readFileSync(filePath);

  let encoding, text;
  if (forcedEncoding) {
    encoding = forcedEncoding;
    text = new TextDecoder(forcedEncoding).decode(buf);
  } else {
    const detected = detectEncoding(buf);
    encoding = detected.encoding;
    text = detected.text;
  }

  const target = outPath || filePath;
  if (!outPath) {
    const backup = `${filePath}.bak`;
    if (!fs.existsSync(backup)) fs.copyFileSync(filePath, backup);
  }
  // Write UTF-8 with a BOM so Excel double-click opens it as UTF-8, not
  // Windows-1250. Strip any existing BOM first so this stays idempotent.
  const BOM = "﻿";
  const withBom = BOM + text.replace(/^﻿/, "");
  fs.writeFileSync(target, withBom, "utf8");

  return { filePath, target, detectedEncoding: encoding };
}

function main() {
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf("--dir");
  const encIndex = args.indexOf("--encoding");
  const outIndex = args.indexOf("--out");

  const forcedEncoding = encIndex !== -1 ? args[encIndex + 1] : null;
  const outPath = outIndex !== -1 ? args[outIndex + 1] : null;

  let files = [];
  if (dirIndex !== -1) {
    const dir = args[dirIndex + 1];
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".csv")).map((f) => path.join(dir, f));
  } else {
    files = args.filter((a) => !a.startsWith("--") && a !== forcedEncoding && a !== outPath);
  }

  if (files.length === 0) {
    console.error("No files given. Pass a file path or --dir <directory>.");
    process.exit(2);
  }

  for (const f of files) {
    const result = fixFile(f, { forcedEncoding, outPath: files.length === 1 ? outPath : null });
    console.log(`${result.filePath} -> ${result.target}  [detected: ${result.detectedEncoding}]`);
  }

  if (!outPath) {
    console.log("\nOriginal file(s) backed up with a .bak extension next to each.");
  }
}

main();
