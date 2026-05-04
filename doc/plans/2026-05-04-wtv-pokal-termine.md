# WTV Pokal Termine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 2 WTV Pokal home matches as a new `pokal` category on the TC-BW-Attendorn homepage, with own filter, badge, and color, while keeping the existing nuliga-sync untouched.

**Architecture:** Pure content + style change. Hugo static site. Two new YAML entries in `content/termine/_index.md`, one new CSS color triple + 2 selectors, one legend entry on the homepage partial, one legend + filter-button + badge-label refactor on the Termine list page.

**Tech Stack:** Hugo 0.161+, plain CSS (no preprocessor), Go-template syntax.

**Reference Spec:** `doc/specs/2026-05-04-wtv-pokal-termine.md`

**Verification approach:** This is a static site without unit tests. Each task ends with `hugo --minify` (build must succeed, no warnings about templates/data) and a visual smoke check via `hugo server`. The "tests" are build-passing + visual-correct.

---

## File Map

| File | Change |
|---|---|
| `static/css/main.css` | Add 3 orange variables in `:root`, 2 new selectors (`data-category="pokal"`, `.termin-badge-pokal`) |
| `layouts/partials/termine.html` | Add 1 legend entry (orange dot + "Pokal") |
| `layouts/termine/list.html` | Add 1 legend entry, 1 filter button, refactor badge if/else into dict lookup |
| `content/termine/_index.md` | Insert 2 new events with `category: "pokal"` (chronologically before existing 09.05. entry) |

No changes to: `tools/nuliga-sync/`, `content/mannschaften/*`, `layouts/index.html`, n8n bundles.

---

## Task 1: CSS — Orange Color Variables and Pokal Selectors

**Files:**
- Modify: `static/css/main.css` (`:root` block lines 4–34, plus 2 new rules in the termin-item / termin-badge area around lines 868–901)

- [ ] **Step 1: Add orange CSS variables to `:root`**

In `static/css/main.css`, find the line containing `--green-600: #059669;` and add three lines immediately after it (before `--radius:`):

```css
      --orange-500: #f97316;
      --orange-600: #ea580c;
      --orange-50:  #fff7ed;
```

Result (excerpt):
```css
      --green-500: #10b981;
      --green-600: #059669;
      --orange-500: #f97316;
      --orange-600: #ea580c;
      --orange-50:  #fff7ed;
      --radius: 12px;
```

- [ ] **Step 2: Add data-category selector for pokal**

Find the existing block:
```css
    .termin-item[data-category="event"]::before {
      background: var(--green-500);
    }
```

Add immediately after it:
```css
    .termin-item[data-category="pokal"]::before {
      background: var(--orange-500);
    }
```

- [ ] **Step 3: Add badge style for pokal**

Find the existing block:
```css
    .termin-badge-event {
      background: rgba(16, 185, 129, 0.1);
      color: var(--green-600);
    }
```

Add immediately after it:
```css
    .termin-badge-pokal {
      background: var(--orange-50);
      color: var(--orange-600);
    }
```

- [ ] **Step 4: Verify Hugo build passes**

