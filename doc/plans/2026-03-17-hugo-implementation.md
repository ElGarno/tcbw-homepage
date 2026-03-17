# TC-BW-Attendorn Hugo Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the approved HTML mockup (`mockup/index.html`) into a fully functional Hugo static site with DecapCMS for content editing, deployable to Cloudflare Pages.

**Architecture:** Hugo static site with a custom theme (`tcbw`). Content is managed via Markdown files with front matter. DecapCMS provides a web-based editor at `/admin/` backed by Git (GitHub). The site is a single-page homepage with additional content pages (team details, news posts, gallery albums). Partials split the mockup into reusable components.

**Tech Stack:** Hugo (latest), DecapCMS (via CDN), Cloudflare Pages (hosting), Google Fonts (DM Sans + Playfair Display)

---

## File Structure

```
tcbw-homepage/
├── hugo.toml                          # Hugo config
├── content/
│   ├── _index.md                      # Homepage content (hero text, about text, stats)
│   ├── aktuelles/
│   │   ├── _index.md                  # News list page
│   │   ├── herren-40-auftakt.md       # Sample news post
│   │   └── saisoneroeffnung-2026.md   # Sample news post
│   ├── mannschaften/
│   │   ├── _index.md                  # Teams overview
│   │   ├── herren.md                  # Sample team page
│   │   └── herren-40.md              # Sample team page
│   ├── termine/
│   │   └── _index.md                  # Events list (data in front matter)
│   ├── verein/
│   │   ├── _index.md                  # Club info overview
│   │   ├── vorstand.md               # Board members
│   │   ├── historie.md               # History
│   │   ├── mitgliedschaft.md         # Membership info
│   │   └── anfahrt.md               # Directions
│   ├── training/
│   │   └── _index.md                  # Training schedule + trainers
│   ├── galerie/
│   │   └── _index.md                  # Gallery overview
│   └── seiten/
│       ├── impressum.md              # Legal notice
│       └── datenschutz.md            # Privacy policy
├── data/
│   └── quickinfo.yaml                 # Quick info cards data
├── static/
│   ├── admin/
│   │   └── index.html                 # DecapCMS admin page
│   ├── css/
│   │   └── main.css                   # All styles from mockup
│   ├── js/
│   │   └── main.js                    # Nav scroll, mobile toggle, reveal animations
│   └── images/                        # Placeholder images
├── layouts/
│   ├── _default/
│   │   ├── baseof.html               # Base template (html head, nav, footer, scripts)
│   │   ├── list.html                  # Default list template
│   │   └── single.html               # Default single page template
│   ├── index.html                     # Homepage template (assembles all sections)
│   ├── partials/
│   │   ├── head.html                 # <head> with meta, fonts, CSS
│   │   ├── nav.html                  # Navigation bar
│   │   ├── hero.html                 # Hero section
│   │   ├── quickinfo.html            # Quick info cards
│   │   ├── aktuelles.html            # News section (latest 2 posts)
│   │   ├── mannschaften.html         # Teams grid
│   │   ├── training.html             # Training schedule + trainers
│   │   ├── termine.html              # Upcoming events
│   │   ├── galerie.html              # Gallery preview
│   │   ├── instagram.html            # Instagram feed section
│   │   ├── verein.html               # About section
│   │   ├── cta.html                  # CTA banner (Mitglied werden)
│   │   ├── anfahrt.html              # Directions + map
│   │   ├── footer.html               # Footer
│   │   └── scroll-reveal.html        # JS for scroll animations
│   ├── aktuelles/
│   │   ├── list.html                 # News archive page
│   │   └── single.html              # Single news post
│   └── mannschaften/
│       └── single.html               # Single team page
└── static/admin/
    └── config.yml                     # DecapCMS configuration
```

---

## Task 1: Install Hugo & Scaffold Project

**Files:**
- Create: `hugo.toml`

- [ ] **Step 1: Install Hugo via Homebrew**

```bash
brew install hugo
```

- [ ] **Step 2: Verify installation**

Run: `hugo version`
Expected: `hugo v0.1xx.x+extended ...`

- [ ] **Step 3: Create Hugo site in current directory**

Hugo needs an empty dir or `--force`. Since we have existing files, init manually:

```bash
mkdir -p content layouts/partials layouts/_default layouts/aktuelles layouts/mannschaften data static/css static/js static/images static/admin
```

- [ ] **Step 4: Create hugo.toml**

```toml
baseURL = "https://tc-bw-attendorn.de/"
languageCode = "de"
title = "TC Blau-Weiss Attendorn"
theme = false

[params]
  description = "Tennisclub Blau-Weiss Attendorn e.V. — Tennis an der Burg Schnellenberg seit 1931."
  clubName = "TC Blau-Weiss Attendorn"
  clubNameShort = "TC"
  tagline = "Tennis an der Burg Schnellenberg"
  founded = "1931"
  address = "Burg Schnellenberg"
  zip = "57439"
  city = "Attendorn"
  instagram = "https://instagram.com/tcbwattendorn/"
  instagramHandle = "@tcbwattendorn"
  facebook = "https://facebook.com/tc.blauweiss.attendorn.de"
  courtbookingURL = "#"
  courtbookingLabel = "Platz buchen"

[menus]
  [[menus.main]]
    name = "Verein"
    url = "/verein/"
    weight = 10
  [[menus.main]]
    name = "Mannschaften"
    url = "/mannschaften/"
    weight = 20
  [[menus.main]]
    name = "Training"
    url = "/training/"
    weight = 30
  [[menus.main]]
    name = "Termine"
    url = "/termine/"
    weight = 40
  [[menus.main]]
    name = "Galerie"
    url = "/galerie/"
    weight = 50

[markup.goldmark.renderer]
  unsafe = true

[outputs]
  home = ["HTML"]

[build]
  [build.buildStats]
    enable = true
```

- [ ] **Step 5: Run Hugo dev server to verify scaffold works**

