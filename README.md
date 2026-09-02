# SVCloud Test Case Generator

Generates SVCloud test case scenarios in the established style, directly as
Azure DevOps-import-ready CSV. No JSON schema, no conversion scripts — the
LLM writes the CSV, a small validator checks it, done.

Two ways to use it:

| | Use it via | Needs |
|---|---|---|
| **Preferred** | VS Code + GitHub Copilot Chat, `/generate-test-case` slash-command | VS Code, Copilot |
| **Fallback** | `web/index.html`, open directly in any browser | Nothing — no server, no install |

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

## Option B — Browser tool (no VS Code needed)

1. Open [`web/index.html`](web/index.html) directly in a browser (double-click
   it, or host it — e.g. via GitHub Pages).
2. **Step 1:** fill in the intake form — *Required:* module, screen name,
   screen type; *Details* (all optional but each improves the output): menu
   path, verbatim Polish UI labels, fields, filter columns, error messages,
   roles, colour/cross-module logic, plus a free-text box and space to paste
   1–2 of your own example CSVs. Then **Build prompt** and **Copy to
   clipboard**. The assembled prompt tells the LLM to ask you for any missing
   Polish label rather than invent one.

   Tick **"I'll attach screenshot(s)"** if you'd rather not type out every
   label — the built prompt then instructs the LLM to read them off the images.
3. Paste that prompt into Copilot Chat (web), Claude, ChatGPT, or whatever
   you have access to. **If you ticked the screenshot box, attach the
   screenshot(s) in that same message** — the tool can't embed images, the
   chat LLM reads them directly.
4. **Step 2:** paste the CSV it gives you back into the second box, hit
   **Validate**, fix anything flagged, then **Download as .csv** and add it
   to `test_cases/generated/`.

Everything runs client-side — the style guide is embedded in the page, so it
works even opened from disk with no internet connection.

## Repo layout

```
.github/
  prompts/generate-test-case.prompt.md   # the Copilot slash-command
  workflows/validate.yml                 # CI: validates any CSV added to test_cases/generated/
style/
  style_guide.md                         # single source of truth for the format/rules
  examples/                              # curated real scenarios — add your own here
test_cases/
  generated/                             # output lands here
web/
  index.html                             # single-file browser fallback tool
scripts/
  validate.js                            # the validator (used by CI, Copilot, and the browser tool)
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
The slash-command's example list in
`.github/prompts/generate-test-case.prompt.md` should be kept in sync when
you add or remove one.

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

Edit only [`style/style_guide.md`](style/style_guide.md) — the slash-command,
`scripts/validate.js`, and `web/index.html` all either read it directly or
were written from it, so there's one place to change, not several to keep in
sync. (If you change a *structural* rule — like the header columns or the
"End of test." row — you'll also need to update the checks in
`scripts/validate.js` and the matching logic embedded in `web/index.html`.)
