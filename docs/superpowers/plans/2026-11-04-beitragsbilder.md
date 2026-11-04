# Drawn Post Images (Beitragsbilder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every news post shows a drawn SVG motif in house style "C · Vereinsblau" on its card and at the top of the article: 8 existing posts drawn now, new posts drawn automatically by Mail-to-Homepage.

**Architecture:** A dependency-free Node module `tools/mail-images/src/draw.js` owns the fixed SVG template, the allow-list sanitiser and the small text helpers (front matter, PR body). The 8 backfill motifs are hand-drawn `<g>` fragments rendered through that same module into `static/images/news/gezeichnet/`. In n8n, four new nodes sit between "Antwort verarbeiten" and "Termine laden": two Code nodes whose `jsCode` is `draw.js` plus a small glue file, an IF node and an HTTP Request node that calls the Anthropic Messages API. Hugo uses `image` only if the file exists.

**Tech Stack:** Hugo 0.166, plain Node ≥ 20 (`node --test`, no npm dependencies), n8n 2.x (Code, IF, HTTP Request nodes), Anthropic Messages API (`claude-sonnet-5-5`).

**Spec:** `docs/superpowers/specs/2026-11-04-beitragsbilder-design.md`
**Visual reference:** `.superpowers/brainstorm/30115-1793795875/content/bild-stil-v2.html`, variant C.

## Global Constraints