Run: `hugo server -D`
Expected: Server starts, shows empty page at `http://localhost:1313`

- [ ] **Step 6: Commit**

```bash
git add hugo.toml
git commit -m "chore: add Hugo config with site params and menu"
```

---

## Task 2: Extract CSS & JS from Mockup

**Files:**
- Create: `static/css/main.css`
- Create: `static/js/main.js`

- [ ] **Step 1: Create main.css**

Extract all CSS from `mockup/index.html` `<style>` block into `static/css/main.css`.
Copy everything between `<style>` and `</style>` tags verbatim.

- [ ] **Step 2: Create main.js**

Extract JS from `mockup/index.html` `<script>` block into `static/js/main.js`.
Copy everything between `<script>` and `</script>` tags verbatim.

- [ ] **Step 3: Verify files are not empty**

Run: `wc -l static/css/main.css static/js/main.js`
Expected: CSS ~500+ lines, JS ~30+ lines

- [ ] **Step 4: Commit**

```bash
git add static/css/main.css static/js/main.js
git commit -m "feat: extract CSS and JS from approved mockup"
```

---

## Task 3: Base Template & Head Partial

**Files:**
- Create: `layouts/_default/baseof.html`
- Create: `layouts/partials/head.html`

- [ ] **Step 1: Create head.html partial**

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{ if .IsHome }}{{ .Site.Title }} — {{ .Site.Params.tagline }}{{ else }}{{ .Title }} | {{ .Site.Title }}{{ end }}</title>
<meta name="description" content="{{ with .Description }}{{ . }}{{ else }}{{ .Site.Params.description }}{{ end }}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/main.css">
```

- [ ] **Step 2: Create baseof.html**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  {{ partial "head.html" . }}
</head>
<body>
  {{ partial "nav.html" . }}
  <main>
    {{ block "main" . }}{{ end }}
  </main>
  {{ partial "footer.html" . }}
  <script src="/js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add layouts/_default/baseof.html layouts/partials/head.html
git commit -m "feat: add base template with head partial"
```

---

## Task 4: Navigation Partial

**Files:**
- Create: `layouts/partials/nav.html`

- [ ] **Step 1: Create nav.html**

Extract the `<nav>` block from mockup. Replace hardcoded links with Hugo menu iteration:

```html
<nav class="nav" id="nav">
  <div class="container nav-inner">
    <a href="/" class="nav-logo">
      <div class="nav-logo-mark">{{ .Site.Params.clubNameShort }}</div>
      <span>{{ .Site.Params.clubName }}</span>
    </a>

    <button class="nav-toggle" id="navToggle" aria-label="Menue oeffnen">
      <span></span><span></span><span></span>
    </button>

    <div class="nav-links" id="navLinks">
      {{ range .Site.Menus.main }}
        <a href="{{ .URL }}" class="nav-link{{ if .HasChildren }} has-dropdown{{ end }}">{{ .Name }}</a>
      {{ end }}
      {{ with .Site.Params.courtbookingURL }}
        <a href="{{ . }}" class="nav-cta" target="_blank" rel="noopener">{{ $.Site.Params.courtbookingLabel }}</a>
      {{ end }}
    </div>
  </div>
</nav>
```

- [ ] **Step 2: Verify by running Hugo server**

Run: `hugo server -D`
Expected: Navigation renders with menu items from `hugo.toml`

- [ ] **Step 3: Commit**

```bash
git add layouts/partials/nav.html
git commit -m "feat: add navigation partial with dynamic menu"
```

---

## Task 5: Footer Partial

**Files:**
- Create: `layouts/partials/footer.html`

- [ ] **Step 1: Create footer.html**

Extract footer from mockup. Use site params for dynamic content:

```html
<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <p class="footer-brand-name">{{ .Site.Params.clubName }}</p>
        <p class="footer-brand-info">
          Tennisanlage {{ .Site.Params.address }}<br>
          {{ .Site.Params.zip }} {{ .Site.Params.city }}<br>
          Gegr. {{ .Site.Params.founded }}
        </p>
        <div class="footer-social">
          {{ with .Site.Params.instagram }}
          <a href="{{ . }}" target="_blank" rel="noopener" class="footer-social-link" title="Instagram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          {{ end }}
          {{ with .Site.Params.facebook }}
          <a href="{{ . }}" target="_blank" rel="noopener" class="footer-social-link" title="Facebook">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
          {{ end }}
        </div>
      </div>

      <div>
        <p class="footer-heading">Links</p>
        <ul class="footer-links">
          <li><a href="/mannschaften/">Mannschaften</a></li>
          <li><a href="/training/">Trainingszeiten</a></li>
          <li><a href="/verein/mitgliedschaft/">Mitglied werden</a></li>
          <li><a href="{{ .Site.Params.courtbookingURL }}" target="_blank" rel="noopener">Platzbuchung</a></li>
        </ul>
      </div>

      <div>
        <p class="footer-heading">Rechtliches</p>
        <ul class="footer-links">
          <li><a href="/seiten/impressum/">Impressum</a></li>
          <li><a href="/seiten/datenschutz/">Datenschutzerklaerung</a></li>
          <li><a href="#kontakt">Kontakt</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <p>&copy; {{ now.Year }} {{ .Site.Params.clubName }} e.V.</p>
      <div class="footer-bottom-links">
        <a href="/seiten/impressum/">Impressum</a>
        <a href="/seiten/datenschutz/">Datenschutz</a>
      </div>
    </div>
  </div>
</footer>
```

- [ ] **Step 2: Commit**

```bash
git add layouts/partials/footer.html
git commit -m "feat: add footer partial with site params"
```

---

## Task 6: Homepage Content & Section Partials (Hero, Quick Info, About, CTA)

**Files:**
- Create: `content/_index.md`
- Create: `data/quickinfo.yaml`
- Create: `layouts/index.html`
- Create: `layouts/partials/hero.html`
- Create: `layouts/partials/quickinfo.html`
- Create: `layouts/partials/verein.html`
- Create: `layouts/partials/cta.html`

