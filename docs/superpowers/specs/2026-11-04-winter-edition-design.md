# Winter Edition & April Fool — Design

Date: 2026-11-04
Status: approved in conversation (brainstorming), pending plan

## Intent

From 1 November to 31 March, the site should make a visitor think
"schöner, heimeliger Tennisverein" — a warm club you'd like to drop by even
while the courts are closed. Mood only, no new content, no photos: the effect
comes purely from design. On 1 April the site plays a harmless April fool.

## Goals

- Seasonal "Winterabend" look across the **whole site**, not just the homepage.
- Switches on/off by date, every year, with nobody touching anything.
- April fool on 1 April only, then gone; comes back by itself next year.

## Non-goals

- No new winter content sections; no winter photos.
- No snow on news/team cards (explicitly rejected).
- No string lights (rejected: distorted at different viewport widths).
- No music, no JS libraries, no third-party snow scripts.
- No automated notification on 1 April (user sets a calendar reminder).

## Anti-goals (failure even if it "works")

- Kitschy or noisy — it must stay calm and readable. Snow is a whisper.
- Slower page loads or layout shift / flash of the summer look on load.
- Distorted decorations at any viewport width (that's why the lights died).
- April fool that could genuinely confuse members after the day (e.g. stays
  in the news list, gets indexed, or alters Impressum/legal pages).
- Motion for users with `prefers-reduced-motion: reduce`.

## Season windows (user decision)

| Mode | Active | Notes |
|---|---|---|
| `winter` | 1 Nov 00:00 → 31 Mar 23:59 (Europe/Berlin, visitor's clock) | spans the year boundary |
| `april` | 1 Apr 00:00 → 23:59 | winter is **off** on 1 Apr |
| none | rest of the year | current site unchanged |

### Switching mechanism (my call)

Client-side, not build-time: a tiny inline script in `<head>` (before CSS
paints) sets `data-season="winter"` or `data-season="april"` on `<html>`
based on the visitor's current date. All seasonal CSS is scoped under those
attributes.

Why: exact switch at midnight, the joke lasts exactly one day, and nothing
depends on the daily Cloudflare deploy (06:30 Berlin). Inline in `<head>` so
there is no flash of the summer look. If JS is off, visitors simply see the
normal site — acceptable.

Preview override for testing outside the season: `?season=winter`,
`?season=april`, `?season=off` (URL param wins over date; no persistence).

Note: I earlier told the user the switch would ride on the 06:30 deploy; this
client-side approach replaces that and is strictly better for them (exact
midnight). Mention when handing over.

## Winter look

Reference mockup: "Winterabend" (variant A, without string lights) in
`.superpowers/brainstorm/92173-1793789722/content/winter-hero-v2.html`
(the lights in that file are **out**).

All in plain CSS in `static/css/main.css`, scoped under
`[data-season="winter"]`, using existing tokens (`--blue-*`) plus warm
accents (my picks, builder may tune): glow `rgba(255,176,80,.35)`, eyebrow
gold `#ffcf7a`, button `#f2a54a` with text `#3a2408`.

### 1. Homepage hero (`layouts/partials/hero.html`, `.hero`)

- Keep the dark blue gradient and court lines.
- Gentle snowfall in two layers (different size/speed/opacity), CSS-only
  (e.g. animated radial-gradient dot layers), `pointer-events: none`.
- Snow bank at the bottom: a soft white curved edge replacing/overlaying the
  existing white fade (`.hero::after`), with a warm radial glow rising from
  behind it ("light from the clubhouse").
- Eyebrow ("Willkommen beim") in warm gold.
- Primary CTA "Mitglied werden" warm orange (user confirmed).

### 2. Light snowfall on every page

- Fixed full-viewport overlay, far sparser and subtler than the hero.
- Must be visible on white pages too → flakes in light blue tints
  (`--blue-200`-ish), not pure white.
- `pointer-events: none`, never above modals/nav dropdowns, no scrollbars,
  no layout shift. Must not hurt scroll performance on phones (transform /
  opacity animation only).

### 3. Snow cap on the crest in the nav

- Small white snow cap on top of the Wappen (`.nav-logo-mark`, an `<img>` of
  `/images/wappen.png`) — e.g. a pseudo-element on `.nav-logo`.
- Must sit right at every breakpoint and in the scrolled nav state
  (`.nav.scrolled`).

### 4. Article header (`.article-detail-header`, `layouts/aktuelles/single.html`)

- Same Winterabend treatment as the hero, scaled down: snowfall, snow edge at
  the bottom, warm glow.

### 5. Warm-orange primary buttons site-wide

- All `.btn-primary` (and equivalents) become warm orange during winter.
  Builder: audit all primary-button styles (6 uses of `btn-primary` in
  layouts, plus `.signup-cta` etc.) and keep contrast ≥ WCAG AA.
  Two uses carry an inline `background: var(--blue-600)`
  (`layouts/mannschaften/single.html`, `layouts/partials/pokalbaum.html`):
  move that into a CSS class so the winter rule can override it without
  `!important` (my call).

### 6. Snowy footer (`.footer`, `layouts/partials/footer.html`)

- Snow edge along the top of the dark footer and a soft warm glow — mirror
  image of the hero.

### Reduced motion

`prefers-reduced-motion: reduce` → no falling snow anywhere. Static
decorations (snow edges, glow, crest cap, orange buttons) stay.

### Weihnachtsfeier highlight (my call)

During winter, a Termin whose title contains "Weihnacht" (case-insensitive)
gets a festive accent in the Termine lists (homepage `termine.html` and
`/termine/`) — a **gold** marker/badge, not orange, because orange already
means "Pokal" in the Termine legend (my call). No Termin → nothing shows.
There is no such Termin yet. Exact styling left to the builder, in the same
warm palette.

## April fool (1 April)

Concept (my idea, user approved): **"Nach 95 Jahren: Aus Blau-Weiss wird
Rot-Weiss"** — the whole site turns red-white for a day. A local wink at
rival clubs (e.g. Rot-Weiß Hagen).

- Under `[data-season="april"]`, remap the `--blue-*` tokens to a matching
  red scale so the whole site turns red-white. Wappen in nav/hero: tint red
  via CSS filter (hue-rotate) — photos must **not** be recoloured.
- Banner at the top of every page: "Nach 95 Jahren: Aus Blau-Weiss wird
  Rot-Weiss" linking to the reveal page. Hidden on every other day.
- Reveal page: a short article that plays along for a sentence or two, then
  resolves with "April, April!". Must **not** appear in news lists, homepage
  "Aktuelles", RSS or sitemap on any day, and carries `noindex`
  (Hugo `build: list: never` + `sitemap: disable: true` + robots meta). The
  URL itself may exist all year (harmless if someone finds it).
  It lives **outside** `content/aktuelles/` (e.g. its own section), because
  that folder is a DecapCMS collection (`static/admin/config.yml`) whose
  editor could drop the non-schema front matter and leak it into the news
  list (my call).
- Legal pages (Impressum, Datenschutz) and the membership signup flow get the
  colour change at most — no joke text there, and the banner is hidden on
  them (my call; overrides "banner on every page").
- The "95 Jahre" is right for 2026 (founded 1931); compute it from
  `site.Params.founded` and the current year (client-side, since the build
  year ≠ joke year possibly) so it stays correct in future years.

## Constraints

- Hugo static site, Cloudflare Pages, plain CSS in `static/css/main.css`,
  `static/js/main.js` loaded at end of body (the season script must be
  inline in `layouts/partials/head.html` instead, to avoid a flash).
- No new dependencies. Mobile-first: no horizontal scroll at 390 px.
- Must not break the existing nav, termine filtering, anmeldung form.

## Left to the builder

- Exact snow technique, flake density, speeds, colour values, curve shapes.
- Red palette values for April.
- Exact Weihnachtsfeier badge styling.
- Wording of the April reveal article (German, friendly, short).

## Verification

- Preview each mode via `?season=winter|april|off` locally (`hugo server`)
  at 390 px and desktop; screenshots.
- Date logic unit-checked for boundaries: 31 Oct, 1 Nov, 31 Dec, 1 Jan,
  31 Mar, 1 Apr, 2 Apr.
- Reduced-motion emulation: no animation.
- April page absent from `/aktuelles/`, homepage, sitemap, RSS.
