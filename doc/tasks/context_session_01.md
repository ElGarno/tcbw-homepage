# Context Session 01 - Homepage Modernization

## Project Goal
Modernize the homepage of tennis club TC-BW-Attendorn (https://tc-bw-attendorn.de/).
Replace the outdated, insecure site with a modern, maintainable solution.

## Current Status
- **Phase**: deployed, content refinement + automation
- **Last Updated**: 2026-04-24
- **Blockers**: None — nuliga-sync Code fertig & gemerged (PR #6), nur n8n-UI-Setup offen

## Tasks
- [x] Analyze current homepage
- [x] Define tech stack (Hugo + DecapCMS + Cloudflare Pages)
- [x] Design site structure
- [x] Create HTML mockup — approved by user
- [x] Implement Hugo project (32 pages, all sections)
- [x] Set up DecapCMS admin config (all collections defined)
- [x] Add real Impressum and Datenschutzerklaerung
- [x] Push to GitHub (ElGarno/tcbw-homepage)
- [x] Deploy to Cloudflare Pages (tcbw-homepage.pages.dev)
- [x] Configure courtbooking link (tc-bw-attendorn.courtbooking.de)
- [x] Add Historie (Vereinsgeschichte seit 1931 mit 3 Fotos)
- [x] Add real trainer data (Vladislav "Mitzo" Hupertz mit Foto)
- [x] Add Vorstand & Ansprechpartner (aktuell Huette/Feldmann)
- [x] Add Mitgliedschaft & Beiträge (150/60/50/40 EUR)
- [x] Update Mannschaften (7 Teams Sommer 2026 mit echten Ligen, Kapitänen)
- [x] Add Spielpläne zu allen Mannschaftsseiten (von liga.nu extrahiert)
- [x] Add liga.nu Links zu allen Mannschaftsseiten
- [x] Anfahrt mit Google Maps Embed, Koordinaten, Clubhaus-Telefon
- [x] Galerie full-bleed CSS
- [x] Impressum korrigiert (Huette/Feldmann)
- [x] Connect custom domain (tc-bw-attendorn.de) — Nameserver auf Cloudflare umgestellt
- [x] Termine: Kategorien (Medenspiel/Event) mit Farbcoding + Filter
- [x] Termine: vergangene Events automatisch ausblenden
- [x] Alle Heimspiele als Termine eingepflegt (18 Events)
- [x] Hero CTA "Platz buchen" → "Termine ansehen"
- [x] Courtbooking-Link in Quick-Info Kachel korrigiert
- [x] Tabellen-Styling (Zebra-Stripes, Hover, Spacing)
- [x] Datenschutz-PDFs als Download auf Mitgliedschafts-Seite
- [x] Wappen bereinigt (grüner Hintergrund entfernt, transparentes PNG)
- [x] Wappen auf Homepage und Favicons aktualisiert
- [x] Training-Sektion deaktiviert (Trainer nicht mehr im Verein)
- [x] Artikel-Detailseite redesigned (dunkler Header, Tags, bessere Typografie)
- [x] Alle Umlaute korrigiert (ae/oe/ue → ä/ö/ü/ß) in allen Content-Dateien
- [x] Daily Deploy Cronjob via n8n + Cloudflare Deploy Hook eingerichtet
- [x] Mail-to-Homepage Workflow: Spec geschrieben und reviewed
- [x] Mail-to-Homepage Workflow: n8n JSON erstellt (IMAP + AI Agent + GitHub API)
- [x] Mail-to-Homepage Workflow: Erster erfolgreicher Durchlauf (PR #3 merged)
- [ ] Echte Fotos für Homepage-Sektionen (Galerie, Verein-Bild)
- [x] Liga.nu Auto-Sync Workflow implementiert und nach main gemerged (PR #6)
- [ ] nuliga-sync: n8n-Workflow aus JSON importieren, Config-Node + Bundle einrichten, Test-Run

## Backlog
- [ ] DecapCMS Authentication — Auth-Provider für Cloudflare Pages (parked)
- [ ] Instagram Feed einbetten — braucht Meta Business Account + API Token
- [ ] Vorstandswechsel zu Gerlach/Kersting — ändern sobald offiziell
- [ ] Google Maps Embed mit korrektem Place-Pin (aktuell nur Koordinaten)
- [ ] Mail-to-Homepage: Pushover-Fehlerbenachrichtigung als separater Error-Workflow
- [ ] Mail-to-Homepage: Branch-Kollisionsvermeidung (Timestamp oder vorher löschen)

## Neues Projekt: Getränkebuchungs-App
- **Status:** Brainstorming abgeschlossen, Tablet-Typ muss noch geklärt werden (iPad vs Android)
- **Optionen:** Siehe `Getraenkebuchung/brainstorming-optionen.md`
- **Nächster Schritt:** Tablet klären, dann Design finalisieren und Implementierungsplan erstellen

## Progress Log
### 2026-04-24
- nuliga-sync Code und JSON nach Review angepasst:
  - `Config`-Set-Node am Workflow-Anfang statt Docker-Env-Vars (n8n self-hosted free hat kein Workflow-Env-Var-UI)
  - Tokens (GitHub PAT, Pushover) werden im Config-Node direkt eingetragen
  - Nur `NODE_FUNCTION_ALLOW_EXTERNAL=cheerio,js-yaml` bleibt als Docker-Compose-Einstellung
  - Deployment-Guide entsprechend überarbeitet
- Commit 66c8ebb auf main
- Nächste Schritte (liegen beim User): n8n-Import, Bundle paste, Test-Run, Forced-Diff-Test, Activate

### 2026-04-20
- Spielplan-Update: Änderungen von liga.nu (Herren 30, 40, 60, Gemischt 1+2) in Mannschafts-MDs und termine/_index.md eingepflegt (commit 2efab03)
- PR #5 (JHV-Korrektur) gemerged, 3 stale Branches gelöscht
- Liga.nu Auto-Sync Workflow auf feature/nuliga-sync implementiert:
  - Standalone JS unter `tools/nuliga-sync/` mit 47 Tests (Node built-in test runner)
  - Module: normalize, parser (cheerio), mdReader, mdWriter, diff, termineUpdater, prBody, teams, syncRunner
  - Migration: team+opponent Markerfelder zu medenspiel-Einträgen hinzugefügt
  - Migration: Opponent-Namen in Mannschafts-MDs auf liga.nu canonical form (TC BW Sundern → TC Blau-Weiß Sundern, TC Iserlohn → Tennisclub Iserlohn, TC RW Hagen → TC Rot-Weiß Hagen)
  - Baseline script: `npm run baseline` → 0 Diffs gegen live liga.nu
  - Bundle script: `npm run bundle` → `dist/n8n-bundle.js` zum Paste in n8n Code node
  - n8n JSON Skelett: `doc/specs/n8n-nuliga-sync.json` (Cron → Sync-Logic Code Node → If → Pushover)
  - Deployment-Doku: `doc/specs/2026-04-20-nuliga-sync-deployment.md`
- Spec: `doc/specs/2026-04-20-nuliga-sync-workflow.md`
- Plan: `doc/plans/2026-04-20-nuliga-sync-implementation.md`
- Noch offen: n8n-Workflow im UI bauen (Env-Vars setzen, Bundle paste, Credentials, Test Run)

### 2026-03-17
- Session initialized, project description read
- Homepage analysis completed (doc/agents/architecture/2026-03-17_homepage-analyse.md)
- Tech stack decided: Hugo + DecapCMS + Cloudflare Pages
- HTML mockup created and approved
- Full Hugo project implemented and pushed to GitHub
- Impressum und Datenschutzerklaerung hinzugefügt
- Courtbooking URL konfiguriert

### 2026-03-19
- Cloudflare Pages Deployment eingerichtet (tcbw-homepage.pages.dev)
- pyproject.toml entfernt (verursachte Build-Fehler)
- Historie von alter HP übernommen mit 3 Fotos
- Trainer: Vladislav "Mitzo" Hupertz mit Foto und Bio
- Vorstand aktualisiert: Gerlach/Kersting (neu), alle Ressorts
- Mitgliedschaft: Beitragstabelle erstellt
- 7 Mannschaften Sommer 2026 mit echten Daten von liga.nu
- Spielpläne von liga.nu extrahiert und auf allen Mannschaftsseiten eingebettet
- Anfahrt: Google Maps Embed, Koordinaten, Tel. Clubhaus
- Galerie full-bleed CSS
- Impressum auf neuen Vorstand aktualisiert

### 2026-03-23
- Wappen bereinigt: Grünen Hintergrund per Python/Pillow entfernt, schwarzen Rahmen erhalten
- Neues Wappen auf Homepage ersetzt, CSS bereinigt (schwarzer Hintergrund, Rahmen entfernt)
- Favicons aus neuem Wappen regeneriert (16x16, 32x32, .ico)
- Training-Sektion komplett deaktiviert (auskommentiert, nicht gelöscht) — Vladislav Hupertz nicht mehr Trainer
- Mail-to-Homepage Workflow designed und implementiert:
  - Spec: `doc/specs/2026-03-23-mail-to-homepage-workflow.md`
  - n8n Workflow JSON: `doc/specs/n8n-mail-to-homepage.json`
  - Claude API Prompt: `doc/specs/n8n-mail-to-homepage-prompt.md`
  - Flow: GMX IMAP → Text extrahieren → AI Agent (Haiku) → Duplikat-Check → GitHub Git Trees API → Draft-PR → Pushover
  - Mehrere Iterationen: IMAP-Feldnamen, UTF-8 Encoding, Template-Literal-Escaping, SHA-Konflikte (→ Git Trees API)
  - Erster erfolgreicher Durchlauf: PR #3 automatisch aus Vorstandsmail erstellt und gemerged
- Daily Deploy Cronjob: n8n Workflow mit Cloudflare Deploy Hook (täglich 06:00)
  - Spec: `doc/specs/2026-03-23-daily-deploy-cronjob.md`
  - n8n JSON: `doc/specs/n8n-daily-deploy.json`
  - If-Node fix: `$json.success` statt `$json.statusCode` prüfen (Cloudflare API gibt Boolean zurück)
- Artikel-Detailseite redesigned: Dunkler Header mit Datum/Tags/Beschreibung, bessere Content-Typografie
- Alle Umlaute in Content, Templates, Config und Daten korrigiert (21 Dateien)

## Known Details
- Club founded: 1931, 51 Gründungsmitglieder
- Location: Schnellenberg 1, 57439 Attendorn (Koordinaten: 51.120704, 7.922630)
- Telefon Clubhaus: 0151-43168187
- E-Mail: vorstand@tc-bw-attendorn.de
- Geschäftsführung (NEU): Bastian Gerlach, Felix Kersting
- Finanzen: Martina Franz, Carsten Heimes
- Marketing: Bastian Gerlach, Paula Kersting
- Sportwart: Moritz Muhr / Jugendsportwart: Marc Horlacher
- Digitales: Fabian Wörenkaemper
- Beisitzer: Annika Foidl, Lisa Heiche, Tim Maier
- Trainer: Keiner aktuell (Vladislav Hupertz nicht mehr im Verein)
- Instagram: @tcbwattendorn
- Facebook: tc.blauweiss.attendorn.de
- Courtbooking: tc-bw-attendorn.courtbooking.de
- 7 active teams (Sommer 2026), 4 courts
- Beiträge: Erwachsene 150 EUR, Schüler/Studenten 60 EUR, Kinder (Eltern Mitglied) 50 EUR, Vorschul-/Grundschulkinder 40 EUR
- GitHub: ElGarno/tcbw-homepage
- Hosting: Cloudflare Pages (tcbw-homepage.pages.dev)
- Domain: tc-bw-attendorn.de (DNS über Cloudflare)
- GMX-Konto: faffi@gmx.de (IMAP für n8n, Ordner "Homepage")

## Open Questions
- DecapCMS Auth-Strategie für Cloudflare Pages (kein Netlify Identity verfügbar)
- Echte Fotos für Homepage: Galerie-Bilder, Instagram-Feed, Vereins-Sektionsbild
- Mail-to-Homepage: Encoding-Probleme bei GMX noch vollständig gelöst? (fixEncoding Funktion)
- n8n Version 2.1.4 hat Einschränkungen (IMAP Node, Error Workflows) — Update erwägen?

## Files Modified (Session 2026-03-23)
- `static/images/wappen.png` — Neues bereinigtes Wappen
- `static/css/main.css` — Wappen CSS bereinigt, Artikel-Detail-Styles
- `static/favicon*.png`, `static/favicon.ico` — Neue Favicons
- `layouts/index.html` — Training-Partial deaktiviert
- `layouts/aktuelles/single.html` — Artikel-Detailseite redesigned
- `hugo.toml` — Training-Menü deaktiviert, Umlaute
- `data/quickinfo.yaml` — Training-Kachel deaktiviert, Umlaute
- `content/**/*.md` — Umlaute korrigiert (21 Dateien)
- `layouts/**/*.html` — Umlaute korrigiert
- `doc/specs/2026-03-23-mail-to-homepage-workflow.md` — Workflow-Spec
- `doc/specs/n8n-mail-to-homepage.json` — n8n Workflow
- `doc/specs/n8n-mail-to-homepage-prompt.md` — Claude API Prompt
- `doc/specs/2026-03-23-daily-deploy-cronjob.md` — Daily Deploy Spec
- `doc/specs/n8n-daily-deploy.json` — Daily Deploy n8n Workflow

## Agent Outputs Referenced
- `doc/agents/architecture/2026-03-17_homepage-analyse.md` — Analyse aktuelle HP
- `doc/plans/2026-03-17-hugo-implementation.md` — Implementierungsplan