- [ ] **Step 1: Create homepage content file**

`content/_index.md`:
```markdown
---
title: "TC Blau-Weiss Attendorn"
description: "Tennisclub Blau-Weiss Attendorn e.V. — Tennis an der Burg Schnellenberg seit 1931."
hero:
  eyebrow: "Willkommen beim"
  title: "TC Blau-Weiss Attendorn"
  subtitle: "Tennis an der Burg Schnellenberg"
  cta_primary:
    text: "Mitglied werden"
    url: "/verein/mitgliedschaft/"
  cta_secondary:
    text: "Platz buchen"
    url: "#"
verein:
  title: "Tradition trifft Leidenschaft"
  text: |
    Seit 1931 ist der TC Blau-Weiss Attendorn ein fester Bestandteil des sportlichen Lebens in Attendorn. Unsere Anlage an der Burg Schnellenberg bietet ideale Bedingungen fuer Tennis in jeder Altersklasse.

    Ob Anfaenger oder erfahrener Spieler, ob jung oder alt — bei uns findet jeder seinen Platz. Mit sechs aktiven Mannschaften, qualifizierten Trainern und einem lebendigen Vereinsleben sind wir mehr als nur ein Tennisclub.
  stats:
    - number: "1931"
      label: "Gegruendet"
    - number: "6"
      label: "Mannschaften"
    - number: "4"
      label: "Plaetze"
  image: "/images/anlage.jpg"
  image_alt: "Tennisanlage Burg Schnellenberg"
cta:
  title: "Werde Teil unseres Vereins"
  text: "Schnuppermitgliedschaft, Familienbeitraege und flexible Optionen — finde die passende Mitgliedschaft fuer dich."
  button_text: "Mitgliedschaft anfragen"
  button_url: "/verein/mitgliedschaft/"
---
```

- [ ] **Step 2: Create quickinfo.yaml data file**

`data/quickinfo.yaml`:
```yaml
- label: "Naechster Termin"
  title: "Saisoneroeffnung"
  detail: "28. April 2026, 14 Uhr"
  accent: "blue"
- label: "Mannschaften"
  title: "6 Teams aktiv"
  link_text: "Alle ansehen"
  link_url: "/mannschaften/"
  accent: "blue"
- label: "Training"
  title: "Fuer alle Altersklassen"
  link_text: "Mehr erfahren"
  link_url: "/training/"
  accent: "blue"
- label: "Platzbuchung"
  title: "Courtbooking"
  link_text: "Jetzt buchen"
  link_url: "#"
  accent: "green"
```

- [ ] **Step 3: Create hero.html partial**

Extract hero section from mockup. Use front matter for content:

```html
{{ with .Params.hero }}
<section class="hero">
  <div class="hero-court-lines"></div>
  <div class="hero-content">
    <p class="label-upper hero-eyebrow">{{ .eyebrow }}</p>
    <h1 class="heading-display hero-title">{{ .title | replaceRE " " "<br>" 1 }}</h1>
    <p class="hero-subtitle">{{ .subtitle }}</p>
    <p class="hero-year">Seit {{ $.Site.Params.founded }}</p>
    <div class="hero-actions">
      {{ with .cta_primary }}<a href="{{ .url }}" class="btn btn-primary">{{ .text }}</a>{{ end }}
      {{ with .cta_secondary }}<a href="{{ .url }}" class="btn btn-outline">{{ .text }}</a>{{ end }}
    </div>
  </div>
</section>
{{ end }}
```

- [ ] **Step 4: Create quickinfo.html partial**

```html
<section class="quick-info">
  <div class="container">
    <div class="quick-info-grid">
      {{ range .Site.Data.quickinfo }}
      <div class="quick-card reveal">
        <p class="label-upper quick-card-label">{{ .label }}</p>
        <p class="quick-card-title">{{ .title }}</p>
        {{ with .detail }}<p class="quick-card-detail">{{ . }}</p>{{ end }}
        {{ with .link_text }}<a href="{{ $.link_url }}" class="quick-card-link">{{ . }}</a>{{ end }}
      </div>
      {{ end }}
    </div>
  </div>
</section>
```

Note: Fix the link_url reference — should be `{{ .link_url }}` (no `$` prefix, access from range context).

- [ ] **Step 5: Create verein.html partial**

```html
{{ with .Params.verein }}
<section class="section" id="verein">
  <div class="container">
    <div class="verein-grid">
      <div class="verein-text reveal">
        <p class="label-upper section-eyebrow">Unser Verein</p>
        <h2 class="heading-display section-title" style="margin-bottom: 24px;">{{ .title }}</h2>
        {{ .text | markdownify }}

        {{ with .stats }}
        <div class="verein-stats">
          {{ range . }}
          <div class="stat-item">
            <p class="stat-number">{{ .number }}</p>
            <p class="stat-label">{{ .label }}</p>
          </div>
          {{ end }}
        </div>
        {{ end }}
      </div>

      <div class="verein-image-block reveal">
        {{ if .image }}
          <img src="{{ .image }}" alt="{{ .image_alt }}" class="verein-image-placeholder" style="object-fit: cover; height: 400px;">
        {{ else }}
          <div class="verein-image-placeholder">Bild: {{ .image_alt }}</div>
        {{ end }}
      </div>
    </div>
  </div>
</section>
{{ end }}
```

- [ ] **Step 6: Create cta.html partial**

```html
{{ with .Params.cta }}
<section class="section" id="mitgliedschaft" style="padding-bottom: 80px;">
  <div class="container">
    <div class="cta-banner reveal">
      <h2 class="heading-display cta-banner-title">{{ .title }}</h2>
      <p class="cta-banner-text">{{ .text }}</p>
      <a href="{{ .button_url }}" class="btn btn-primary">{{ .button_text }}</a>
    </div>
  </div>
</section>
{{ end }}
```

- [ ] **Step 7: Create homepage template (layouts/index.html)**

