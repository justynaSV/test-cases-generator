#!/usr/bin/env node
/**
 * validate.js — checks generated SVCloud test scenario CSV files against
 * the rules in style/style_guide.md.
 *
 * Usage:
 *   node scripts/validate.js test_cases/generated/TC_foo.csv
 *   node scripts/validate.js test_cases/generated/*.csv
 *   node scripts/validate.js --dir test_cases/generated
 *
 * Exit code is non-zero if any file has errors. Warnings don't affect it.
 * No npm dependencies — safe to run with just `node`.
 */

const fs = require("fs");
const path = require("path");

const EXPECTED_HEADER = [
  "Title",
  "Step",
  "Expected result",
  "Area Path",
  "Iteration Path",
  "QA Priority",
  "Assigned To",
  "Preconditions",
];
const DELIMITER = ";";
const EXPECTED_LAST_STEP = "End of test.";
const VALID_PRIORITIES = new Set(["Low", "Medium", "High"]);
const EXPECTED_AREA_PATH = "QA\\SVCloud";
const PLACEHOLDER_ASSIGNED_TO = "<tester email>";

/**
 * RFC4180-style CSV parser for a custom delimiter.
 *
 * Handles quoted fields, doubled "" as an escaped quote, and real newlines
 * inside quoted fields — the style guide's multi-line bullet cells rely on
 * that, and Azure DevOps imports them fine as long as the cell is quoted
 * correctly (open the CSV in Excel, then copy the rows into the Test Plans
 * grid; or use "Import test cases from CSV/XLSX").
 *
 * It also reports the malformed-quoting cases that make Azure's importer fail
 * with "Double-quote not enclosed in double-quotes": a bare " inside an
 * otherwise-unquoted cell, text after a closing quote, or a quoted cell that
 * is never closed. Returns { rows, errors }.
 */
function parseCSV(text, delimiter = DELIMITER) {
  const rows = [];
  const errors = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let fieldHasContent = false; // any char taken for the current field yet?
  let i = 0;
  const n = text.length;

  const lineAt = (idx) => {
    let ln = 1;
    for (let k = 0; k < idx && k < n; k++) if (text[k] === "\n") ln += 1;
    return ln;
  };

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
        const next = text[i + 1];
        if (next !== undefined && next !== delimiter && next !== "\r" && next !== "\n") {
          errors.push(
            `Line ${lineAt(i)}: text after a closing double-quote — a quoted cell ` +
              `must end at the quote; double any literal " as "".`
          );
        }
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      if (!fieldHasContent) {
        inQuotes = true;
        i += 1;
        continue;
      }
      errors.push(
        `Line ${lineAt(i)}: unescaped double-quote inside an unquoted cell — ` +
          `wrap the whole cell in "..." and double any literal " as "".`
      );
      field += ch;
      fieldHasContent = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      fieldHasContent = false;
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
      fieldHasContent = false;
      i += 1;
      continue;
    }
    field += ch;
    fieldHasContent = true;
    i += 1;
  }

  if (inQuotes) {
    errors.push(
      `Line ${lineAt(n)}: file ends inside a quoted cell — a closing double-quote is missing.`
    );
  }
  // flush trailing field/row if the file doesn't end with a newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // drop a fully-empty trailing row (common with trailing newline)
  if (rows.length && rows[rows.length - 1].every((c) => c === "")) {
    rows.pop();
  }
  return { rows, errors };
}

function padRow(row) {
  const out = row.slice(0, EXPECTED_HEADER.length);
  while (out.length < EXPECTED_HEADER.length) out.push("");
  return out;
}

