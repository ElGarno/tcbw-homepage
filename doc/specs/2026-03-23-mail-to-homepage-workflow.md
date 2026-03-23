# Spec: Mail-to-Homepage Workflow

## Overview

Automate the creation of Hugo content (news articles, quick-infos, events) from
emails. A GMX folder acts as the input queue, n8n on Synology NAS processes new
mails via Claude API, and the result is a GitHub Draft-PR for human review.

## Flow

```
GMX filter rule (vorstand@tc-bw-attendorn.de → "Homepage" folder)
  ─── or manual drag of any relevant mail into "Homepage" folder ───
    → n8n IMAP Trigger (watches "Homepage" folder)
    → Extract plain text (strip HTML if needed, normalize to UTF-8)
    → Claude API / Haiku (analyze + split + format)
    → GitHub API (branch + files + Draft-PR)
    → Pushover notification
    → Human reviews PR, adjusts if needed, merges
    → Cloudflare Pages auto-builds
```

## Components

### 1. GMX Folder "Homepage"

- GMX filter rule: mails from `vorstand@tc-bw-attendorn.de` are **copied** to
  folder "Homepage" (original stays in inbox)
- Any other relevant mail can be manually moved there
- n8n marks processed mails as read or moves them to "Homepage/Verarbeitet"
  after processing (fallback: mark as read + flagged if GMX does not support
  subfolder creation via IMAP)

### 2. n8n Workflow (Synology NAS)

**Trigger:** IMAP node watching "Homepage" folder for unread mails.

**Steps:**

1. **IMAP Trigger** — detect new unread mail in "Homepage" folder
2. **Extract** — get subject, sender, date, body. If HTML-only: strip tags to
   plain text. Normalize encoding to UTF-8.
3. **Claude API call** (model: `claude-haiku-4-5-20251001`) — send mail body
   with system prompt, receive structured JSON response via tool use
4. **Duplicate check** — for each Termin in the response, check against
   existing `content/termine/_index.md` by date + similar title. Skip
   duplicates.
5. **GitHub API**:
   - Create branch `aktuelles/YYYY-MM-DD-{short-subject-slug}`
   - Create new Markdown files for Beitraege/Quick-Infos in `content/aktuelles/`
   - For Termine: update `content/termine/_index.md` by appending new events
     to the existing YAML `events` array in the frontmatter
   - Create Draft-PR with summary of generated content
6. **Pushover** — notify with PR link:
   - Title: "Neuer Homepage-Entwurf"
   - Body: "X Beitraege, Y Quick-Infos, Z Termine aus Mail vom DD.MM.YYYY"
   - URL: Link to Draft-PR
7. **IMAP move/mark** — mark processed mail as read

**Error handling:**

- If any step fails (Claude API, GitHub API, IMAP), send Pushover error
  notification: "Homepage-Workflow fehlgeschlagen fuer Mail vom DD.MM.YYYY:
  {error}"
- Do NOT mark mail as read on failure — it will be retried on next trigger
- n8n's built-in retry mechanism (1 retry after 5 min) for transient failures

### 3. Claude API Prompt

The system prompt instructs Claude to:

- Remove greetings, sign-offs, emojis, filler text
- Analyze each topic/section in the mail
- For each topic, decide: **Beitrag**, **Quick-Info**, or **Termin**
- Respond using structured tool use (not free-form JSON)

**Decision criteria:**

| Type | When | Heuristic |
|------|------|-----------|
| Beitrag | Standalone article with substance | More than ~3 sentences of factual content (match report, season review, major announcement) |
| Quick-Info | Worth mentioning but too brief | 1-2 sentences, single result or short update |
| Termin | A specific date/event is mentioned | Contains a date + event name |

**Output schema (via tool use):**