```html
{{ define "main" }}
  {{ partial "hero.html" . }}
  {{ partial "quickinfo.html" . }}
  {{ partial "aktuelles.html" . }}
  {{ partial "mannschaften.html" . }}
  {{ partial "training.html" . }}
  {{ partial "termine.html" . }}
  {{ partial "galerie.html" . }}
  {{ partial "instagram.html" . }}
  {{ partial "verein.html" . }}
  {{ partial "cta.html" . }}
  {{ partial "anfahrt.html" . }}
{{ end }}
```

- [ ] **Step 8: Verify hero, quickinfo, verein, CTA render**

Run: `hugo server -D`
Expected: Homepage shows hero + quick info cards + about + CTA banner (other partials will be empty stubs)

- [ ] **Step 9: Commit**

```bash
git add content/_index.md data/quickinfo.yaml layouts/index.html layouts/partials/hero.html layouts/partials/quickinfo.html layouts/partials/verein.html layouts/partials/cta.html
git commit -m "feat: add homepage with hero, quick info, about, and CTA sections"
```

---

## Task 7: News Section (Aktuelles)

**Files:**
- Create: `layouts/partials/aktuelles.html`
- Create: `layouts/aktuelles/list.html`
- Create: `layouts/aktuelles/single.html`
- Create: `content/aktuelles/_index.md`
- Create: `content/aktuelles/herren-40-auftakt.md`
- Create: `content/aktuelles/saisoneroeffnung-2026.md`

- [ ] **Step 1: Create sample news posts**

`content/aktuelles/_index.md`:
```markdown
---
title: "Aktuelles"
description: "Neuigkeiten, Spielberichte und Events vom TC Blau-Weiss Attendorn."
---
```

`content/aktuelles/herren-40-auftakt.md`:
```markdown
---
title: "Herren 40 gewinnen Auftaktspiel"
date: 2026-05-15
description: "Starker Saisonstart mit 5:1 Sieg gegen TC Olpe in der Bezirksliga."
image: "/images/news/herren40-auftakt.jpg"
tags: ["Herren 40", "Bezirksliga", "Spielbericht"]
---

Starker Saisonstart mit 5:1 Sieg gegen TC Olpe in der Bezirksliga. Die Mannschaft zeigte sich von Beginn an konzentriert und liess dem Gegner keine Chance.
```

`content/aktuelles/saisoneroeffnung-2026.md`:
```markdown
---
title: "Saisoneroeffnung 2026"
date: 2026-04-28
description: "Fotos und Eindruecke vom Saisonstart an der Burg Schnellenberg."
image: "/images/news/saisoneroeffnung.jpg"
tags: ["Event", "Saison 2026"]
---

Fotos und Eindruecke vom Saisonstart an der Burg Schnellenberg. Bei strahlendem Sonnenschein feierten wir gemeinsam den Beginn der neuen Saison.
```

- [ ] **Step 2: Create aktuelles.html homepage partial**

```html
{{ $news := where .Site.RegularPages "Section" "aktuelles" }}
{{ $latest := first 2 $news }}
{{ if $latest }}
<section class="section news-section" id="aktuelles">
  <div class="container">
    <div class="section-header reveal">
      <p class="label-upper section-eyebrow">Aktuelles</p>
      <h2 class="heading-display section-title">Neuigkeiten vom Platz</h2>
      <p class="section-subtitle">Spielberichte, Events und alles rund um unseren Verein.</p>
    </div>

    <div class="news-grid">
      {{ range $latest }}
      <a href="{{ .RelPermalink }}" class="news-card reveal">
        <div class="news-card-image">
          {{ with .Params.image }}
            <img src="{{ . }}" alt="{{ $.Title }}" style="width:100%;height:100%;object-fit:cover;">
          {{ else }}
            <span class="news-card-image-placeholder">{{ .Title }}</span>
          {{ end }}
        </div>
        <div class="news-card-body">
          <p class="news-card-date">{{ .Date.Format "2. January 2006" }}</p>
          <h3 class="news-card-title">{{ .Title }}</h3>
          <p class="news-card-excerpt">{{ .Description }}</p>
        </div>
      </a>
      {{ end }}
    </div>

    <div class="news-more reveal">
      <a href="/aktuelles/" class="btn-secondary">Alle Berichte ansehen</a>
    </div>
  </div>
</section>
{{ end }}
```

- [ ] **Step 3: Create news list template**

`layouts/aktuelles/list.html`:
```html
{{ define "main" }}
<section class="section" style="padding-top: 120px;">
  <div class="container">
    <div class="section-header">
      <p class="label-upper section-eyebrow">Aktuelles</p>
      <h2 class="heading-display section-title">Alle Berichte</h2>
    </div>
    <div class="news-grid">
      {{ range .Pages.ByDate.Reverse }}
      <a href="{{ .RelPermalink }}" class="news-card reveal">
        <div class="news-card-image">
          {{ with .Params.image }}
            <img src="{{ . }}" alt="{{ $.Title }}" style="width:100%;height:100%;object-fit:cover;">
          {{ else }}
            <span class="news-card-image-placeholder">{{ .Title }}</span>
          {{ end }}
        </div>
        <div class="news-card-body">
          <p class="news-card-date">{{ .Date.Format "2. January 2006" }}</p>
          <h3 class="news-card-title">{{ .Title }}</h3>
          <p class="news-card-excerpt">{{ .Description }}</p>
        </div>
      </a>
      {{ end }}
    </div>
  </div>
</section>
{{ end }}
```

- [ ] **Step 4: Create news single template**

