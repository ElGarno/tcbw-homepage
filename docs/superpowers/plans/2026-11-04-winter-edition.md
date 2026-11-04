# Winter Edition & April Fool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Date-driven seasonal modes for the Hugo site: a calm "Winterabend" look from 1 Nov to 31 Mar across all pages, and a red-white April fool on 1 Apr.

**Architecture:** One small script (`static/js/season.js`) is inlined into `<head>` and sets `data-season="winter"|"april"` on `<html>` from the visitor's date (URL override `?season=`). All seasonal styling is plain CSS in `static/css/main.css`, scoped under those attributes; seasonal markup (snow layers, banner) is always rendered and hidden by default.

**Tech Stack:** Hugo, plain CSS, vanilla JS, `node --test` for the date logic, Playwright MCP / `hugo server` for visual checks.

**Spec:** `docs/superpowers/specs/2026-11-04-winter-edition-design.md`
**Visual reference:** `.superpowers/brainstorm/92173-1793789722/content/winter-hero-v2.html` (ignore the string lights in it — they are out).

## Global Constraints

- No new dependencies, no JS libraries, no third-party snow scripts. Plain CSS + vanilla JS only.
- Seasons: winter = 1 Nov – 31 Mar; april = 1 Apr only; otherwise none. Visitor's local clock.
- Override: `?season=winter|april|off`; any other value is ignored (date rules apply). No persistence.
- `prefers-reduced-motion: reduce` → no falling snow anywhere; static decorations stay.
- No horizontal page scroll at 390 px viewport in any mode.
- Seasonal overlays never intercept clicks (`pointer-events: none`) and stay below the nav (`.nav` is `z-index: 100`).
- Warm palette (tunable): glow `rgba(255,176,80,.35)`, gold `#ffcf7a`, button `#f2a54a` with text `#3a2408`. Contrast ≥ WCAG AA.
- No snow on news/team cards. No string lights. No emojis in copy.
- Code/comments English; user-facing copy German.
- Commits: Conventional Commits, only when the user asked (they approved this plan; commit per task on a feature branch `feat/winter-edition`).

## Review Focus

1. **Invalid override** (`?season=foo`, `?season=` empty) → ignored, date decides. Test in Task 1.
2. **Year boundary** (31 Oct, 1 Nov, 31 Dec, 1 Jan, 31 Mar, 1 Apr, 2 Apr) → correct mode, winter off on 1 Apr. Tests in Task 1.
3. **Overlays blocking interaction** — mobile menu toggle, nav dropdowns and the Anmeldung form must stay clickable in winter and april mode. Check in Task 3 and Task 6.
4. **Horizontal scroll from decorative edges** (snow banks are wider than their box) → every decorated container clips (`overflow: hidden`). Measure `scrollWidth === innerWidth` at 390 px in Tasks 2, 3, 6.
5. **April page leaking** into `/aktuelles/`, homepage "Aktuelles", sitemap or search engines on any day. Build-output greps in Task 6.

---

### Task 1: Season switch

**Files:**
- Create: `static/js/season.js`
- Create: `tests/js/season.test.cjs`
- Modify: `layouts/partials/head.html` (inline the script before the stylesheet link)

**Interfaces:**
- Produces: `seasonFor(date: Date, override?: string|null): 'winter'|'april'|null`; `yearsSince(founded: number, date: Date): number`. In the browser the script sets `document.documentElement.dataset.season` (attribute absent when `null`) and, on `DOMContentLoaded`, writes `yearsSince(founded, now)` into every `[data-years-since]` element, reading the founding year from that element's attribute value.
- Later tasks rely only on the attribute `data-season` on `<html>` and on `[data-years-since="1931"]`-style placeholders.

- [ ] **Step 1: Write the failing test** (`node:test` + `node:assert/strict`, `require('../../static/js/season.js')`)

