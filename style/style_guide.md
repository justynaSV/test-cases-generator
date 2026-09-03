# SVCloud Test Scenario Style Guide

This is the single source of truth for how SVCloud test scenarios are written.
Both `/generate-test-case` slash-commands — `.github/prompts/generate-test-case.prompt.md`
(Copilot) and `.claude/commands/generate-test-case.md` (Claude Code) — point
here, and `scripts/validate.js` enforces it. If you change a rule, change it
only in this file (and update `scripts/validate.js` if it's a structural one).

## File format
CSV, semicolon-delimited. Columns:
Title;Step;Expected result;Area Path;Iteration Path;QA Priority;Assigned To;Preconditions

A cell may span multiple lines (see Step format). Any cell that contains a
newline, a `;`, or a `"` MUST be wrapped in double quotes, and every literal
`"` inside it doubled (`""`). A malformed quote is what makes Azure's import
fail with "Double-quote not enclosed in double-quotes" — `scripts/validate.js`
checks for it.

Encoding: UTF-8 **with a BOM** (the file starts with the U+FEFF byte-order
mark). Without it, double-clicking the CSV opens it in Excel as Windows-1250 on
a Polish machine and every diacritic is mangled (ś → Ĺ›), and that mojibake
then rides along into Azure. `scripts/validate.js` warns on a BOM-less file
with non-ASCII content; `scripts/fix-encoding.js` re-writes a file with the BOM.

## Getting the file into Azure DevOps
The generated CSV keeps multi-line cells and Polish characters only through
these paths:
- **Double-click the `.csv`** (it opens in Excel), then copy the rows and paste
  into the Test Plans grid. Requires the BOM (see Encoding above).
- **Test Plans → "Import test cases from CSV/XLSX"** — upload the file directly.

Do NOT: paste raw CSV *text* into the grid (splits every line into its own
row), and do NOT use Excel's *Data → From Text/CSV* import wizard (it drops
multi-line cell content into the Title column).

## Row structure
- Row 1: Title + metadata filled, Step/Expected Result EMPTY.
- Subsequent rows: Title EMPTY, Step + Expected Result filled.
- Last row: Step = "End of test.", Expected Result empty.

## Title format
"[Module] - [feature/page] ([qualifier if applicable])"
Layout tests always suffixed "(page layout)".
Filter tests suffixed "(single filter)" / "(single filter - grid)" / "(single filter - columns)" / "(multiple filters)".

## Step format
- Imperative, second-person implied: "Click", "Go to:", "Fill in field '...'", "Verify..."
- Multi-item checks go in ONE cell as a quoted multi-line bullet list (real
  newlines, whole cell wrapped in double quotes):
  "Verify X:
  - item 1
  - item 2"
- Reuse of other scenarios via placeholder: "[LINK]" or "<link>" instead of repeating steps.
- Always end with literal step: "End of test."

## Expected result format
- Short and declarative: "Field is filled in.", "It displays correctly.", "The list is filtered correctly."
- Exact UI copy quoted verbatim (preserve language, e.g. Polish error strings) in single quotes.
- State/color checks as a quoted multi-line bullet list:
  "Verify X:
  - colour: ...
  - title (after hovering over): ..."

## Coverage pattern per feature
1. Page layout scenario (verify all UI elements exist) — ALWAYS FIRST.
2. Happy path (add/create).
3. Edit scenario.
4. Delete scenario.
5. Single-filter/search/sort scenario (repeated once per column, each column = one "Verify searching/sorting by X" step).
6. Multiple-filter scenario (combine 2-3 filters).
7. Negative/validation scenario (empty/invalid data → mandatory field errors).
8. Cross-application/state-transition scenarios where relevant (e.g. status colour logic, cross-module sync).

Only generate the coverage types that actually apply to the feature (e.g. skip
Edit/Delete for a read-only screen).

## Metadata defaults
Area Path: QA\SVCloud
Iteration Path: QA\SVCloud\<Module>
QA Priority: Medium (unless specified otherwise)
Assigned To: this is per-tester, not a constant. If you don't know who it's
  for, leave the literal placeholder `<tester email>` and fill it in before
  importing to Azure DevOps.
Preconditions: plain text, can be multi-line ("User is logged in\n<Page> is loaded").
  If it spans lines, wrap the cell in double quotes like any other multi-line cell.

## Vocabulary
- "Verify if..." / "Verify that..." for UI state checks
- "It displays correctly." as generic positive layout result
- Polish UI labels always in single quotes, kept in original language
- English used for step descriptions/instructions
