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
2. In the Chat view, type `/generate-test-case` and describe the feature
   (or reference a file), e.g.:

   ```
   /generate-test-case admin screen for configuring calendar event icon
   visibility and priority, module Konfiguracja, see #file:some-spec.md
   ```

3. Copilot reads [`style/style_guide.md`](style/style_guide.md) and the
   examples in [`style/examples/`](style/examples/), generates the
   scenarios, saves them to `test_cases/generated/TC_<name>.csv`, and runs
   the validator on the result.
4. Review the file, fix anything flagged, commit it.

The prompt file itself lives at
[`.github/prompts/generate-test-case.prompt.md`](.github/prompts/generate-test-case.prompt.md)
if you want to tweak how it behaves.

## Option B — Browser tool (no VS Code needed)

1. Open [`web/index.html`](web/index.html) directly in a browser (double-click
   it, or host it — e.g. via GitHub Pages).
2. **Step 1:** describe the feature, optionally paste 1–2 of your own example
   CSVs for a closer style match, then **Build prompt** and **Copy to
   clipboard**.
3. Paste that prompt into Copilot Chat (web), Claude, ChatGPT, or whatever
   you have access to.
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
curated examples = closer style matching. The one currently there
(`TEMPLATE_example.csv`) is a minimal placeholder demonstrating the format —
replace or supplement it with your real scenarios.

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
