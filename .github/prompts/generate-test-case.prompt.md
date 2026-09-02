---
description: 'Generate SVCloud test case scenarios in the established CSV style'
name: 'generate-test-case'
argument-hint: '<feature/module description or a file reference — or leave blank and answer the intake questions>'
agent: 'agent'
---
Generate SVCloud test case scenarios for the following feature:

${input:feature:Describe the feature, paste a user story, or reference a file (e.g. #file:spec.md). You can also leave this blank and answer the intake questions.}

Follow the CSV format and every rule in [style/style_guide.md](../../style/style_guide.md)
exactly — title format, row structure, step/expected-result phrasing, coverage
order, and metadata defaults.

Use the files in [style/examples](../../style/examples) purely as a style
reference (imitate their conventions — row structure, step/expected phrasing,
title format, coverage order — but don't copy their business content):
- [TC_authorization.csv](../../style/examples/TC_authorization.csv) — login/roles, negative cases, cross-view
- [TC_bodyshop.csv](../../style/examples/TC_bodyshop.csv) — largest sample: layout, filters (grid/columns), multi-line bullet cells, document flows
- [TC_carwash.csv](../../style/examples/TC_carwash.csv) — calendar/booking screen
- [TC_fleet.csv](../../style/examples/TC_fleet.csv) — dealer fleet: extensive single-filter-per-column coverage
- [TEMPLATE_example.csv](../../style/examples/TEMPLATE_example.csv) — minimal format skeleton

## Step 1 — Intake (do this before writing anything)

Read whatever the user already provided above (and any `#file:` they
referenced).

**Screenshots are the fastest way to hand over UI labels, but they usually
can't be attached to the `/generate-test-case` invocation itself — prompt-file
requests are text-only.** So, as your very first move, before any other
question, tell the user:

> If you have screenshots or mockups of this screen, paste them in your next
> reply and I'll read the labels, columns and buttons straight off them.
> Otherwise just answer the questions and we'll do it by text.

When images do arrive on a later turn, read the UI text off them — buttons,
field labels, column headers, menu items, section titles, visible error/toast
text — and use that to fill items 4–8 below instead of asking. Transcribe
Polish strings exactly as shown, including diacritics and casing. Only ask
about labels that aren't legible or aren't shown (hover tooltips, states not
currently on screen, error text that only appears after an action).

Then work through the checklist below. **Ask the user for every item you still
can't answer — one topic per message, in this order. Don't dump the whole list
at once, and don't start generating until the "Required" block is filled.** It's
fine to ask for a screenshot as the answer to a question ("can you paste a
screenshot of the filter bar?").

**Required — blocking, ask until you have each:**
1. **Module** — becomes `Iteration Path` = `QA\SVCloud\<Module>` and the title
   prefix. Never guess it; ask.
2. **Screen / feature name** — exactly as it appears in the app.
3. **Screen type** — list with filters / add-edit form / read-only dashboard /
   wizard / something else. This decides which coverage types apply.

**Quality — ask once each; if the user skips or says "you decide", note it as an
assumption (see Step 2.4) and carry on:**
4. **Menu path** to reach the screen (e.g. `Konfiguracja → Kalendarz → Ikony zdarzeń`).
5. **UI labels, verbatim in Polish** — buttons, fields, columns, menu items,
   section headers. The style guide requires UI copy quoted verbatim in the
   original language; you cannot invent these. **A screenshot is the easiest
   answer here** — offer that option. Otherwise push for the real strings.
6. **Fields** — name, type (text / dropdown / checkbox / date…), mandatory?,
   and valid vs. invalid example values.
7. **Filterable / sortable columns** — each becomes one "Verify searching/sorting
   by X" step in the single-filter scenario.
8. **Exact error messages** (Polish) and the condition that triggers each — for
   the negative / validation scenario.
9. **Access / role rules** — who can see or use the screen.
10. **State / colour logic or cross-module effects** — e.g. "status turns red
    when overdue", "saving here updates the Blacharnia list" → cross-application
    scenarios.
11. **QA Priority** if not Medium; **tester email** for `Assigned To` (else leave
    the literal `<tester email>` placeholder).

When the checklist is done, echo back a one-line summary
(`Module: … | Screen: … | Type: … | Coverage I'll generate: …`) and let the
user correct it before you generate.

## Step 2 — Generate

1. Decide which coverage types from the style guide's coverage pattern actually
   apply (page layout, happy path, edit, delete, single-filter, multiple-filter,
   negative/validation, cross-application) — skip types that don't apply, e.g.
   skip Edit/Delete for a read-only screen.
2. Write one scenario per applicable coverage type, following the style guide's
   row structure and phrasing rules precisely. Page layout scenario always first.
3. Use the collected UI labels verbatim, in Polish, in single quotes — whether
   they came from the user's text or were read off an attached screenshot. If a
   label was only partly legible in an image, mark it as an assumption (step 4)
   rather than guessing the spelling.
4. If you still had to assume anything the user didn't confirm, list it as short
   bullets BEFORE the CSV — don't silently guess.
5. Output the scenarios as a single semicolon-delimited CSV block.
6. Save the result to `test_cases/generated/TC_<feature_or_module>.csv`
   (confirm the filename with the user if it isn't obvious).
7. Run `node scripts/validate.js test_cases/generated/TC_<feature_or_module>.csv`
   and fix anything it flags before considering the task done.