`layouts/aktuelles/single.html`:
```html
{{ define "main" }}
<article class="section" style="padding-top: 120px;">
  <div class="container" style="max-width: 760px;">
    <p class="news-card-date">{{ .Date.Format "2. January 2006" }}</p>
    <h1 class="heading-display section-title" style="margin-bottom: 24px;">{{ .Title }}</h1>
    {{ with .Params.image }}
    <div style="border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 32px;">
      <img src="{{ . }}" alt="{{ $.Title }}" style="width:100%; display:block;">
    </div>
    {{ end }}
    <div class="article-content" style="font-size: 1.05rem; line-height: 1.8; color: var(--gray-600);">
      {{ .Content }}
    </div>
    <div style="margin-top: 48px;">
      <a href="/aktuelles/" class="btn-secondary">&larr; Zurueck zu Aktuelles</a>
    </div>
  </div>
</article>
{{ end }}
```

- [ ] **Step 5: Verify news section on homepage and individual pages**

Run: `hugo server -D`
Expected: Homepage shows 2 latest posts, `/aktuelles/` shows all, individual posts accessible.

- [ ] **Step 6: Commit**

```bash
git add content/aktuelles/ layouts/partials/aktuelles.html layouts/aktuelles/
git commit -m "feat: add news section with list and single templates"
```

---

## Task 8: Mannschaften Section

**Files:**
- Create: `layouts/partials/mannschaften.html`
- Create: `layouts/mannschaften/single.html`
- Create: `content/mannschaften/_index.md`
- Create: `content/mannschaften/herren.md`, `herren-40.md`, `herren-55.md`, `damen.md`, `damen-40.md`, `jugend.md`

- [ ] **Step 1: Create team content files**

`content/mannschaften/_index.md`:
```markdown
---
title: "Mannschaften"
description: "Unsere aktiven Teams im Ueberblick."
---
```

Create one file per team, e.g. `content/mannschaften/herren.md`:
```markdown
---
title: "Herren"
league: "Bezirksliga"
weight: 10
---

Informationen zur Herrenmannschaft folgen.
```

Repeat for: `herren-40.md` (Bezirksliga, w:20), `herren-55.md` (Kreisliga, w:30), `damen.md` (Bezirksklasse, w:40), `damen-40.md` (Kreisliga, w:50), `jugend.md` (Kreisliga, w:60).

- [ ] **Step 2: Create mannschaften.html homepage partial**

```html
{{ $teams := where .Site.RegularPages "Section" "mannschaften" }}
{{ if $teams }}
<section class="section" id="mannschaften">
  <div class="container">
    <div class="section-header reveal">
      <p class="label-upper section-eyebrow">Mannschaften</p>
      <h2 class="heading-display section-title">Unsere Teams</h2>
      <p class="section-subtitle">{{ len $teams }} Mannschaften vertreten unseren Verein in verschiedenen Ligen.</p>
    </div>

    <div class="teams-grid">
      {{ range $teams.ByWeight }}
      <a href="{{ .RelPermalink }}" class="team-card reveal">
        <div class="team-card-icon">&#127934;</div>
        <p class="team-card-name">{{ .Title }}</p>
        <p class="team-card-league">{{ .Params.league }}</p>
      </a>
      {{ end }}
    </div>
  </div>
</section>
{{ end }}
```

- [ ] **Step 3: Create single team template**

`layouts/mannschaften/single.html`:
```html
{{ define "main" }}
<section class="section" style="padding-top: 120px;">
  <div class="container" style="max-width: 760px;">
    <p class="label-upper section-eyebrow">Mannschaften</p>
    <h1 class="heading-display section-title">{{ .Title }}</h1>
    <p class="section-subtitle" style="margin-bottom: 32px;">{{ .Params.league }}</p>
    <div class="article-content" style="font-size: 1.05rem; line-height: 1.8; color: var(--gray-600);">
      {{ .Content }}
    </div>
    <div style="margin-top: 48px;">
      <a href="/mannschaften/" class="btn-secondary">&larr; Alle Mannschaften</a>
    </div>
  </div>
</section>
{{ end }}
```

- [ ] **Step 4: Verify teams render on homepage and individual pages**

Run: `hugo server -D`
Expected: 6 team cards on homepage, each linking to individual page.

- [ ] **Step 5: Commit**

```bash
git add content/mannschaften/ layouts/partials/mannschaften.html layouts/mannschaften/
git commit -m "feat: add teams section with individual team pages"
```

---

## Task 9: Training Section

**Files:**
- Create: `layouts/partials/training.html`
- Create: `content/training/_index.md`

- [ ] **Step 1: Create training content**

`content/training/_index.md`:
```markdown
---
title: "Training"
description: "Trainingszeiten und Trainer beim TC Blau-Weiss Attendorn."
schedule:
  - day: "Mo"
    time: "16:00 – 18:00"
    group: "Jugendtraining"
  - day: "Di"
    time: "18:00 – 20:00"
    group: "Erwachsene Anfaenger"
  - day: "Mi"
    time: "16:00 – 18:00"
    group: "Kinder (6–10 J.)"
  - day: "Do"
    time: "18:00 – 20:00"
    group: "Erwachsene Fortgeschr."
  - day: "Fr"
    time: "15:00 – 17:00"
    group: "Matchtraining"
trainers:
  - name: "Max Kowalski"
    initials: "MK"
    role: "Cheftrainer, B-Lizenz"
  - name: "Lisa Schmidt"
    initials: "LS"
    role: "Jugendtrainerin, C-Lizenz"
---
```

- [ ] **Step 2: Create training.html partial**

Extract training section from mockup, make dynamic with front matter data:

```html
{{ $training := .Site.GetPage "/training" }}
{{ with $training }}
<section class="section training-section" id="training">
  <div class="container">
    <div class="section-header reveal">
      <p class="label-upper section-eyebrow">Training</p>
      <h2 class="heading-display section-title">Trainingszeiten &amp; Trainer</h2>
      <p class="section-subtitle">Training fuer Anfaenger und Fortgeschrittene, Kinder und Erwachsene.</p>
    </div>

    <div class="training-grid">
      <div class="training-schedule reveal">
        {{ range .Params.schedule }}
        <div class="schedule-item">
          <span class="schedule-day">{{ .day }}</span>
          <span class="schedule-time">{{ .time }}</span>
          <span class="schedule-group">{{ .group }}</span>
        </div>
        {{ end }}
      </div>

      <div class="trainer-cards reveal">
        {{ range .Params.trainers }}
        <div class="trainer-card">
          <div class="trainer-avatar">{{ .initials }}</div>
          <div>
            <p class="trainer-name">{{ .name }}</p>
            <p class="trainer-role">{{ .role }}</p>
          </div>
        </div>
        {{ end }}
      </div>
    </div>
  </div>
</section>
{{ end }}
```