Run: `hugo --minify --quiet`
Expected: exit code 0, no output. (Hugo doesn't lint CSS, but a syntax error in main.css that breaks the asset pipeline would surface as a build error if CSS were piped through `resources.Get`. Here CSS is in `static/`, copied verbatim, so this mostly proves no other regressions.)

- [ ] **Step 5: Commit**

```bash
git add static/css/main.css
git commit -m "$(cat <<'EOF'
feat(css): add orange color tokens and pokal termin styles

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Homepage Partial — Legend Entry

**Files:**
- Modify: `layouts/partials/termine.html` (legend block at lines 19–28)

- [ ] **Step 1: Add Pokal legend entry**

In `layouts/partials/termine.html`, find:
```html
      <div class="termine-legend-item">
        <div class="termine-legend-dot" style="background: var(--green-500);"></div>
        <span>Vereinsevent</span>
      </div>
    </div>
```

Replace with:
```html
      <div class="termine-legend-item">
        <div class="termine-legend-dot" style="background: var(--green-500);"></div>
        <span>Vereinsevent</span>
      </div>
      <div class="termine-legend-item">
        <div class="termine-legend-dot" style="background: var(--orange-500);"></div>
        <span>Pokal</span>
      </div>
    </div>
```

- [ ] **Step 2: Verify Hugo build passes**

Run: `hugo --minify --quiet`
Expected: exit code 0, no template errors.

- [ ] **Step 3: Commit**

```bash
git add layouts/partials/termine.html
git commit -m "$(cat <<'EOF'
feat(termine): add Pokal entry to homepage legend

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Termine List Page — Legend, Filter, Badge Dict

**Files:**
- Modify: `layouts/termine/list.html` (legend lines 10–19, filter buttons lines 21–25, badge logic lines 41–43)

- [ ] **Step 1: Add Pokal to legend**

Find:
```html
      <div class="termine-legend-item">
        <div class="termine-legend-dot" style="background: var(--green-500);"></div>
        <span>Vereinsevent</span>
      </div>
    </div>
```

Replace with:
```html
      <div class="termine-legend-item">
        <div class="termine-legend-dot" style="background: var(--green-500);"></div>
        <span>Vereinsevent</span>
      </div>
      <div class="termine-legend-item">
        <div class="termine-legend-dot" style="background: var(--orange-500);"></div>
        <span>Pokal</span>
      </div>
    </div>
```

- [ ] **Step 2: Add Pokal filter button**

Find:
```html
      <button class="termine-filter-btn" data-filter="event">Vereinsevents</button>
    </div>
```

Replace with:
```html
      <button class="termine-filter-btn" data-filter="event">Vereinsevents</button>
      <button class="termine-filter-btn" data-filter="pokal">Pokal</button>
    </div>
```

- [ ] **Step 3: Refactor badge label into dict-lookup**

Find:
```go-html-template
          <span class="termin-badge termin-badge-{{ .category }}">
            {{ if eq .category "medenspiel" }}Medenspiel{{ else }}Event{{ end }}
          </span>
```

Replace with:
```go-html-template
          {{ $labels := dict "medenspiel" "Medenspiel" "event" "Event" "pokal" "Pokal" }}
          <span class="termin-badge termin-badge-{{ .category }}">
            {{ index $labels .category }}
          </span>
```

This keeps the existing CSS class naming (`termin-badge-medenspiel` / `termin-badge-event` / new `termin-badge-pokal`) and is open for future categories without further if/else nesting.

- [ ] **Step 4: Verify Hugo build passes**

Run: `hugo --minify --quiet`
Expected: exit code 0, no template errors. If `dict` syntax has an issue, Hugo would surface a `template: ... function "dict" not defined` or similar — `dict` is a built-in Hugo function and works.

- [ ] **Step 5: Commit**

```bash
git add layouts/termine/list.html
git commit -m "$(cat <<'EOF'
feat(termine): add Pokal filter, legend, and dict-based badge labels

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Content — Two WTV Pokal Events

**Files:**
- Modify: `content/termine/_index.md` (insert 2 new entries between the existing `Frühjahrsarbeitseinsatz` of 28.03. and `Herren 30 vs. Olper TC` of 09.05.)

- [ ] **Step 1: Insert both Pokal events**

In `content/termine/_index.md`, find:
```yaml
  - title: "Frühjahrsarbeitseinsatz"
    date: 2026-03-28
    time: "10:30 Uhr"
    detail: "Anlage fit für die Sommersaison machen — viele helfende Hände willkommen!"
    category: "event"
  - title: "Herren 30 vs. Olper TC"
```

Replace with:
```yaml
  - title: "Frühjahrsarbeitseinsatz"
    date: 2026-03-28
    time: "10:30 Uhr"
    detail: "Anlage fit für die Sommersaison machen — viele helfende Hände willkommen!"
    category: "event"
  - title: "Herren-Pokal vs. TV Rönkhausen 1892"
    date: 2026-05-05
    time: "18:00 Uhr"
    detail: "WTV Vereinspokal · Herren LK 18,0–25,0, Heimspiel"
    category: "pokal"
    opponent: "TV Rönkhausen 1892 TA"
    liga_championship: "WTV VP 2026"
    liga_group: "2229674"
  - title: "Herren 40-Pokal vs. TV Rosenthal 1899"
    date: 2026-05-06
    time: "18:00 Uhr"
    detail: "WTV Vereinspokal · Herren Ü40 LK 1,0–25,0, Heimspiel"
    category: "pokal"
    opponent: "TV Rosenthal 1899"
    liga_championship: "WTV VP 2026"
    liga_group: "2229754"
  - title: "Herren 30 vs. Olper TC"
```

- [ ] **Step 2: Verify Hugo build passes**

Run: `hugo --minify --quiet`
Expected: exit code 0, no YAML parse errors. (A YAML indentation slip-up would surface as `error from "..._index.md": yaml: ...`)

- [ ] **Step 3: Visual smoke test**

Run: `hugo server` (run in background, wait until "Web Server is available at http://localhost:1313/" appears).

Then open in a browser:

- `http://localhost:1313/` — scroll to "Kommende Veranstaltungen". Expected:
  - Legend has 3 items: blue dot "Medenspiel", green dot "Vereinsevent", orange dot "Pokal".
  - First Pokal entry visible with orange left-border accent (since 2026-05-04 today, 2026-05-05 and 2026-05-06 are upcoming).
  - Title "Herren-Pokal vs. TV Rönkhausen 1892", detail "WTV Vereinspokal · Herren LK 18,0–25,0, Heimspiel", time "18:00 Uhr".

- `http://localhost:1313/termine/` — Expected:
  - Legend: 3 items as above.
  - Filter buttons: "Alle" (active) / "Medenspiele" / "Vereinsevents" / "Pokal".
  - Both Pokal events visible at the top of the list (chronologically before 09.05. Herren 30 entry).
  - Each has an orange `Pokal` badge on the right of the detail line.
  - Click "Pokal" filter → only the 2 Pokal events show.
  - Click "Medenspiele" → only Medenspiele show, no Pokal events. (Regression: existing Medenspiel entries unchanged.)
  - Click "Vereinsevents" → Sommerfest, JHV, etc. only. (Regression: events unchanged.)
  - Click "Alle" → everything visible again.

Stop the server with Ctrl-C (or `kill %1`).

- [ ] **Step 4: Commit**

```bash
git add content/termine/_index.md
git commit -m "$(cat <<'EOF'
feat(termine): add WTV Pokal home matches for 2026 season

- Herren-Pokal vs. TV Rönkhausen 1892 (05.05. 18:00)
- Herren 40-Pokal vs. TV Rosenthal 1899 (06.05. 18:00)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Done Criteria

- [ ] All 4 tasks committed.
- [ ] `hugo --minify` succeeds with no warnings.
- [ ] Homepage `/` shows orange Pokal entries with correct legend.
- [ ] `/termine/` page filter "Pokal" shows exactly 2 events; "Medenspiele" shows no Pokal; "Vereinsevents" shows no Pokal.
- [ ] No changes outside the 4 files listed in the File Map.