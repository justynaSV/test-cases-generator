# How to generate test cases and get them into Azure DevOps

A step-by-step walkthrough. For the format rules themselves see
[`style/style_guide.md`](style/style_guide.md); for repo layout see the
[README](README.md).

---

## Step 1 — Generate the CSV

Use whichever agent you have. Both run the same interview and produce the same
file.

### In VS Code (GitHub Copilot Chat)

1. Open this repo in VS Code with Copilot Chat.
2. In the Chat view, type `/generate-test-case`. Either describe the feature on
   the same line, or just send it bare and answer the questions.
3. It asks for screenshots first — if you have a mockup or a screen capture,
   paste it into your **next reply** and it reads the Polish UI labels straight
   off the image. Otherwise answer by text.
4. It works through a checklist one topic at a time: **module**, **screen
   name**, **screen type**, then UI labels, fields, filter columns, error
   messages, roles. It won't start writing until the required items are in.
5. It echoes a one-line summary. Check it, correct anything, confirm.

### In Claude Code

Same as above — type `/generate-test-case` in the Claude Code prompt.

### What you get

A file at `test_cases/generated/TC_<name>.csv`:

- semicolon-delimited, columns
  `Title;Step;Expected result;Area Path;Iteration Path;QA Priority;Assigned To;Preconditions`
- one row per test step; the first row of each scenario carries the title and
  metadata, the rest carry steps
- multi-item checks are single cells with real line breaks and `-` bullets,
  wrapped in double quotes
- saved as UTF-8 **with a BOM** (needed for Excel — see Step 3)

---

## Step 2 — Check it validates

The command runs the validator itself and shows you the result. To re-run it
yourself:

```bash
node scripts/validate.js test_cases/generated/TC_<name>.csv
# or check everything:
npm run validate
```

- `[OK]` — good to import.
- `ERROR:` — must be fixed before importing. Ask the agent to fix it, or edit
  the CSV and re-run.
- `WARN:` — won't block the import but worth a look (e.g. `Assigned To` still
  the `<tester email>` placeholder, or a missing BOM).

No `npm install` is needed — the validator has no dependencies.

---

## Step 3 — Import into Azure DevOps

The scenarios use **multi-line cells** and **Polish text**. Only the paths
below keep both intact.

### Path A — via Excel (the reliable one)

1. **Double-click** `TC_<name>.csv` in File Explorer so it opens in Excel.
   Do **not** use Excel's *Data → From Text/CSV* import — that one drops the
   bullet lines into the wrong column.
2. Check the Polish characters look right (`wiadomości`, not `wiadomoĹ›ci`). If
   they're mangled, the file lost its BOM — see Troubleshooting, then reopen.
3. Select the data rows (not the header), **Ctrl+C**.
4. In Azure DevOps: **Test Plans → your test plan → your test suite**, switch
   to the **Grid** view.
5. Click the first cell of an empty row and **Ctrl+V**. Check the columns line
   up — `Title` under Title, `Step` under Step Action, `Expected result` under
   Step Expected Result.
6. **Save** the grid.

### Path B — upload the file to Azure directly

**Test Plans → your test plan → your test suite → "Import test cases from
CSV/XLSX"**, then pick the file. The wizard lets you map columns to Azure
fields — map `Step` → *Step Action* and `Expected result` → *Step Expected
Result*. This skips Excel entirely, so there's no encoding step to worry about.

### Do not

- **Paste raw CSV text into the grid** — every line break becomes its own grid
  row and the continuation text lands under Title.
- **Use Excel's Data-import wizard** — same symptom.
- **Open a BOM-less file in Excel** — Polish diacritics get mangled on a Polish
  Windows and the mojibake carries through to Azure.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `wiadomoĹ›ci`, `DomyĹ›lna`, `USUĹ` in Excel or Azure | File opened as Windows-1250 because it has no UTF-8 BOM | `node scripts/fix-encoding.js test_cases/generated/TC_<name>.csv` (keeps a `.bak`), then reopen by double-click |
| Bullet lines show up as new rows / under the Title column | Pasted raw text, or used Excel's Data-import wizard | Use Path A exactly — double-click open, then copy rows from the Excel sheet |
| `<br>` shows as literal text in a step | An old file from when `<br>` was tried as a separator | Regenerate, or replace `<br>` with real line breaks |
| Import fails: *"Double-quote not enclosed in double-quotes"* | A cell with a `"`, `;`, or line break isn't quoted correctly | Re-run `npm run validate` — it now reports the exact line; fix the quoting |
| Rows misaligned after paste into the grid | Started the paste on the wrong column | Click the first editable cell of the row before pasting |

---

## Adding a new reference example

If you write a particularly good scenario, drop a copy in `style/examples/`
so future generations match it more closely. Keep it passing `npm run validate`,
and add a one-line entry for it in both `.github/prompts/generate-test-case.prompt.md`
and `.claude/commands/generate-test-case.md`.