- [ ] **Step 3: Verify training section renders**

Run: `hugo server -D`
Expected: Dark training section with schedule table and trainer cards.

- [ ] **Step 4: Commit**

```bash
git add content/training/ layouts/partials/training.html
git commit -m "feat: add training section with schedule and trainers"
```

---

## Task 10: Termine Section

**Files:**
- Create: `layouts/partials/termine.html`
- Create: `content/termine/_index.md`

- [ ] **Step 1: Create events content**

`content/termine/_index.md`:
```markdown
---
title: "Termine"
description: "Kommende Veranstaltungen und Medenspiele."
events:
  - title: "Saisoneroeffnung 2026"
    date: 2026-04-28
    time: "14:00 Uhr"
    detail: "Clubhaus, alle Mitglieder willkommen"
  - title: "Herren 40 vs. TC Olpe"
    date: 2026-05-10
    time: "10:00 Uhr"
    detail: "Bezirksliga, Heimspiel"
  - title: "Vereinsmeisterschaften"
    date: 2026-06-14
    time: "09:00 Uhr"
    detail: "Einzel & Doppel, alle Altersklassen"
  - title: "Sommerfest"
    date: 2026-08-23
    time: "15:00 Uhr"
    detail: "Familienprogramm, Schleifchenturnier, Grillabend"
---
```

- [ ] **Step 2: Create termine.html partial**

```html
{{ $termine := .Site.GetPage "/termine" }}
{{ with $termine }}
<section class="section" id="termine">
  <div class="container">
    <div class="section-header reveal">
      <p class="label-upper section-eyebrow">Termine</p>
      <h2 class="heading-display section-title">Kommende Veranstaltungen</h2>
    </div>

    <div class="termine-list">
      {{ range .Params.events }}
      {{ $d := time .date }}
      <div class="termin-item reveal">
        <div class="termin-date-block">
          <p class="termin-day">{{ $d.Day }}</p>
          <p class="termin-month">{{ index (slice "" "Jan" "Feb" "Mär" "Apr" "Mai" "Jun" "Jul" "Aug" "Sep" "Okt" "Nov" "Dez") (int $d.Month) }}</p>
        </div>
        <div class="termin-divider"></div>
        <div>
          <p class="termin-title">{{ .title }}</p>
          <p class="termin-detail">{{ .detail }}</p>
        </div>
        <p class="termin-time">{{ .time }}</p>
      </div>
      {{ end }}
    </div>
  </div>
</section>
{{ end }}
```

- [ ] **Step 3: Verify termine section renders with German month abbreviations**

Run: `hugo server -D`
Expected: 4 events with date blocks, dividers, and time.

- [ ] **Step 4: Commit**

```bash
git add content/termine/ layouts/partials/termine.html
git commit -m "feat: add events section with date formatting"
```

---

## Task 11: Galerie, Instagram, Anfahrt Partials

**Files:**
- Create: `layouts/partials/galerie.html`
- Create: `layouts/partials/instagram.html`
- Create: `layouts/partials/anfahrt.html`
- Create: `content/galerie/_index.md`

- [ ] **Step 1: Create galerie.html partial**

```html
<section class="section" id="galerie" style="background: var(--gray-50);">
  <div class="container">
    <div class="section-header reveal">
      <p class="label-upper section-eyebrow">Galerie</p>
      <h2 class="heading-display section-title">Bilder aus dem Vereinsleben</h2>
      <p class="section-subtitle">Eindruecke von Spielen, Events und der Anlage an der Burg Schnellenberg.</p>
    </div>

    <div class="galerie-grid reveal">
      <div class="galerie-item"><div class="galerie-placeholder">Tennisanlage</div></div>
      <div class="galerie-item"><div class="galerie-placeholder">Mannschaft</div></div>
      <div class="galerie-item"><div class="galerie-placeholder">Turnier</div></div>
      <div class="galerie-item"><div class="galerie-placeholder">Clubhaus</div></div>
      <div class="galerie-item"><div class="galerie-placeholder">Jugend</div></div>
    </div>

    <div class="news-more reveal" style="margin-top: 32px;">
      <a href="/galerie/" class="btn-secondary">Alle Alben ansehen</a>
    </div>
  </div>
</section>
```

Note: Gallery will use placeholders for now. Real image management can be added later once content is available.

- [ ] **Step 2: Create instagram.html partial**

```html
<section class="section instagram-section">
  <div class="container">
    <div class="instagram-header reveal">
      <div>
        <p class="label-upper section-eyebrow">Social Media</p>
        <h2 class="heading-display section-title" style="font-size: 1.75rem;">Folge uns auf Instagram</h2>
      </div>
      {{ with .Site.Params.instagram }}
      <a href="{{ . }}" target="_blank" rel="noopener" class="instagram-handle">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        {{ $.Site.Params.instagramHandle }}
      </a>
      {{ end }}
    </div>

    <div class="instagram-grid reveal">
      <div class="instagram-post"><div class="instagram-post-placeholder">Bild 1</div></div>
      <div class="instagram-post"><div class="instagram-post-placeholder">Bild 2</div></div>
      <div class="instagram-post"><div class="instagram-post-placeholder">Bild 3</div></div>
      <div class="instagram-post"><div class="instagram-post-placeholder">Bild 4</div></div>
    </div>
  </div>
</section>
```

Note: Instagram embedding can be enhanced later with an API integration or manual image updates via DecapCMS.

- [ ] **Step 3: Create anfahrt.html partial**

