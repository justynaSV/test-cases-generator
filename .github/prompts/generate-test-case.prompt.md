---
description: 'Generate SVCloud test case scenarios in the established CSV style'
name: 'generate-test-case'
argument-hint: '<feature/module description, user story, or a file reference>'
agent: 'agent'
---
Generate SVCloud test case scenarios for the following feature:

${input:feature:Describe the feature, paste a user story, or reference a file in this workspace (e.g. #file:some-spec.md)}

Follow the CSV format and every rule in [style/style_guide.md](../../style/style_guide.md)
exactly — title format, row structure, step/expected-result phrasing, coverage
order, and metadata defaults.

Use the file(s) in [style/examples](../../style/examples) purely as a style
reference (imitate their conventions, don't copy their business content):
- [TEMPLATE_example.csv](../../style/examples/TEMPLATE_example.csv)

## What to do

1. Decide which coverage types from the style guide's coverage pattern
   actually apply to this feature (page layout, happy path, edit, delete,
   single-filter, multiple-filter, negative/validation, cross-application) —
   skip types that don't apply, e.g. skip Edit/Delete for a read-only screen.
2. Write one scenario per applicable coverage type, following the style
   guide's row structure and phrasing rules precisely.
3. If a module name isn't obvious from the feature description, ask before
   generating rather than guessing the Iteration Path.
4. If you have to assume something the feature description doesn't state,
   say so as a short bullet BEFORE the CSV, don't silently guess.
5. Output the scenarios as a single semicolon-delimited CSV block.
6. Save the result to `test_cases/generated/TC_<feature_or_module>.csv`
   (ask me to confirm the filename if it isn't obvious).
7. Run `node scripts/validate.js test_cases/generated/TC_<feature_or_module>.csv`
   and fix anything it flags before considering the task done.
