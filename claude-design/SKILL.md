---
name: tc-bw-attendorn-design
description: Use this skill to generate well-branded interfaces and assets for Tennisclub Blau-Weiss Attendorn e.V. (TC BW Attendorn) — a tennis club founded 1931 at Burg Schnellenberg, Attendorn (Sauerland, Germany). Contains essential design guidelines, colors, type, fonts, the club crest (Wappen), photos of the Anlage and Clubhaus, and UI kit components recreating the public website at tc-bw-attendorn.de. Use for prototypes, mocks, slides, marketing visuals, or production-style pages in the club's brand.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation

- **`README.md`** — full brand context: voice/tone (German, du/ihr), color system (deep navy + clean white), Playfair Display + DM Sans, hover/press patterns, layout rules
- **`colors_and_type.css`** — single import; provides every CSS variable + `@font-face` for DM Sans (local TTFs in `fonts/`) + Playfair Display (Google Fonts CDN)
- **`assets/wappen.png`** — the only logo (the crest). 2312×1824 PNG with transparency.
- **`assets/foto-*.jpg`, `assets/historie-*.jpg`** — real photos of the Anlage, Clubhaus, and historical archives. Use these instead of stock or generated imagery.
- **`ui_kits/website/`** — JSX components recreating tc-bw-attendorn.de. Components export to `window` so they can be used directly: `<Nav>`, `<Hero>`, `<QuickInfo>`, `<News>`, `<Teams>`, `<Termine>`, `<Verein>`, `<CTA>`, `<Footer>`.
- **`preview/`** — small spec cards (colors, type, components in isolation) — useful as visual references while designing.

## Brand cheat-sheet

- Primary CTA: `--blue-600` (#1a4080), white text, `--shadow-cta`
- Hero: `linear-gradient(160deg, --blue-700, --blue-800, --blue-900)` + translucent court-line diagram
- Headlines: Playfair Display 700, `letter-spacing: -0.02em`
- Body: DM Sans 400, `line-height: 1.6`
- Eyebrow: DM Sans 600, 0.75rem, UPPERCASE, `letter-spacing: 0.12em`, color `--blue-500`
- Voice: warm, plain-spoken **German**. Always **du/ihr** (informal), never Sie. Sentence case for buttons. Spell *Blau-Weiss* with double-S.
- Emoji budget: a single 🎾 on team cards. That's it.