```js
const d = (s) => new Date(`${s}T12:00:00`);
test('winter window', () => {
  assert.equal(seasonFor(d('2026-10-31')), null);
  assert.equal(seasonFor(d('2026-11-01')), 'winter');
  assert.equal(seasonFor(d('2026-12-31')), 'winter');
  assert.equal(seasonFor(d('2027-01-01')), 'winter');
  assert.equal(seasonFor(d('2027-03-31')), 'winter');
});
test('april fool only on 1 Apr', () => {
  assert.equal(seasonFor(d('2027-04-01')), 'april');
  assert.equal(seasonFor(d('2027-04-02')), null);
  assert.equal(seasonFor(d('2027-07-15')), null);
});
test('override', () => {
  assert.equal(seasonFor(d('2027-07-15'), 'winter'), 'winter');
  assert.equal(seasonFor(d('2027-07-15'), 'april'), 'april');
  assert.equal(seasonFor(d('2026-12-01'), 'off'), null);
  assert.equal(seasonFor(d('2026-12-01'), 'foo'), 'winter');
  assert.equal(seasonFor(d('2026-12-01'), ''), 'winter');
});
test('yearsSince', () => {
  assert.equal(yearsSince(1931, d('2026-04-01')), 95);
  assert.equal(yearsSince(1931, d('2027-04-01')), 96);
});
```

- [ ] **Step 2: Run** `node --test tests/js/` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement `static/js/season.js`**

Plain ES5-compatible script, no `export`. Ends with `if (typeof module !== 'undefined') module.exports = { seasonFor, yearsSince };`. Browser part runs only when `typeof document !== 'undefined'`: read `new URLSearchParams(location.search).get('season')`, set/remove `data-season`, register the `DOMContentLoaded` handler for `[data-years-since]`.

- [ ] **Step 4: Inline in `head.html`** — directly after the viewport meta, before any stylesheet:
`<script>{{ readFile "static/js/season.js" | safeJS }}</script>`

- [ ] **Step 5: Verify**
  - `node --test tests/js/` → all pass.
  - `hugo --quiet -d /tmp/x && grep -c "seasonFor" /tmp/x/index.html` → `1`.
  - In `hugo server`: open `/?season=winter` → `document.documentElement.dataset.season === 'winter'`; `/?season=off` → attribute absent. Nothing visible changes yet.

- [ ] **Step 6: Commit** `feat(season): add date-driven season switch`

---

### Task 2: Snow layer + winter homepage hero

**Files:**
- Modify: `layouts/partials/hero.html` (add snow markup)
- Modify: `static/css/main.css` (new block `/* ── Season: winter ── */` at the end of the file)

**Interfaces:**
- Consumes: `html[data-season="winter"]` (Task 1).
- Produces: reusable markup `<div class="season-snow season-snow--{hero|header|page}" aria-hidden="true"></div>`; `.season-snow` is `display: none` unless `[data-season="winter"]`, and always `display: none` under `prefers-reduced-motion: reduce`. Tasks 3 reuses it with `--header` and `--page`.

- [ ] **Step 1: Markup** — in `hero.html`, inside `<section class="hero">` right after `.hero-court-lines`: two layers `season-snow season-snow--hero` and `season-snow season-snow--hero season-snow--far`.

- [ ] **Step 2: CSS** (all under `[data-season="winter"]`):
  - `.season-snow` base: absolutely positioned, `pointer-events: none`, CSS-only flakes (layered radial-gradient dots) animated via `transform` only; `--far` layer smaller/slower/fainter. Vertical drift must loop seamlessly (animate one tile height).
  - `.hero::after`: replace the white fade with a white snow bank (soft curved top edge, slightly wider than the hero, clipped by `.hero { overflow: hidden }` which already exists) plus a warm glow behind it (`.hero::before` gets an extra radial gradient at the bottom centre).
  - `.hero-eyebrow` → gold; `.hero .btn-primary` → orange (Task 4 generalises buttons; here only the hero so the task is reviewable alone).
  - `@media (prefers-reduced-motion: reduce) { .season-snow { display: none; } }`.

