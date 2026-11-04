# Drawn Post Images (Beitragsbilder) — Design

Date: 2026-11-04
Status: approved in conversation (brainstorming), pending plan

## Intent

Every news post ("Aktuelles") should show its own fitting picture instead of
the blue title gradient or a generic category photo. Pictures are drawn
illustrations (SVG), created automatically by Claude for new posts from the
Mail-to-Homepage automation, and drawn once for existing posts.

## Goals

- New posts from Mail-to-Homepage arrive in their Draft-PR with an individual
  drawn SVG matching the post content.
- 8 existing posts get a drawn picture now (list below).
- Picture shows on the news card **and** at the top of the article page
  (user decision).
- All pictures look like one family (house style below).

## Non-goals

- No raster image generation (DALL-E, Gemini etc.), no new accounts.
- No "redraw" request flow (e.g. reply mail). A bad picture is handled by
  deleting the file in the PR (user decision).
- Posts that already have their own photo are untouched.

## Anti-goals

- Broken image icons anywhere (e.g. after the SVG was deleted in a PR).
- Executable content in committed SVGs.
- Pictures that clash with the site (off-palette colours, text in images).

## House style — "C · Vereinsblau" (user decision)

Reference: `.superpowers/brainstorm/30115-1793795875/content/bild-stil-v2.html`,
variant C.

- `viewBox="0 0 510 200"` (matches the card ratio ≈ 2.55:1).
- Background: diagonal linear gradient `#153266` → `#0a1628`.
- Faint tennis court lines in the background: white, opacity ≈ 0.12,
  stroke 2, roughly `x 60–450, y 25–175`.
- Soft blue glow behind the motif: radial gradient `#3a7bd5` at ≈ 0.45 → 0.
- Motif: flat, simple shapes in white / light blues (`#ffffff`, `#dceafb`,
  `#a8ccf5`, `#6ba3eb`, `#3a7bd5`, `#1e56a0`). Blau-weiß only — tennis balls
  are white with blue seams, not yellow.
- Motif stays inside a central safe area (≈ x 130–380) because the card crops
  with `object-fit: cover` (the first card is taller).
- No text, letters, logos or real people's faces in the picture.

The fixed parts (background, court lines, glow) are **not** drawn by the
model: they come from a template; the model only returns the motif group
(my call — consistency + less for the model to get wrong).

## Existing posts to draw (user decision: these 8)

