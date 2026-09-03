# SVCloud Test Case Generator

Generates SVCloud test case scenarios in the established style, directly as
Azure DevOps-import-ready CSV. No JSON schema, no conversion scripts — the
LLM writes the CSV, a small validator checks it, done.

Same slash-command, two agents — use whichever you have:

| | Use it via | Needs |
|---|---|---|
| **Option A** | GitHub Copilot Chat in VS Code — `/generate-test-case` | VS Code, Copilot |
| **Option B** | Claude Code — `/generate-test-case` | Claude Code |

Both run the same interview → generate → validate flow, read the same
[`style/style_guide.md`](style/style_guide.md) and [`style/examples/`](style/examples/),
write to `test_cases/generated/`, and finish by running `scripts/validate.js`.
It all happens in the chat — nothing to copy out and paste back.

**New here? [`HOWTO.md`](HOWTO.md) is the full step-by-step** — generate, check,
and import into Azure DevOps without mangling the multi-line cells or the
Polish characters.

## Option A — VS Code Copilot slash-command

1. Open this repo in VS Code with GitHub Copilot Chat.
2. In the Chat view, type `/generate-test-case`. You can describe the feature
   up front (or reference a file), e.g.:

   ```
   /generate-test-case admin screen for configuring calendar event icon
   visibility and priority, module Konfiguracja, see #file:some-spec.md
   ```

   …or just run `/generate-test-case` with nothing after it — it will
   **interview you step by step** for what it needs (module, screen, screen
   type, then UI labels, fields, filter columns, error messages, roles, etc.),
   one topic at a time, and won't start generating until the essentials are in.

   **Screenshots instead of typing every label:** don't staple the image to
   the `/generate-test-case` line itself — prompt-file invocations are
   text-only and the image won't be seen. Instead run the command, let the
   interview start, and **paste the screenshot into your reply when it asks**
   (it prompts you for this up front). From a normal chat turn Copilot reads
   the Polish UI text straight off the image and only asks about what isn't
   visible — tooltips, post-action errors, states not on screen.
3. Before generating, Copilot echoes back a one-line summary
   (`Module: … | Screen: … | Type: … | Coverage: …`) for you to confirm or
   correct.
4. It reads [`style/style_guide.md`](style/style_guide.md) and the examples in
   [`style/examples/`](style/examples/), generates the scenarios, saves them to
   `test_cases/generated/TC_<name>.csv`, and runs the validator on the result.
5. Review the file, fix anything flagged, commit it.

The prompt file itself lives at
[`.github/prompts/generate-test-case.prompt.md`](.github/prompts/generate-test-case.prompt.md)
if you want to tweak how it behaves.

## Option B — Claude Code slash-command

1. Open this repo in Claude Code.
2. Type `/generate-test-case`. Describe the feature after it (or give a file
   path), or run it bare and answer the interview:

   ```
   /generate-test-case admin screen for calendar event icon visibility and
   priority, module Konfiguracja, spec in docs/icons.md
   ```

   It **interviews you one topic at a time** — module, screen, screen type,
   then UI labels, fields, filter columns, error messages, roles — and won't
   start generating until the essentials are in.
3. **Screenshots instead of typing labels:** it asks up front. Paste a
   screenshot into your reply and it reads the Polish UI text straight off the
   image, only asking about what isn't visible (tooltips, post-action errors).
4. It echoes back a one-line summary for you to confirm, then writes
   `test_cases/generated/TC_<name>.csv`, runs `node scripts/validate.js` on it,
   and shows you the result.
5. Review the file, fix anything flagged, commit it.

The command lives at
[`.claude/commands/generate-test-case.md`](.claude/commands/generate-test-case.md).
It's a mirror of the Copilot prompt-file — both point at the same style guide
and examples, so they stay in sync on format automatically.

## Repo layout

```
.github/
  prompts/generate-test-case.prompt.md   # the Copilot slash-command
  workflows/validate.yml                 # CI: validates any CSV added to test_cases/generated/
.claude/
  commands/generate-test-case.md         # the Claude Code slash-command (mirror of the above)
style/
  style_guide.md                         # single source of truth for the format/rules
  examples/                              # curated real scenarios — add your own here
test_cases/
  generated/                             # output lands here
scripts/
  validate.js                            # the validator (used by CI and both slash-commands)
  fix-encoding.js                        # re-save a CSV as UTF-8 + BOM (Excel encoding fixes)
  flatten-multiline.js                   # fallback: collapse multi-line cells for raw grid paste
HOWTO.md                                 # end-to-end walkthrough: generate → check → import
```

## Adding your own reference examples

Drop your best, most representative CSVs into `style/examples/`. More
curated examples = closer style matching.

Currently there:

| File | Covers |
|---|---|
| `TC_authorization.csv` | login/roles, negative cases, cross-view |
| `TC_bodyshop.csv` | largest sample — layout, filters (grid/columns), multi-line bullet cells, document flows |
| `TC_carwash.csv` | calendar/booking screen |
| `TC_fleet.csv` | dealer fleet — extensive single-filter-per-column coverage |
| `TEMPLATE_example.csv` | minimal format skeleton — keep as-is, it's the placeholder |

Add more real scenarios alongside these. They're used purely as a style
reference, so keep them passing `npm run validate` (CI doesn't check
`style/examples/`, but a broken example teaches the generator bad habits).
The example lists in `.github/prompts/generate-test-case.prompt.md` and
`.claude/commands/generate-test-case.md` should be kept in sync when you add or
remove one.

## Importing to Azure DevOps

Full walkthrough with the click-by-click steps and a troubleshooting table:
[`HOWTO.md`](HOWTO.md). In short — double-click the `.csv` to open it in Excel,
copy the rows, paste into the Test Plans **Grid** view (or upload the file via
**Import test cases from CSV/XLSX**). Do **not** paste raw CSV text into the
grid, use Excel's *Data → From Text* wizard, or open a BOM-less file in Excel —
each of those breaks either the multi-line cells or the Polish characters.
Generated files carry a UTF-8 BOM; `node scripts/fix-encoding.js <file>` adds
one back if a file loses it, and `npm run validate` warns when it's missing.

## Validating manually

```bash
node scripts/validate.js test_cases/generated/TC_something.csv
# or validate everything:
npm run validate
```

No npm install needed — the validator has zero dependencies.

## CI

`.github/workflows/validate.yml` runs the same validator automatically on
any pull request or push that touches `test_cases/generated/**.csv`, so a
scenario with a formatting mistake fails the check before it's merged.

## Changing the style rules

Edit only [`style/style_guide.md`](style/style_guide.md) — both slash-commands
read it directly at runtime, and `scripts/validate.js` was written from it, so
there's one place to change, not several to keep in sync. (If you change a
*structural* rule — like the header columns or the "End of test." row — you'll
also need to update the checks in `scripts/validate.js`.)
