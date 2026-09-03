#!/usr/bin/env node
/**
 * flatten-multiline.js — fallback tool for ONE situation only: you have to
 * paste raw CSV *text* straight into the Azure Test Plans grid. That path
 * treats every newline as a new grid row, so a multi-line cell lands in the
 * wrong column. This script collapses each multi-line cell onto a single
 * physical line, its items joined with " | ".
 *
 * You almost never need this. The normal way to get the generated CSV into
 * Azure keeps true multi-line cells intact:
 *   - open the .csv in Excel, then copy the rows and paste into the grid
 *     (Excel↔grid paste preserves in-cell line breaks), or
 *   - Test Plans → "Import test cases from CSV/XLSX" (its parser handles
 *     newlines inside double-quoted cells).
 * The "Double-quote not enclosed in double-quotes" error some imports throw
 * is a CSV *quoting* bug (an unescaped " inside a cell), not a line-break
 * limitation — `scripts/validate.js` now catches that class of error.
 *
 * This script NEVER overwrites the source file. It writes a companion
 * "<name>.azure.csv" (or a custom --out path) next to it.
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
