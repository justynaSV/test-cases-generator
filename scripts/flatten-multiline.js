#!/usr/bin/env node
/**
 * flatten-multiline.js — legacy-conversion tool. The style guide now
 * requires single-line cells (multi-item checks joined with " | ") so new
 * generated CSVs don't need this step. Keep this around only for one-off
 * conversion of old/imported files that still have embedded newlines in
 * quoted cells (e.g. something authored by hand in Excel).
 *
 * Why this exists at all: Azure DevOps Test Plans doesn't handle embedded
 * newlines inside a cell — both the Excel-based CSV import ("Double-quote
 * not enclosed in double-quotes" error) and pasting rows into the Test Plan
 * grid (each embedded newline is treated as a new grid row, so the
 * continuation text lands in the wrong column) break on them. This is a
 * hard limitation of Azure's paste parser (confirmed: switching delimiter to
 * comma, and replacing newlines with a vertical-tab "soft break", both
 * failed to fix it) — true multi-line cells only work if typed directly in
 * the Azure grid or pushed in via the REST API.
 *
 * This script NEVER overwrites the source file. It writes a companion
 * "<name>.azure.csv" (or a custom --out path) next to it, with each
 * multi-line cell's bullets joined with " | " into a single physical line.
 *
 * Usage:
 *   node scripts/flatten-multiline.js some-legacy-file.csv
 *     -> writes some-legacy-file.azure.csv
 *   node scripts/flatten-multiline.js some-legacy-file.csv --out fixed.csv
 *   node scripts/flatten-multiline.js --dir some-directory
 *     -> writes a .azure.csv next to every .csv file in the directory
 */
const fs = require("fs");
const path = require("path");

const DELIMITER = ";";

function parseCSV(text, delimiter = DELIMITER) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length && rows[rows.length - 1].every((c) => c === "")) {
    rows.pop();
  }
  return rows;
}

function flattenField(field) {
  if (!field.includes("\n")) return field;
  const lines = field.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  return lines.map((l) => l.replace(/^-\s*/, "")).join(" | ");
}

function serializeField(field) {
  const needsQuoting = field.includes(DELIMITER) || field.includes('"') || field.includes("\n");
  if (!needsQuoting) return field;
  return `"${field.replace(/"/g, '""')}"`;
}

function defaultOutPath(filePath) {
  const ext = path.extname(filePath);
  const base = filePath.slice(0, -ext.length);
  return `${base}.azure${ext}`;
}

function flattenFile(filePath, outPath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCSV(text);
  const outRows = rows.map((row) => row.map(flattenField).map(serializeField).join(DELIMITER));
  const output = outRows.join("\r\n") + "\r\n";

  const target = outPath || defaultOutPath(filePath);
  fs.writeFileSync(target, output, "utf8");
  return { rows: rows.length, target };
}

function main() {
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf("--dir");
  const outIndex = args.indexOf("--out");
  const outPath = outIndex !== -1 ? args[outIndex + 1] : null;

  let files = [];
  if (dirIndex !== -1) {
    const dir = args[dirIndex + 1];
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".csv") && !f.endsWith(".azure.csv")).map((f) => path.join(dir, f));
  } else {
    files = args.filter((a) => !a.startsWith("--") && a !== outPath);
  }
  if (files.length === 0) {
    console.error("No files given. Pass a file path or --dir <directory>.");
    process.exit(2);
  }
  for (const f of files) {
    const { rows, target } = flattenFile(f, files.length === 1 ? outPath : null);
    console.log(`${f} -> ${target} (${rows} rows). Source file left untouched.`);
  }
}

main();