```json
{
  "items": [
    {
      "type": "beitrag",
      "slug": "winterrueckblick-herren40",
      "title": "Herren 40: Klassenerhalt in letzter Sekunde",
      "description": "One-sentence summary",
      "tags": ["Herren 40", "Winterrunde"],
      "body": "Article body in markdown..."
    },
    {
      "type": "quickinfo",
      "slug": "herren30-saison",
      "title": "Herren 30 beenden Saison auf Platz 4",
      "description": "Summary",
      "tags": ["Herren 30"],
      "body": "Short text..."
    },
    {
      "type": "termin",
      "title": "Fruehjahrsarbeitseinsatz",
      "date": "2026-03-28",
      "time": "10:30 Uhr",
      "detail": "Anlage fit fuer die Sommersaison machen",
      "category": "event"
    }
  ]
}
```

### 4. File Generation

**Beitrag** → `content/aktuelles/YYYY-MM-DD-{slug}.md`:

```yaml
---
title: "..."
date: YYYY-MM-DD
description: "One-sentence summary"
tags: ["Team Name", "Category"]
---

Article body...
```

**Quick-Info** → `content/aktuelles/YYYY-MM-DD-{slug}.md`:

```yaml
---
title: "..."
date: YYYY-MM-DD
description: "Summary"
tags: ["Category"]
quickinfo: true
---

Short text...
```

Note: Quick-Infos are distinct from the homepage Quick-Info cards in
`data/quickinfo.yaml` (those are static navigation tiles like "Platzbuchung",
"Mannschaften"). Quick-Info articles are short news items displayed in the
Aktuelles section. The `quickinfo: true` frontmatter flag can be used by
templates to render them in a compact card style rather than full article layout.

**Termin** → appended to `content/termine/_index.md` YAML events array:

```yaml
- title: "Fruehjahrsarbeitseinsatz"
  date: 2026-03-28
  time: "10:30 Uhr"
  detail: "Anlage fit fuer die Sommersaison machen"
  category: "event"
```

The workflow reads the existing `_index.md`, parses the frontmatter YAML,
appends new events (skipping duplicates), sorts by date, and writes back.

### 5. GitHub Draft-PR

- Branch: `aktuelles/YYYY-MM-DD-{short-subject-slug}`
- Commit: `feat(aktuelles): add content from mail YYYY-MM-DD`
- PR title: `[Aktuelles] Neue Inhalte aus Mail vom DD.MM.YYYY`
- PR body: summary table listing all created files with type and title
- Created as **Draft** — does not auto-merge

## Example

**Input:** Vorstand-Mail from March 2026 with winter reviews, summer outlook,
two events.

**Output PR contains:**

| Type | File | Title |
|------|------|-------|
| Beitrag | `content/aktuelles/2026-03-23-winterrueckblick-damen.md` | Damen: Abstieg aus Suedwestfalenliga |
| Beitrag | `content/aktuelles/2026-03-23-winterrueckblick-herren40.md` | Herren 40: Klassenerhalt in letzter Sekunde |
| Quick-Info | `content/aktuelles/2026-03-23-herren30-saison.md` | Herren 30 beenden Saison auf Platz 4 |
| Beitrag | `content/aktuelles/2026-03-23-ausblick-sommer.md` | Sommer 2026: Sechs Teams und erste Jugendmannschaft |
| Termin | `content/termine/_index.md` (appended) | Fruehjahrsarbeitseinsatz |
| Termin | `content/termine/_index.md` (appended) | Jahreshauptversammlung |

## Cost Estimate

- Claude API (Haiku): ~$0.01–0.03 per mail → ~$0.20/year
- n8n: already running on Synology
- GitHub API: free
- Pushover: already in use

## Decisions

- **v1 ignores images in mails.** Only text content is processed. Image
  handling can be added later if needed.
- **Duplicate Termine are skipped.** Match by date + title similarity.
- **Claude model: Haiku.** Sufficient for structured text extraction from
  German emails, significantly cheaper than Sonnet/Opus.
- **GMX IMAP access** requires app-specific password. Verify GMX account tier
  supports persistent IMAP connections from NAS.

## Open Questions

- GMX IMAP credentials and app password setup
- Does the Aktuelles template need changes to support `quickinfo: true`
  rendering as compact cards? (Can be deferred to implementation plan)