function validateFile(filePath) {
  const report = { path: filePath, errors: [], warnings: [], scenarioCount: 0 };

  let rawText;
  try {
    rawText = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    report.errors.push(`Could not read file: ${err.message}`);
    return report;
  }

  const hadBom = rawText.charCodeAt(0) === 0xfeff;
  const text = hadBom ? rawText.slice(1) : rawText;
  const hasNonAscii = Array.from(text).some((c) => c.charCodeAt(0) > 127);
  if (!hadBom && hasNonAscii) {
    report.warnings.push(
      "File has no UTF-8 BOM and contains non-ASCII characters \u2014 Excel may " +
        "read it as Windows-1250 on double-click and mangle Polish diacritics. " +
        "Run `node scripts/fix-encoding.js` on it, or re-save with a BOM."
    );
  }

  const { rows, errors: parseErrors } = parseCSV(text);
  report.errors.push(...parseErrors);
  if (rows.length === 0) {
    report.errors.push("File is empty.");
    return report;
  }

  const header = rows[0];
  if (header.join(DELIMITER) !== EXPECTED_HEADER.join(DELIMITER)) {
    report.errors.push(
      `Header mismatch.\n    expected: ${EXPECTED_HEADER.join(DELIMITER)}\n` +
        `    found:    ${header.join(DELIMITER)}`
    );
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    report.errors.push("No data rows after header.");
    return report;
  }

  // Group rows into scenario blocks (a new block starts wherever Title is non-empty)
  const blocks = [];
  let current = null;
  for (const raw of dataRows) {
    const row = padRow(raw);
    if (row[0].trim()) {
      if (current) blocks.push(current);
      current = [row];
    } else {
      if (!current) {
        report.errors.push(
          `Found a Step row before any Title row: "${row[1]}"`
        );
        continue;
      }
      current.push(row);
    }
  }
  if (current) blocks.push(current);

  report.scenarioCount = blocks.length;
  const seenTitles = new Set();

  for (const block of blocks) {
    const [titleRow, ...stepRows] = block;
    const [title, step, expected, areaPath, iterationPath, priority, assignedTo] = titleRow;
    const trimmedTitle = title.trim();

    if (seenTitles.has(trimmedTitle)) {
      report.errors.push(`Duplicate scenario title: '${trimmedTitle}'`);
    }
    seenTitles.add(trimmedTitle);

    if (step.trim() || expected.trim()) {
      report.errors.push(`'${trimmedTitle}': Title row must have empty Step/Expected result.`);
    }
    if (!areaPath.trim()) {
      report.errors.push(`'${trimmedTitle}': missing Area Path.`);
    } else if (areaPath.trim() !== EXPECTED_AREA_PATH) {
      report.warnings.push(`'${trimmedTitle}': Area Path is '${areaPath.trim()}' (expected '${EXPECTED_AREA_PATH}').`);
    }
    if (!iterationPath.trim()) {
      report.errors.push(`'${trimmedTitle}': missing Iteration Path.`);
    }
    if (!priority.trim()) {
      report.errors.push(`'${trimmedTitle}': missing QA Priority.`);
    } else if (!VALID_PRIORITIES.has(priority.trim())) {
      report.errors.push(`'${trimmedTitle}': invalid QA Priority '${priority.trim()}' (expected Low/Medium/High).`);
    }
    if (!assignedTo.trim()) {
      report.errors.push(`'${trimmedTitle}': missing Assigned To.`);
    } else if (assignedTo.trim() === PLACEHOLDER_ASSIGNED_TO) {
      report.warnings.push(`'${trimmedTitle}': Assigned To is still the '${PLACEHOLDER_ASSIGNED_TO}' placeholder.`);
    }

    if (stepRows.length === 0) {
      report.errors.push(`'${trimmedTitle}': scenario has no Step rows.`);
      continue;
    }
    for (const sr of stepRows) {
      if (!sr[1].trim()) {
        report.errors.push(`'${trimmedTitle}': a Step row has an empty Step.`);
      }
    }
    const last = stepRows[stepRows.length - 1];
    if (last[1].trim() !== EXPECTED_LAST_STEP) {
      report.errors.push(`'${trimmedTitle}': last Step is '${last[1].trim()}', expected '${EXPECTED_LAST_STEP}'.`);
    }
    if (last[2].trim()) {
      report.errors.push(`'${trimmedTitle}': the '${EXPECTED_LAST_STEP}' row should have an empty Expected result.`);
    }
  }

  return report;
}

function printReport(report) {
  const status = report.errors.length === 0 ? "OK" : "FAIL";
  console.log(`\n[${status}] ${report.path} — ${report.scenarioCount} scenario(s)`);
  for (const e of report.errors) console.log(`  ERROR: ${e}`);
  for (const w of report.warnings) console.log(`  WARN:  ${w}`);
}

function main() {
  const args = process.argv.slice(2);
  let files = [];

  const dirIndex = args.indexOf("--dir");
  if (dirIndex !== -1) {
    const dir = args[dirIndex + 1];
    if (dir && fs.existsSync(dir)) {
      files.push(
        ...fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(".csv"))
          .map((f) => path.join(dir, f))
      );
    }
    args.splice(dirIndex, 2);
  }
  files.push(...args);

  if (files.length === 0) {
    console.error("No files given. Pass file paths or --dir <directory>.");
    process.exit(2);
  }

  let anyErrors = false;
  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.log(`\n[FAIL] ${f} — file not found`);
      anyErrors = true;
      continue;
    }
    const report = validateFile(f);
    printReport(report);
    if (report.errors.length > 0) anyErrors = true;
  }
  console.log();
  process.exit(anyErrors ? 1 : 0);
}

main();