```html
<section class="section" id="anfahrt" style="background: var(--gray-50);">
  <div class="container">
    <div class="section-header reveal">
      <p class="label-upper section-eyebrow">Anfahrt</p>
      <h2 class="heading-display section-title">So findest du uns</h2>
    </div>

    <div class="anfahrt-grid">
      <div class="map-placeholder reveal">
        <span class="map-pin">&#128205;</span>
        <span>Google Maps Einbettung</span>
        <span style="font-size: 0.8rem; color: var(--gray-300);">Tennisanlage {{ .Site.Params.address }}</span>
      </div>
      <div class="anfahrt-details reveal">
        <h3>Tennisanlage {{ .Site.Params.address }}</h3>
        <address>
          {{ .Site.Params.clubName }} e.V.<br>
          {{ .Site.Params.address }}<br>
          {{ .Site.Params.zip }} {{ .Site.Params.city }}
        </address>
        <p style="margin-top: 24px;">Die Tennisanlage befindet sich auf dem Gelaende der Burg Schnellenberg, oberhalb von Attendorn. Parkmoeglichkeiten sind direkt an der Anlage vorhanden.</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Create galerie content**

`content/galerie/_index.md`:
```markdown
---
title: "Galerie"
description: "Bilder aus dem Vereinsleben des TC Blau-Weiss Attendorn."
---
```

- [ ] **Step 5: Verify all three sections render on homepage**

Run: `hugo server -D`
Expected: Gallery grid, Instagram placeholders, and directions section all visible.

- [ ] **Step 6: Commit**

```bash
git add layouts/partials/galerie.html layouts/partials/instagram.html layouts/partials/anfahrt.html content/galerie/
git commit -m "feat: add gallery, Instagram, and directions sections"
```

---

## Task 12: Default List/Single Templates & Legal Pages

**Files:**
- Create: `layouts/_default/list.html`
- Create: `layouts/_default/single.html`
- Create: `content/seiten/impressum.md`
- Create: `content/seiten/datenschutz.md`
- Create: `content/verein/_index.md`

- [ ] **Step 1: Create default list template**

`layouts/_default/list.html`:
```html
{{ define "main" }}
<section class="section" style="padding-top: 120px;">
  <div class="container">
    <div class="section-header">
      <h1 class="heading-display section-title">{{ .Title }}</h1>
      {{ with .Description }}<p class="section-subtitle">{{ . }}</p>{{ end }}
    </div>
    <div style="font-size: 1.05rem; line-height: 1.8; color: var(--gray-600);">
      {{ .Content }}
    </div>
    {{ if .Pages }}
    <ul style="margin-top: 24px;">
      {{ range .Pages }}
      <li style="margin-bottom: 12px;">
        <a href="{{ .RelPermalink }}" style="color: var(--blue-600); font-weight: 600;">{{ .Title }}</a>
      </li>
      {{ end }}
    </ul>
    {{ end }}
  </div>
</section>
{{ end }}
```

- [ ] **Step 2: Create default single template**

`layouts/_default/single.html`:
```html
{{ define "main" }}
<article class="section" style="padding-top: 120px;">
  <div class="container" style="max-width: 760px;">
    <h1 class="heading-display section-title" style="margin-bottom: 24px;">{{ .Title }}</h1>
    <div class="article-content" style="font-size: 1.05rem; line-height: 1.8; color: var(--gray-600);">
      {{ .Content }}
    </div>
  </div>
</article>
{{ end }}
```

- [ ] **Step 3: Create legal pages**

`content/seiten/impressum.md`:
```markdown
---
title: "Impressum"
---

## Angaben gemaess § 5 TMG

TC Blau-Weiss Attendorn e.V.
Burg Schnellenberg
57439 Attendorn

**Vertreten durch:**
[Vorstandsvorsitzender eintragen]

**Kontakt:**
E-Mail: [E-Mail eintragen]

## Haftungsausschluss

[Haftungsausschluss-Text einfuegen]
```

`content/seiten/datenschutz.md`:
```markdown
---
title: "Datenschutzerklaerung"
---

## 1. Datenschutz auf einen Blick

### Allgemeine Hinweise

[Datenschutzerklaerung einfuegen]
```

- [ ] **Step 4: Create Verein overview**

`content/verein/_index.md`:
```markdown
---
title: "Verein"
description: "Alles rund um den TC Blau-Weiss Attendorn."
---
```

- [ ] **Step 5: Verify legal pages accessible**

Run: `hugo server -D`
Expected: `/seiten/impressum/` and `/seiten/datenschutz/` render correctly.

- [ ] **Step 6: Commit**

```bash
git add layouts/_default/list.html layouts/_default/single.html content/seiten/ content/verein/
git commit -m "feat: add default templates and legal pages"
```

---

## Task 13: DecapCMS Setup

**Files:**
- Create: `static/admin/index.html`
- Create: `static/admin/config.yml`

- [ ] **Step 1: Create DecapCMS admin page**

`static/admin/index.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMS — TC Blau-Weiss Attendorn</title>
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
</head>
<body>
</body>
</html>
```

- [ ] **Step 2: Create DecapCMS config**

`static/admin/config.yml`:
```yaml
backend:
  name: git-gateway
  branch: main

media_folder: "static/images"
public_folder: "/images"

locale: "de"