- [ ] **Step 3: Verify** with `hugo server` + Playwright at 390×844 and 1280×800:
  - `/?season=winter`: screenshot matches the reference mood (dark blue, snowfall, snow bank, warm glow, gold eyebrow, orange "Mitglied werden"); `document.documentElement.scrollWidth === innerWidth`.
  - `/?season=off`: hero identical to today (compare screenshot with `main`).
  - Emulate reduced motion (`browser_emulate_media`) → no `.season-snow` visible.

- [ ] **Step 4: Commit** `feat(season): winter look for homepage hero`

---

### Task 3: Site-wide winter accents (page snow, crest cap, article header, footer)

**Files:**
- Modify: `layouts/_default/baseof.html` (page snow layer as first child of `<body>`)
- Modify: `layouts/aktuelles/single.html` (snow layer inside `.article-detail-header`)
- Modify: `static/css/main.css` (winter block)

**Interfaces:**
- Consumes: `.season-snow` (Task 2).

- [ ] **Step 1: Page snow** — `season-snow season-snow--page` in `baseof.html`: `position: fixed; inset: 0; z-index: 90;` far sparser than the hero, flakes tinted `--blue-200`-ish so they read on white pages. On the homepage it sits behind/over the hero harmlessly; no second dense layer.

- [ ] **Step 2: Crest cap** — `[data-season="winter"] .nav-logo` gets `position: relative` and a `::before` snow cap sized/positioned relative to `.nav-logo-mark` so it sits on top of the crest in both normal and `.nav.scrolled` state and on mobile.

- [ ] **Step 3: Article header** — `.article-detail-header` gets `position: relative; overflow: hidden;` (winter only), a `season-snow--header` layer, a snow edge at the bottom and warm glow — scaled-down hero treatment. Its text must stay above the snow (`z-index`).

- [ ] **Step 4: Footer** — `.footer` (winter only) gets a snow edge along its top and a soft warm glow from below; clipped with `overflow: hidden`.

- [ ] **Step 5: Verify** (Playwright, 390 px and desktop, `?season=winter`):
  - `/`, `/verein/mitgliedschaft/`, `/aktuelles/2026-09-13-saisonfazit-sommer-2026/`, `/mannschaften/herren-40/`: screenshots; `scrollWidth === innerWidth` on each.
  - Crest cap visible at top and after scrolling (`.nav.scrolled`).
  - Mobile: click `#navToggle` → menu opens and a menu link is clickable; links in page body clickable (`browser_click` succeeds).
  - `?season=off` on the same pages: no visual change versus `main`.

- [ ] **Step 6: Commit** `feat(season): winter accents across all pages`

---

### Task 4: Warm-orange primary buttons

**Files:**
- Modify: `layouts/mannschaften/single.html:17`, `layouts/partials/pokalbaum.html:36` (remove inline `background`/`color`, add class `btn-primary--solid`)
- Modify: `static/css/main.css`

**Interfaces:** none new beyond `.btn-primary--solid`.