| Post file (content/aktuelles/) | Today | Motif idea (builder may refine) |
|---|---|---|
| 2026-08-21-schleifchenturnier-details | placeholder | racket with ribbon bow, balls |
| 2026-09-13-rewe-scheine-fuer-vereine | placeholder | shopping cart with balls + coupons (user's own idea) |
| 2026-09-13-saisonfazit-sommer-2026 | placeholder | small podium / scoreboard with balls |
| 2026-03-23-mixed-teams-2026-aufruf | category photo | two rackets crossed, two balls |
| 2026-04-06-platzinstandhaltung-sommer-2026 | category photo | court rake / drag mat and watering can |
| 2026-04-14-korrektur-jahreshauptversammlung-2026 | category photo | lectern / table with chairs and a document |
| 2026-04-27-platzoeffnung-2026 | category photo | opened gate / net being raised, sun |
| fruehling-2026-ausblick | category photo | snowflake turning into sun, ball |

Untouched (own photo): `2026-05-31-vereinsnews-kurz`, `2026-05-31-vorstandswechsel-2026`,
`2026-08-11-meet-and-play`.

Existing posts are drawn in this session (by Claude, following the same house
style), not through n8n (my call).

## Storage & wiring (my calls)

- File per post: `static/images/news/gezeichnet/<post-file-basename>.svg`.
- The post's front matter gets `image: "/images/news/gezeichnet/<basename>.svg"`.
  For the 5 category posts, `image` takes precedence over `category` in
  `layouts/partials/news-card-image.html` already — `category` stays as is.
- Article page (`layouts/aktuelles/single.html`) already renders
  `.Params.image` → picture shows at the top of the article.
- **Missing-file fallback:** both `news-card-image.html` and the article
  image block only use `image` if the file exists under `static/`
  (Hugo `fileExists`). Otherwise the card falls back to category photo or
  title placeholder, and the article shows no image. This makes "delete the
  SVG in the PR" safe even if the front matter line stays.
- `alt` text: the post title (existing behaviour).

## Automation (Mail-to-Homepage, n8n)

- Applies to every generated post file under `content/aktuelles/` (both
  `beitrag` and `quickinfo` types) — my call.
- A **separate** model call draws the motif, placed **directly after
  "Antwort verarbeiten"** (my call): the draw step adds the SVG files, the
  `image:` front-matter line and the PR-body rows to `files` / `prBody`
  there. "Termine zusammenfuehren" reads `$('Antwort verarbeiten')` by name,
  so that one line switches to the new last draw node; "Tree vorbereiten"
  and "Draft-PR erstellen" stay unchanged. Extraction stays
  on the current Haiku model; drawing uses **Claude Sonnet 5.5**
  (`claude-sonnet-5-5`) for better drawing quality (my call; cost is a few
  cents per mail). If the n8n Anthropic node's model list doesn't offer it,
  set the model by ID.
- Input: post title, description, body. Output: only the SVG motif markup
  (a `<g>` group in the 510×200 coordinate space).
- A Code node assembles the final SVG = template (background, court lines,
  glow) + motif, then **sanitises** it: allow-list of SVG elements/attributes
  (`g, path, circle, ellipse, rect, line, polyline, polygon,
  linearGradient, radialGradient, stop, defs`), strip everything else —
  `<script>`, `<foreignObject>`, `<image>`, `on*` attributes,
  `href`/`xlink:href`, `style` with `url(`. Local paint references
  (`fill`/`stroke="url(#id)"`) to gradients defined in the motif stay
  allowed; template ids carry a prefix (e.g. `tpl-`) and motif ids are
  prefixed per post so nothing collides. If the result is empty or
  invalid XML, no image is added (post falls back to placeholder) — never
  fail the whole mail run because of a drawing.
- The SVG file and the `image:` front-matter line are added to the same
  Draft-PR commit (Tree vorbereiten). PR body lists the drawn image per post.
- Prompt with house style + 2–3 of the backfill SVGs as examples lives in
  `doc/specs/n8n-mail-to-homepage-draw-prompt.md`; the n8n JSON
  `doc/specs/n8n-mail-to-homepage.json` is updated accordingly. The live
  workflow differs from the repo JSON (real credentials), so the user
  **pastes the changed/new nodes** rather than re-importing the whole
  workflow; the hand-over lists exactly which nodes.
- The template + sanitiser code lives as a small tested Node module under
  `tools/mail-images/` (precedent: `tools/nuliga-sync/`), and its code is
  pasted into the n8n Code node (my call).

## Constraints

- Hugo static site, Cloudflare Pages; SVGs served as `<img>` (scripts in an
  `<img>` SVG don't run anyway — sanitising is defence in depth).
- n8n 2.x Code-node sandbox: no DOM parser available — sanitiser must be
  string/regex based on an allow-list and be unit-tested in Node.
- Keep each SVG small (target < 8 KB).

## Left to the builder

- Exact motifs and drawings for the 8 posts (within house style).
- Prompt wording.
- Sanitiser implementation details.

## Verification

- Hugo build: all 8 posts render their SVG on card and article page;
  screenshots at 390 px and desktop.
- Delete one SVG locally → card shows placeholder/category photo, article
  shows no image, no broken image.
- Sanitiser unit tests: script tag, `onload`, `foreignObject`, `href`,
  unclosed tag, empty input.
- Dry-run the new n8n nodes' code locally with a sample mail payload.