collections:
  - name: "aktuelles"
    label: "Aktuelles"
    folder: "content/aktuelles"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Titel", name: "title", widget: "string" }
      - { label: "Datum", name: "date", widget: "datetime" }
      - { label: "Beschreibung", name: "description", widget: "text" }
      - { label: "Bild", name: "image", widget: "image", required: false }
      - { label: "Tags", name: "tags", widget: "list", required: false }
      - { label: "Inhalt", name: "body", widget: "markdown" }

  - name: "mannschaften"
    label: "Mannschaften"
    folder: "content/mannschaften"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Name", name: "title", widget: "string" }
      - { label: "Liga", name: "league", widget: "string" }
      - { label: "Reihenfolge", name: "weight", widget: "number" }
      - { label: "Inhalt", name: "body", widget: "markdown" }

  - name: "termine"
    label: "Termine"
    file: "content/termine/_index.md"
    fields:
      - { label: "Titel", name: "title", widget: "string" }
      - { label: "Beschreibung", name: "description", widget: "string" }
      - label: "Veranstaltungen"
        name: "events"
        widget: "list"
        fields:
          - { label: "Titel", name: "title", widget: "string" }
          - { label: "Datum", name: "date", widget: "datetime" }
          - { label: "Uhrzeit", name: "time", widget: "string" }
          - { label: "Details", name: "detail", widget: "string" }

  - name: "training"
    label: "Training"
    file: "content/training/_index.md"
    fields:
      - { label: "Titel", name: "title", widget: "string" }
      - { label: "Beschreibung", name: "description", widget: "string" }
      - label: "Trainingszeiten"
        name: "schedule"
        widget: "list"
        fields:
          - { label: "Tag", name: "day", widget: "string" }
          - { label: "Zeit", name: "time", widget: "string" }
          - { label: "Gruppe", name: "group", widget: "string" }
      - label: "Trainer"
        name: "trainers"
        widget: "list"
        fields:
          - { label: "Name", name: "name", widget: "string" }
          - { label: "Kuerzel", name: "initials", widget: "string" }
          - { label: "Rolle", name: "role", widget: "string" }

  - name: "seiten"
    label: "Seiten"
    folder: "content/seiten"
    create: false
    slug: "{{slug}}"
    fields:
      - { label: "Titel", name: "title", widget: "string" }
      - { label: "Inhalt", name: "body", widget: "markdown" }

  - name: "homepage"
    label: "Startseite"
    file: "content/_index.md"
    fields:
      - { label: "Titel", name: "title", widget: "string" }
      - { label: "Beschreibung", name: "description", widget: "string" }
      - label: "Hero"
        name: "hero"
        widget: "object"
        fields:
          - { label: "Eyebrow", name: "eyebrow", widget: "string" }
          - { label: "Titel", name: "title", widget: "string" }
          - { label: "Untertitel", name: "subtitle", widget: "string" }
          - label: "CTA Primaer"
            name: "cta_primary"
            widget: "object"
            fields:
              - { label: "Text", name: "text", widget: "string" }
              - { label: "URL", name: "url", widget: "string" }
          - label: "CTA Sekundaer"
            name: "cta_secondary"
            widget: "object"
            fields:
              - { label: "Text", name: "text", widget: "string" }
              - { label: "URL", name: "url", widget: "string" }
      - label: "Verein"
        name: "verein"
        widget: "object"
        fields:
          - { label: "Titel", name: "title", widget: "string" }
          - { label: "Text", name: "text", widget: "markdown" }
          - label: "Statistiken"
            name: "stats"
            widget: "list"
            fields:
              - { label: "Zahl", name: "number", widget: "string" }
              - { label: "Label", name: "label", widget: "string" }
          - { label: "Bild", name: "image", widget: "image", required: false }
          - { label: "Bild Alt-Text", name: "image_alt", widget: "string", required: false }
      - label: "CTA"
        name: "cta"
        widget: "object"
        fields:
          - { label: "Titel", name: "title", widget: "string" }
          - { label: "Text", name: "text", widget: "string" }
          - { label: "Button Text", name: "button_text", widget: "string" }
          - { label: "Button URL", name: "button_url", widget: "string" }
```

- [ ] **Step 3: Verify DecapCMS page loads**

Run: `hugo server -D` and open `http://localhost:1313/admin/`
Expected: DecapCMS login page appears (won't authenticate locally, but should load UI).

- [ ] **Step 4: Commit**

```bash
git add static/admin/
git commit -m "feat: add DecapCMS admin with collection configs"
```

---

## Task 14: Cloudflare Pages Configuration

**Files:**
- Create: `.nvmrc` or `netlify.toml` (not needed for CF Pages, but helpful)
- Modify: `.gitignore`

- [ ] **Step 1: Update .gitignore for Hugo**

Append Hugo-specific ignores to `.gitignore`:

```
# Hugo
public/
resources/_gen/
.hugo_build.lock

# Superpowers brainstorm
.superpowers/
```

- [ ] **Step 2: Verify build works**

Run: `hugo --minify`
Expected: Site builds to `public/` directory without errors. Output shows page count.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: update gitignore for Hugo build artifacts"
```

- [ ] **Step 4: Document Cloudflare Pages setup**

The deployment setup (done in Cloudflare dashboard, not in code):
- Connect GitHub repo
- Build command: `hugo --minify`
- Build output directory: `public`
- Environment variable: `HUGO_VERSION` = `0.147.0` (or latest)
- Custom domain: `tc-bw-attendorn.de`

---

## Task 15: Final Verification & Cleanup

- [ ] **Step 1: Full build test**

```bash
hugo --minify --gc
```

Expected: Clean build, no warnings, all pages generated.

- [ ] **Step 2: Check all pages exist**

```bash
find public -name "index.html" | sort
```

Expected output should include:
- `public/index.html` (homepage)
- `public/aktuelles/index.html`
- `public/aktuelles/herren-40-auftakt/index.html`
- `public/aktuelles/saisoneroeffnung-2026/index.html`
- `public/mannschaften/index.html`
- `public/mannschaften/herren/index.html` (etc.)
- `public/termine/index.html`
- `public/training/index.html`
- `public/galerie/index.html`
- `public/verein/index.html`
- `public/seiten/impressum/index.html`
- `public/seiten/datenschutz/index.html`
- `public/admin/index.html`

- [ ] **Step 3: Visual verification in browser**

Run: `hugo server`
Check: Homepage looks like mockup, all sections present, navigation works, responsive on mobile.

- [ ] **Step 4: Clean up public directory**

```bash
rm -rf public/
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Hugo site with all sections and DecapCMS"
```