- [ ] **Step 1:** Add `.btn-primary--solid { background: var(--blue-600); color: var(--white); }` (keeps today's look; pokalbaum keeps its `margin-top: 16px` inline or via class).
- [ ] **Step 2:** Winter rule: `.btn-primary`, `.btn-primary--solid`, `.anmeldung-submit`, `.signup-cta` primary action → orange `#f2a54a`, text `#3a2408`, matching hover state. Audit `grep -rn "btn-primary\|signup-cta" layouts` — every hit must turn orange in winter.
- [ ] **Step 3: Verify:** `?season=off` → `/mannschaften/herren-40/` and `/pokal/` buttons look exactly as before; `?season=winter` → all buttons from the grep orange; contrast checked (≥ 4.5:1 for the label).
- [ ] **Step 4: Commit** `feat(season): warm-orange primary buttons in winter`

---

### Task 5: Weihnachtsfeier highlight

**Files:**
- Modify: `layouts/partials/termine.html:40`, `layouts/termine/list.html:46`
- Modify: `static/css/main.css`

- [ ] **Step 1:** Add class `termin-item--xmas` when `strings.Contains (lower .title) "weihnacht"` to both `termin-item` divs.
- [ ] **Step 2:** `[data-season="winter"] .termin-item--xmas` → gold accent (`#ffcf7a`-based border/marker plus a small "Weihnachtsfeier"-style badge is optional; **not** orange — orange means Pokal).
- [ ] **Step 3: Verify:** temporarily add an event `title: "Weihnachtsfeier"` dated in the future to `content/termine/_index.md`, build, `grep -c "termin-item--xmas" public/index.html public/termine/index.html` → ≥1 each; screenshot with `?season=winter`; **revert the temporary event** (`git diff content/termine/_index.md` empty).
- [ ] **Step 4: Commit** `feat(season): highlight Weihnachtsfeier in winter`

---

### Task 6: April fool — Rot-Weiss

**Files:**
- Create: `layouts/partials/april-banner.html`
- Create: `content/aprilscherz.md` (root page, outside every DecapCMS folder in `static/admin/config.yml`)
- Modify: `layouts/_default/baseof.html` (banner partial after nav)
- Modify: `layouts/partials/head.html` (robots meta when `.Params.robots` is set)
- Modify: `static/css/main.css` (block `/* ── Season: april ── */`)

**Interfaces:**
- Consumes: `data-season="april"`, `[data-years-since]` (Task 1).

- [ ] **Step 1: Banner partial** — rendered unless `.RelPermalink` is one of `/seiten/impressum/`, `/seiten/datenschutz/`, `/verein/anmeldung/`. Markup: a link to `/aprilscherz/` reading `Nach <span data-years-since="{{ site.Params.founded }}">95</span> Jahren: Aus Blau-Weiss wird Rot-Weiss`. Hidden unless `[data-season="april"]`; must not overlap the fixed nav (offset below it).

- [ ] **Step 2: Reveal page** `content/aprilscherz.md` front matter: `title`, `build: { list: never }`, `sitemap: { disable: true }`, `robots: "noindex"` and in `head.html` emit `<meta name="robots" content="noindex">` when `.Params.robots` is set. Body (German, short): plays along for one or two sentences (new colours, new name), then resolves with "April, April!" and that Blau-Weiss stays Blau-Weiss. Uses `_default/single.html`.

- [ ] **Step 3: Palette** — under `[data-season="april"]` redefine every `--blue-*` token (50–900) with a matching red scale; crest images (`.nav-logo-mark`, hero/anlage crest if any) get a `filter: hue-rotate(...)` that turns blue to red. Photos (`.news-card-image img`, `.team-card-photo img`, galerie, article images) are **not** filtered. Winter styles are inactive (season is `april`, not `winter`).

- [ ] **Step 4: Verify**
  - Build: `grep -L aprilscherz public/aktuelles/index.html public/index.html public/sitemap.xml` lists all three (i.e. not contained); `grep -c 'name="robots" content="noindex"' public/aprilscherz/index.html` → `1`.
  - `?season=april` at 390 px + desktop on `/`, `/mannschaften/herren-40/`, `/aprilscherz/`: site red-white, banner shows "Nach 95 Jahren" (in 2026), photos unchanged, `scrollWidth === innerWidth`.
  - `?season=april` on `/seiten/impressum/`, `/verein/anmeldung/`: no banner; Anmeldung form still clickable/typeable.
  - `?season=off`: no banner anywhere.
- [ ] **Step 5: Commit** `feat(season): add Rot-Weiss April fool`

---

### Final check (after all tasks)

- `node --test tests/js/` green; `hugo --quiet` builds without warnings.
- Full screenshot pass in all three modes on `/`, an article, a team page, `/termine/`, `/verein/anmeldung/` at 390 px and desktop.
- Hand-off note to the user: winter goes live with the next deploy (today is in the winter window).
