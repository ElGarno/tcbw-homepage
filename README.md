# TC Blau-Weiss Attendorn — Website

Official website of TC Blau-Weiss Attendorn e.V., a tennis club founded in 1931 at Burg Schnellenberg, Attendorn.

**Live:** [tc-bw-attendorn.de](https://tc-bw-attendorn.de)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Static Site Generator** | [Hugo](https://gohugo.io/) |
| **CMS** | [DecapCMS](https://decapcms.org/) (Git-based, headless) |
| **Hosting** | [Cloudflare Pages](https://pages.cloudflare.com/) |
| **Domain** | tc-bw-attendorn.de (DNS via Cloudflare) |
| **CSS** | Custom CSS (no framework) |
| **Fonts** | DM Sans + Playfair Display (Google Fonts) |
| **Repo** | GitHub (ElGarno/tcbw-homepage) |

## Architecture

This is a **static website** — no server, no database, no PHP. Hugo compiles Markdown content and HTML templates into plain HTML/CSS/JS files. Cloudflare Pages serves these files globally via CDN.

### Why this stack?

- **Security:** No server-side code means no attack surface (unlike the previous WordPress site)
- **Performance:** Static files served from CDN, typical load time < 1s
- **Cost:** Cloudflare Pages free tier — $0/month hosting
- **Maintenance:** No server updates, no plugin conflicts, no database backups
- **Content editing:** Markdown files in Git, or DecapCMS admin UI for non-technical editors

## Project Structure

```
tcbw-homepage/
├── content/              # Markdown content (pages, news, teams, events)
│   ├── _index.md         # Homepage (hero, verein, CTA sections)
│   ├── aktuelles/        # News posts
│   ├── mannschaften/     # Team pages (7 teams)
│   ├── training/         # Training & trainer info
│   ├── termine/          # Events and match schedule
│   ├── verein/           # Club info (Vorstand, Historie, Mitgliedschaft)
│   ├── galerie/          # Photo gallery
│   └── seiten/           # Legal pages (Impressum, Datenschutz)
├── layouts/              # Hugo templates
│   ├── _default/         # Base templates (baseof, list, single)
│   ├── partials/         # Reusable components (hero, nav, footer, etc.)
│   ├── verein/           # Verein section templates
│   ├── mannschaften/     # Team page templates
│   ├── termine/          # Events templates
│   └── training/         # Training page template
├── static/
│   ├── css/main.css      # All styles
│   ├── js/main.js        # Nav, mobile menu, scroll animations
│   ├── images/           # Photos (historie, trainer, wappen)
│   └── admin/            # DecapCMS admin interface
├── data/
│   └── quickinfo.yaml    # Homepage quick-info cards
├── hugo.toml             # Hugo configuration
└── doc/                  # Project documentation
```

## Local Development

### Prerequisites

- [Hugo](https://gohugo.io/installation/) (v0.158+)

### Run locally

```bash
hugo server
```

Opens at `http://localhost:1313` with live reload.

### Build for production

```bash
hugo
```

Output goes to `public/`.

## Content Editing

### Via Markdown (recommended)

Edit files in `content/` directly. Content is in Markdown with YAML frontmatter.

### Via DecapCMS

Navigate to `/admin/` on the live site. Requires GitHub authentication (setup pending).

## Deployment

Pushes to `main` trigger automatic deployment on Cloudflare Pages. No manual steps needed.

## Features

- Responsive design (mobile, tablet, desktop)
- Dynamic next-event display on homepage
- Team pages with match schedules (linked to liga.nu)
- Event calendar with category filtering (Medenspiel/Event)
- Past events auto-hidden at build time
- Court booking integration (courtbooking.de)
- Club crest as favicon and nav logo
- Historie section with historic photos
