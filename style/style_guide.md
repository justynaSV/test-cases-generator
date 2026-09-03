# SVCloud Test Scenario Style Guide

This is the single source of truth for how SVCloud test scenarios are written.
Both the Copilot slash-command (`.github/prompts/generate-test-case.prompt.md`)
and the browser tool (`web/index.html`) point here — if you change a rule,
change it only in this file.

## File format
CSV, semicolon-delimited. Columns:
Title;Step;Expected result;Area Path;Iteration Path;QA Priority;Assigned To;Preconditions

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
- Every cell is a single physical line (no embedded line breaks — Azure DevOps'
  CSV import and Test Plans grid paste both break on raw newlines inside a
  cell). Multi-item checks go in ONE cell as a single line, items joined with
  " | ": "Verify X: | item 1 | item 2"
- Reuse of other scenarios via placeholder: "[LINK]" or "<link>" instead of repeating steps.
- Always end with literal step: "End of test."

## Expected result format
- Short and declarative: "Field is filled in.", "It displays correctly.", "The list is filtered correctly."
- Exact UI copy quoted verbatim (preserve language, e.g. Polish error strings) in single quotes.
- State/color checks as a single line, items joined with " | ":
  "Verify X: | colour: ... | title (after hovering over): ..."

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
Preconditions: plain text, single line; join multiple items with " | " if needed
  ("User is logged in | <Page> is loaded")

## Vocabulary
- "Verify if..." / "Verify that..." for UI state checks
- "It displays correctly." as generic positive layout result
- Polish UI labels always in single quotes, kept in original language
- English used for step descriptions/instructions