- SVG: `viewBox="0 0 510 200"`, background gradient `#153266` → `#0a1628`, court lines white opacity ≈ 0.12 stroke 2 in `x 60–450, y 25–175`, radial glow `#3a7bd5` at ≈ 0.45 → 0.
- Motif palette only: `#ffffff`, `#dceafb`, `#a8ccf5`, `#6ba3eb`, `#3a7bd5`, `#1e56a0` (plus `#0f2240` for dark accents). Tennis balls white with blue seams, never yellow.
- Motif inside safe area x 130–380. No text, letters, logos or faces.
- Template ids use the prefix `tpl-`. Motif ids get a per-post prefix.
- Allowed elements: `svg` (template only), `g, path, circle, ellipse, rect, line, polyline, polygon, linearGradient, radialGradient, stop, defs`. Everything else is removed. `href`/`xlink:href`, `on*`, `style` are removed. The only `url(...)` allowed is `url(#<local id>)`.
- Each final SVG is under 8192 bytes. Larger, empty or unbalanced output means no image.
- A drawing failure never fails the mail run. The post simply gets no image.
- Image path: `static/images/news/gezeichnet/<post-file-basename>.svg`, front matter `image: "/images/news/gezeichnet/<basename>.svg"`.
- The 3 posts with their own photo stay untouched: `2026-05-31-vereinsnews-kurz`, `2026-05-31-vorstandswechsel-2026`, `2026-08-11-meet-and-play`.
- Code and comments in English, no emojis. Commit per task on branch `feat/beitragsbilder` (the user approved commits for this plan's execution). Conventional Commits.
- The live n8n workflow is not touched by Claude. The user pastes the nodes listed in Task 6.

## Review Focus

1. **The model wraps its answer in prose or code fences** (```` ```svg ````, "Here is your motif: ..."). Expected: the outermost `<g>...</g>` is extracted and everything else ignored. Test in Task 1.
2. **Gradient id collisions between the template and the motif.** Expected: a motif using `id="glow"` still renders its own gradient, and the template keeps `tpl-`. Test in Task 1 (prefixing rewrites `id` and `url(#…)` consistently).
3. **The API call errors or times out** (HTTP node continues with `{error: …}`). Expected: no SVG, the post has no `image:` line, the PR body says "kein Bild", and the run still opens the PR. Test in Task 5 (glue dry-run).
4. **A mail with only Termine and no posts.** Expected: no API call is made, the flow still reaches "Termine laden", and the output is identical to today. Test in Task 5.
5. **The SVG is deleted in the PR while the `image:` line stays.** Expected: the card shows the category photo or title placeholder, the article shows no image, and nothing renders a broken icon. Checked in Task 3.

---

### Task 1: Template and sanitiser module

**Files:**
- Create: `tools/mail-images/package.json`. CommonJS, no dependencies, `"scripts": {"test": "node --test tests/"}`.
- Create: `tools/mail-images/src/draw.js`
- Test: `tools/mail-images/tests/draw.test.js`

`draw.js` must run unchanged inside an n8n Code node. That means no `require`, no `import`, and at the end the season.js pattern: `if (typeof module !== 'undefined') module.exports = {...}`.

**Interfaces:**
- Produces:
  - `extractMotif(text: string) -> string | null`: returns the outermost `<g …>…</g>`, ignoring prose and code fences. Returns null if there is none.
  - `sanitizeMotif(markup: string, idPrefix: string) -> string | null`:
    - keeps only the allow-listed elements and attributes;
    - prefixes every `id` and every `url(#x)` with `idPrefix + '-'`;
    - drops comments, CDATA and processing instructions;
    - returns null for empty input or unbalanced tags.
  - `wrapSvg(motif: string) -> string`: the full SVG. It contains the template defs `tpl-bg` and `tpl-glow`, the court lines and the glow, then the motif, and ends with `\n`.
  - `renderSvg(rawText: string, idPrefix: string) -> string | null`: chains extract, sanitize and wrap. Returns null if the result is ≥ 8192 bytes.
  - `imagePaths(postPath: string) -> {file: string, url: string}`
  - `addImageToFrontMatter(md: string, url: string) -> string`: inserts `image: "<url>"` before the closing `---` of the front matter. Unchanged if an `image:` line already exists.
  - `addPrRows(prBody: string, rows: string[]) -> string`: inserts table rows before the `\n---\n` footer.
  - `ALLOWED_ELEMENTS`, `ALLOWED_ATTRIBUTES` (arrays).

- [ ] **Step 1: Write the failing tests** in `tests/draw.test.js` (`node:test`, `assert/strict`). Each line below is one `test`.

  `extractMotif`:
  - Prose plus a ```` ```svg ```` fence around `<g><circle r="5"/></g>` returns exactly `<g><circle r="5"/></g>`.
  - Nested `<g>` inside an outer `<g>` returns the outer one.
  - `'no svg here'` returns `null`.

  `sanitizeMotif(x, 'p')`:
  - `<g><script>alert(1)</script><circle r="3"/></g>` contains no `script` and still contains `<circle r="3"/>`.
  - `<g onload="x()"><rect width="2" height="2"/></g>` contains no `onload`.
  - `<g><foreignObject><div/></foreignObject><image href="http://e/x.png"/></g>`: neither `foreignObject` nor `image` nor `href` survives.
  - `<g><path d="M0 0" style="fill:url(http://e)"/></g>`: `style` is removed.
  - `fill="url(http://evil/#a)"` is removed. `fill="url(#a)"` with `<defs><linearGradient id="a">` becomes `fill="url(#p-a)"` and `id="p-a"`.
  - Unclosed `<g><circle r="3">` returns `null`.
  - `''` and `'   '` return `null`.
  - `<!-- c --><g><![CDATA[x]]><circle r="1"/></g>` contains no `<!--` and no `CDATA`.

  `wrapSvg` / `renderSvg`:
  - `wrapSvg('<g/>')` starts with `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510 200"`, contains `#153266`, `#0a1628`, `id="tpl-bg"` and `id="tpl-glow"`, and ends with `</svg>\n`.
  - `renderSvg` returns `null` when the motif makes the output ≥ 8192 bytes (generate 400 circles).

  Text helpers:
  - `imagePaths('content/aktuelles/2026-11-04-foo.md')` returns `{file: 'static/images/news/gezeichnet/2026-11-04-foo.svg', url: '/images/news/gezeichnet/2026-11-04-foo.svg'}`.
  - `addImageToFrontMatter('---\ntitle: "A"\n---\n\nBody\n', '/x.svg')` returns `'---\ntitle: "A"\nimage: "/x.svg"\n---\n\nBody\n'`. A second call returns the same string.
  - `addPrRows('T\n| a |\n\n---\nfooter', ['| b |'])` returns `'T\n| a |\n| b |\n\n---\nfooter'`.

- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `cd tools/mail-images && npm test`
  Expected: FAIL, `Cannot find module '../src/draw.js'`.

- [ ] **Step 3: Implement `draw.js`.**
  - The sanitiser is string-based, with no DOM. Tokenise with one regex: `<\/?([a-zA-Z]+)([^>]*?)(\/?)>`.
  - Drop disallowed elements together with their content: anything between an open and close tag of a dropped element is skipped, tracked with a depth counter.
  - Check balance with a stack.
  - Parse attributes with `([a-zA-Z:-]+)\s*=\s*"([^"]*)"` and rebuild them, keeping only allow-listed names. Remove a value if it contains `url(` but does not fully match `^url\(#[A-Za-z0-9_-]+\)$`.
  - Allowed attributes: `id, d, cx, cy, r, rx, ry, fx, fy, x, y, x1, y1, x2, y2, width, height, points, fill, fill-opacity, fill-rule, stroke, stroke-width, stroke-linecap, stroke-linejoin, stroke-opacity, stroke-dasharray, opacity, transform, offset, stop-color, stop-opacity, gradientUnits, gradientTransform`.
  - Take the template markup from the variant C reference: the background `rect`, the court-lines `g` and the glow `ellipse`. Rename `gc` to `tpl-bg` and `glow` to `tpl-glow`.

- [ ] **Step 4: Run the tests and confirm they pass.**
  Run: `cd tools/mail-images && npm test`
  Expected: all tests pass, 0 fail.

- [ ] **Step 5: Commit.**
  `git add tools/mail-images && git commit -m "feat(mail-images): add SVG template and allow-list sanitiser"`

---

### Task 2: Backfill drawings for the 8 posts

**Files:**
- Create: `tools/mail-images/motifs/<basename>.g.svg`, 8 files, each holding one `<g>` fragment.
- Create: `tools/mail-images/scripts/render-motifs.js`. For every motif file it calls `renderSvg(content, basename-derived prefix)` and writes `static/images/news/gezeichnet/<basename>.svg`. It exits 1 if any result is null.
- Create: `static/images/news/gezeichnet/*.svg` (generated, committed).
- Test: `tools/mail-images/tests/motifs.test.js`

**Interfaces:**
- Consumes: `renderSvg`, `ALLOWED_ELEMENTS` from Task 1.
- Produces: 8 SVG files. Three motif files are also used as prompt examples in Task 4: `2026-09-13-rewe-scheine-fuer-vereine`, `2026-08-21-schleifchenturnier-details`, `2026-04-27-platzoeffnung-2026`.

Basenames and motif ideas (from the spec, refine freely within the house style):

| Basename | Motif |
|---|---|
| `2026-08-21-schleifchenturnier-details` | racket with ribbon bow, balls |
| `2026-09-13-rewe-scheine-fuer-vereine` | shopping cart with balls and coupons (take it from variant C, with balls and coupons lifted via `translate(0,-18)` as in `bild-stil-v2.html`) |
| `2026-09-13-saisonfazit-sommer-2026` | podium or scoreboard with balls |
| `2026-03-23-mixed-teams-2026-aufruf` | two crossed rackets, two balls |
| `2026-04-06-platzinstandhaltung-sommer-2026` | drag mat or rake and watering can |
| `2026-04-14-korrektur-jahreshauptversammlung-2026` | lectern or table with chairs and a document |
| `2026-04-27-platzoeffnung-2026` | opened gate or net, sun |
| `fruehling-2026-ausblick` | snowflake turning into sun, ball |

- [ ] **Step 1: Write the failing test** `motifs.test.js`, test `every backfill post has a rendered, clean SVG`. For each of the 8 basenames, read `static/images/news/gezeichnet/<b>.svg` and assert:
  - the file exists;
  - its size is under 8192 bytes;
  - it contains no `<text`, `script` or `href`;
  - it contains `id="tpl-bg"`;
  - every colour literal is in the palette list from Global Constraints or is one of the template colours `#153266`, `#0a1628`. Check with a regex for `#[0-9a-fA-F]{3,6}`; `#fff` and `#ffffff` both count as white.

- [ ] **Step 2: Run it and confirm it fails.**
  Run: `cd tools/mail-images && npm test`
  Expected: FAIL, ENOENT on the first SVG.

- [ ] **Step 3: Draw the 8 motif fragments and write `render-motifs.js`, then run it.**
  Run: `node tools/mail-images/scripts/render-motifs.js`
  Expected: `8 written`.

- [ ] **Step 4: Look at them before the test.** Write a scratch HTML page in the brainstorm `content/` dir that shows all 8 as 510×200 tiles, plus each one cropped to the first-card height. Expected: every motif is recognisable at card size, sits inside the safe area, and has no text.

- [ ] **Step 5: Run the tests and confirm they pass.**
  Run: `cd tools/mail-images && npm test`
  Expected: all tests pass.

- [ ] **Step 6: Commit.**
  `git add tools/mail-images static/images/news/gezeichnet && git commit -m "feat(news): draw images for 8 existing posts"`

---

### Task 3: Wire images into posts and Hugo fallback

**Files:**
- Modify: `layouts/partials/news-card-image.html`. Use `.Params.image` only when `fileExists (printf "static%s" .)`. Otherwise fall through to the category, then the placeholder. Update the header comment.
- Modify: `layouts/aktuelles/single.html:23-27`. The same `fileExists` guard around `.article-detail-image`.
- Modify: the 8 posts in `content/aktuelles/`. Add `image: "/images/news/gezeichnet/<basename>.svg"` to the front matter and keep `category`.
- Create: `tests/build/bilder-check.sh <builddir>`, in the same style as `april-check.sh`.

**Interfaces:**
- Consumes: the 8 SVG files from Task 2.

- [ ] **Step 1: Write `bilder-check.sh` (failing).** For each of the 8 basenames:
  - `<builddir>/aktuelles/<basename>/index.html` contains `/images/news/gezeichnet/<basename>.svg`;
  - `<builddir>/aktuelles/index.html` contains it too.

  For the 3 photo posts, their own photo path is still in their article page. The script prints PASS or FAIL per check and exits non-zero on any FAIL.

- [ ] **Step 2: Run it and confirm it fails.**
  Run: `hugo -d /tmp/bb-build --quiet && bash tests/build/bilder-check.sh /tmp/bb-build`
  Expected: FAIL on the 8 image checks. The 3 photo checks pass.

- [ ] **Step 3: Add the 8 `image:` lines and the two `fileExists` guards.**

- [ ] **Step 4: Run the build check and confirm it passes.**
  Run: same command as Step 2.
  Expected: all PASS.

- [ ] **Step 5: Check the fallback (Review Focus 5).**
  Run:
  ```bash
  mv static/images/news/gezeichnet/2026-04-27-platzoeffnung-2026.svg /tmp/
  hugo -d /tmp/bb-fb --quiet
  grep -c 'gezeichnet/2026-04-27' /tmp/bb-fb/aktuelles/2026-04-27-platzoeffnung-2026/index.html /tmp/bb-fb/aktuelles/index.html
  grep -c 'category-platz.jpg' /tmp/bb-fb/aktuelles/index.html
  mv /tmp/2026-04-27-platzoeffnung-2026.svg static/images/news/gezeichnet/
  ```
  Expected:
  - both files report 0 for `gezeichnet/2026-04-27`;
  - `category-platz.jpg` count ≥ 1;
  - the SVG is restored afterwards (`git status` is clean for it).

- [ ] **Step 6: Visual check with Playwright** on `hugo server`, using the `fetch('/css/main.css',{cache:'reload'})` trick. Take screenshots of `/` (news section), `/aktuelles/` and one article at 390 px and at 1280 px. Expected:
  - SVGs are visible on the cards and at the top of the article;
  - the motif is not cut off on the first, taller card;
  - no horizontal scroll (`scrollWidth === innerWidth`).

- [ ] **Step 7: Commit.**
  `git add layouts content/aktuelles tests/build/bilder-check.sh && git commit -m "feat(news): show drawn images on cards and articles with missing-file fallback"`

---

### Task 4: Draw prompt and request builder

**Files:**
- Create: `doc/specs/n8n-mail-to-homepage-draw-prompt.md`. The whole file is the system prompt, in English:
  - it is a role statement;
  - it lists the house-style rules from Global Constraints (coordinate space, safe area, palette, no text, flat shapes, at most ~40 elements);
  - it says: output only one `<g>` element, no prose.
- Modify: `tools/mail-images/src/draw.js`. Add `buildDrawRequest`.
- Test: `tools/mail-images/tests/draw.test.js` (extend).

**Interfaces:**
- Produces:
  - `buildDrawRequest(post: {title, description, body}, systemPrompt: string, examples: string[]) -> object`. Returns an Anthropic Messages API body:
    - `model: 'claude-sonnet-5-5'`
    - `max_tokens: 4000`
    - `system`: systemPrompt plus the examples, each wrapped in `<example>…</example>`
    - `messages: [{role: 'user', content: 'Title: …\nDescription: …\n\n<body, truncated to 3000 chars>'}]`
  - `DRAW_MODEL = 'claude-sonnet-5-5'`.

- [ ] **Step 1: Write the failing tests.**
  - The request has `model === 'claude-sonnet-5-5'`.
  - `system` contains the prompt and two `<example>` blocks when given two examples.
  - The user content contains the title and description.
  - A 10 000-char body ends up ≤ 3000 chars of body in the content.

- [ ] **Step 2: Run them and confirm they fail.**
  Run: `cd tools/mail-images && npm test`
  Expected: FAIL, `buildDrawRequest is not a function`.

- [ ] **Step 3: Implement it and write the prompt file.**

- [ ] **Step 4: Run the tests and confirm they pass.**
  Run: `cd tools/mail-images && npm test`
  Expected: all pass.

- [ ] **Step 5: Live smoke test (optional, needs `ANTHROPIC_API_KEY` in env).**
  Run: a scratch script that sends `buildDrawRequest` for the Saisonfazit post to the API and pipes the text through `renderSvg`.
  Expected: a non-null SVG that looks in house style when opened. If no key is available, record it in the ledger and skip.

- [ ] **Step 6: Commit.**
  `git add doc/specs/n8n-mail-to-homepage-draw-prompt.md tools/mail-images && git commit -m "feat(mail-images): add draw prompt and request builder"`

---

### Task 5: n8n glue and workflow JSON

**Files:**
- Create: `tools/mail-images/src/n8n-auftraege.js`, the glue for Code node **"Bild-Auftraege"**.
  - It reads `$('Antwort verarbeiten').first().json`.
  - For each `files[i]` whose path starts with `content/aktuelles/` it emits one item `{postPath, idPrefix, request: buildDrawRequest(...)}`. The body is parsed from the file content after the front matter.
  - If there are none, it emits `[{json: {skip: true}}]`.
- Create: `tools/mail-images/src/n8n-einfuegen.js`, the glue for Code node **"Bilder einfuegen"**.
  - It reads `$('Antwort verarbeiten').first().json` as `parsed`.
  - Unless the first input is `skip`, it pairs `$input.all()[i]` with `$('Bild-Auftraege').all()[i]` and calls `renderSvg($json.content?.[0]?.text ?? '', idPrefix)`.
  - On success it:
    - pushes `{path: file, content: svg, type: 'bild', title}` to `files`;
    - patches the post's content with `addImageToFrontMatter`;
    - adds the row `| bild | \`<file>\` | <title> |`.
  - On failure it adds the row `| bild | – | <title> (kein Bild, Platzhalter) |`.
  - It returns `{json: {...parsed, files, prBody}}`.
- Create: `tools/mail-images/scripts/sync-n8n.js`.
  - It sets each Code node's `jsCode` = `draw.js` + `\n` + the glue file, with the prompt file text and the 3 example motifs inlined as JSON string constants (`SYSTEM_PROMPT`, `EXAMPLES`) in the auftraege glue.
  - It ensures the new nodes and connections exist in `doc/specs/n8n-mail-to-homepage.json`, idempotently:
    - **"Bild-Auftraege"** (Code), position [1190, 220].
    - **"Bild noetig?"** (IF v2.2): `{{ $json.skip }}` is not true. True goes to "Bild zeichnen", false goes to "Bilder einfuegen".
    - **"Bild zeichnen"** (HTTP Request 4.2), configured as:
      - POST `https://api.anthropic.com/v1/messages`
      - authentication: predefinedCredentialType `anthropicApi`, credential `{id: "bfPeI9Ato8OfI8mv", name: "Anthropic account"}`
      - header `anthropic-version: 2023-06-01`
      - JSON body `={{ JSON.stringify($json.request) }}`
      - timeout 120000
      - `retryOnFail: true`, `maxTries: 2`
      - `onError: "continueRegularOutput"`
    - **"Bilder einfuegen"** (Code).
    - Rewire: Antwort verarbeiten → Bild-Auftraege → Bild noetig? → (Bild zeichnen →) Bilder einfuegen → Termine laden.
    - In "Termine zusammenfuehren", replace `$('Antwort verarbeiten').first().json` with `$('Bilder einfuegen').first().json`. This is the one line the spec now names.
- Test: `tools/mail-images/tests/n8n-glue.test.js`

**Interfaces:**
- Consumes: Task 1 helpers, Task 4 `buildDrawRequest`, prompt file, 3 example motifs from Task 2.
- Produces: the node names above, used verbatim in the Task 6 hand-over.

- [ ] **Step 1: Write the failing dry-run tests.** Build the exact `jsCode` strings via an exported `buildJsCode(nodeName)` from `sync-n8n.js`. Run them with `new Function('$', '$input', code)` against stubs. The Antwort-verarbeiten fixture has one beitrag file, one quickinfo file and no termine. The tests:
  - **Auftraege, 2 posts**: returns 2 items with `idPrefix` values that differ, and `request.model === 'claude-sonnet-5-5'`.
  - **Auftraege, termine only (`files: []`)**: returns exactly `[{json: {skip: true}}]`. (Review Focus 4)
  - **Einfuegen, success**: with responses `{content: [{text: '<g><circle r="9" fill="#fff"/></g>'}]}`, `files` has 4 entries. Both posts contain `image: "/images/news/gezeichnet/…svg"`. `prBody` has 2 `| bild |` rows before the footer.
  - **Einfuegen, API error**: if one response is `{error: {message: 'timeout'}}`, that post has no `image:` line and no SVG file, the row says `kein Bild`, and the other post still gets its image. (Review Focus 3)
  - **Einfuegen, skip**: the input `{skip: true}` returns the `parsed` object unchanged. (Review Focus 4)
  - **Workflow JSON**: after `sync-n8n.js` has run, the JSON:
    - has nodes "Bild-Auftraege", "Bild noetig?", "Bild zeichnen" and "Bilder einfuegen";
    - has "Antwort verarbeiten" connecting only to "Bild-Auftraege" and "Bilder einfuegen" connecting to "Termine laden";
    - has "Termine zusammenfuehren" jsCode containing `$('Bilder einfuegen')` and not `$('Antwort verarbeiten')`;
    - stays unchanged when `sync-n8n.js` runs a second time.

- [ ] **Step 2: Run them and confirm they fail.**
  Run: `cd tools/mail-images && npm test`
  Expected: FAIL, module `../scripts/sync-n8n.js` not found.

- [ ] **Step 3: Implement the glue files and `sync-n8n.js`, then run it.**
  Run: `node tools/mail-images/scripts/sync-n8n.js`
  Expected: `updated doc/specs/n8n-mail-to-homepage.json`. `python3 -m json.tool` on the file succeeds.

- [ ] **Step 4: Run the tests and confirm they pass.**
  Run: `cd tools/mail-images && npm test`
  Expected: all pass. Also re-run `node --test tests/js/` (season tests) to confirm they are still green.

- [ ] **Step 5: Commit.**
  `git add tools/mail-images doc/specs/n8n-mail-to-homepage.json && git commit -m "feat(mail-to-homepage): draw post images with Claude Sonnet"`

---

### Task 6: Hand-over for n8n and spec sync

**Files:**
- Modify: `doc/specs/2026-03-23-mail-to-homepage-workflow.md`. Add a short section "Beitragsbilder" in German that covers:
  - the node chain;
  - the model;
  - the failure behaviour;
  - "Code ändern → `node tools/mail-images/scripts/sync-n8n.js` → jsCode in n8n neu einfügen".
- Modify: `CLAUDE.md`, Automation bullet for Mail-to-Homepage. Add one sentence pointing to `tools/mail-images/` and the sync script, analogous to the nuliga-sync note.

- [ ] **Step 1: Final verification run.** Run:
  ```bash
  (cd tools/mail-images && npm test) && node --test tests/js/ \
  && hugo -d /tmp/bb-final --quiet \
  && bash tests/build/bilder-check.sh /tmp/bb-final \
  && bash tests/build/april-check.sh /tmp/bb-final
  ```
  Expected: everything passes.

- [ ] **Step 2: Write the doc and CLAUDE.md lines, then commit.**
  `git commit -m "docs(mail-to-homepage): document drawn post images"`

- [ ] **Step 3: Prepare the paste-in for the user** (in chat, not a file). This is the exact list of n8n changes:
  1. Insert 4 new nodes: "Bild-Auftraege", "Bild noetig?", "Bild zeichnen", "Bilder einfuegen". Copy them from the repo JSON, one node at a time onto the canvas, via the clipboard.
  2. In "Bild zeichnen", select the existing Anthropic credential. If the HTTP node does not offer it, fall back to Header Auth with `x-api-key`.
  3. Rewire: remove "Antwort verarbeiten → Termine laden". Add "Antwort verarbeiten → Bild-Auftraege" and "Bilder einfuegen → Termine laden".
  4. In "Termine zusammenfuehren", change one line: `$('Antwort verarbeiten')` → `$('Bilder einfuegen')`.
  5. Test with a test mail. Expected result: a Draft-PR with the SVG under `static/images/news/gezeichnet/`, the `image:` line in the post, and a `bild` row in the PR body.
