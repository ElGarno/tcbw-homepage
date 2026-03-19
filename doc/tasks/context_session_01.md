# Context Session 01 - Homepage Modernization

## Project Goal
Modernize the homepage of tennis club TC-BW-Attendorn (http://www.tc-bw-attendorn.de/).
Replace the outdated, insecure site with a modern, maintainable solution.

## Current Status
- **Phase**: deployed, content refinement
- **Last Updated**: 2026-03-19
- **Blockers**: DecapCMS auth not yet configured

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
- [x] Add Mitgliedschaft & Beitraege (150/60/50/40 EUR)
- [x] Update Mannschaften (7 Teams Sommer 2026 mit echten Ligen, Kapitaenen)
- [x] Add Spielplaene zu allen Mannschaftsseiten (von liga.nu extrahiert)
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
- [ ] Echte Trainingszeiten eintragen (aktuell Beispieldaten)
- [ ] Echte Fotos fuer Homepage-Sektionen (Galerie, Verein-Bild)

## Backlog
- [ ] DecapCMS Authentication — Auth-Provider fuer Cloudflare Pages (parked, erstmal Markdown direkt editieren)
- [ ] Instagram Feed einbetten — braucht Meta Business Account + API Token, oder manuell Bilder pflegen
- [ ] Cron-Trigger fuer taeglichen Auto-Build (vergangene Termine ausblenden)
- [ ] Vorstandswechsel zu Gerlach/Kersting — aendern sobald offiziell
- [ ] Google Maps Embed mit korrektem Place-Pin (aktuell nur Koordinaten)

## Neues Projekt: Getraenkebuchungs-App
- **Status:** Brainstorming abgeschlossen, Tablet-Typ muss noch geklaert werden (iPad vs Android)
- **Optionen:** Siehe `Getraenkebuchung/brainstorming-optionen.md`
- **Naechster Schritt:** Tablet klaeren, dann Design finalisieren und Implementierungsplan erstellen

## Progress Log
### 2026-03-17
- Session initialized, project description read
- Homepage analysis completed (doc/agents/architecture/2026-03-17_homepage-analyse.md)
- Tech stack decided: Hugo + DecapCMS + Cloudflare Pages
- HTML mockup created and approved
- Full Hugo project implemented and pushed to GitHub
- Impressum und Datenschutzerklaerung hinzugefuegt
- Courtbooking URL konfiguriert

### 2026-03-19
- Cloudflare Pages Deployment eingerichtet (tcbw-homepage.pages.dev)
- pyproject.toml entfernt (verursachte Build-Fehler)
- Historie von alter HP uebernommen mit 3 Fotos
- Trainer: Vladislav "Mitzo" Hupertz mit Foto und Bio
- Vorstand aktualisiert: Gerlach/Kersting (neu), alle Ressorts
- Mitgliedschaft: Beitragstabelle erstellt
- 7 Mannschaften Sommer 2026 mit echten Daten von liga.nu:
  - Damen (Bezirksliga), Herren 30 (Kreisliga), Herren 40 (Suedwestfalenliga)
  - Herren 60 (Bezirksliga), Gemischt 1 (Bezirksklasse), Gemischt 2 (Kreisklasse)
  - Mixed U12 (Kreisklasse)
- Spielplaene von liga.nu extrahiert und auf allen Mannschaftsseiten eingebettet
- Anfahrt: Google Maps Embed, Koordinaten 51.120704/7.922630, Tel. Clubhaus
- Galerie full-bleed CSS
- Impressum auf neuen Vorstand aktualisiert
- Fabian Woerenkaemper als Verantwortlicher Digitales hinzugefuegt

## Known Details
- Club founded: 1931, 51 Gruendungsmitglieder
- Location: Schnellenberg 1, 57439 Attendorn (Koordinaten: 51.120704, 7.922630)
- Telefon Clubhaus: 0151-43168187
- E-Mail: vorstand@tc-bw-attendorn.de
- Geschaeftsfuehrung (NEU): Bastian Gerlach, Felix Kersting
- Finanzen: Martina Franz, Carsten Heimes
- Marketing: Bastian Gerlach, Paula Kersting
- Sportwart: Moritz Muhr / Jugendsportwart: Marc Horlacher
- Digitales: Fabian Woerenkaemper
- Beisitzer: Annika Foidl, Lisa Heiche, Tim Maier
- Trainer: Vladislav "Mitzo" Hupertz
- Instagram: @tcbwattendorn
- Facebook: tc.blauweiss.attendorn.de
- Courtbooking: tc-bw-attendorn.courtbooking.de
- 7 active teams (Sommer 2026), 4 courts
- Beitraege: Erwachsene 150 EUR, Schueler/Studenten 60 EUR, Kinder (Eltern Mitglied) 50 EUR, Vorschul-/Grundschulkinder 40 EUR
- GitHub: ElGarno/tcbw-homepage
- Hosting: Cloudflare Pages (tcbw-homepage.pages.dev)
- Domain: tc-bw-attendorn.de (noch bei IONOS)

## Open Questions
- DNS-Zugang bei IONOS — noetig um Domain auf Cloudflare zu zeigen
- DecapCMS Auth-Strategie fuer Cloudflare Pages (kein Netlify Identity verfuegbar)
  - Optionen: GitHub OAuth Backend, Cloudflare Access, oder externer Identity Provider
- Echte Trainingszeiten (aktuell Beispieldaten Mo-Fr)
- Fotos fuer Homepage: Galerie-Bilder, Instagram-Feed, Vereins-Sektionsbild
- Datenschutz-PDFs (Einwilligung Datenverarbeitung, Einverstaendniserklaerung) zum Download

## Files Modified
- `hugo.toml` — Site config, menu, courtbooking URL
- `layouts/` — 16 template files (baseof, index, partials, section templates, verein/single)
- `content/_index.md` — Homepage (Hero, Verein, CTA mit Beitraegen, 7 Mannschaften)
- `content/aktuelles/` — 2 Beispiel-News
- `content/mannschaften/` — 7 Teams mit Spielplaenen und liga.nu Links
- `content/training/_index.md` — Trainingszeiten + Vladislav Hupertz
- `content/termine/_index.md` — 4 Beispiel-Termine
- `content/verein/` — Vorstand, Historie (mit Fotos), Mitgliedschaft
- `content/seiten/` — Impressum (neuer Vorstand), Datenschutz
- `content/galerie/_index.md` — Platzhalter
- `data/quickinfo.yaml` — Quick info cards (7 Teams)
- `static/css/main.css` — Styles mit full-bleed, article-full-bleed
- `static/js/main.js` — Nav, mobile toggle, scroll reveal
- `static/admin/` — DecapCMS admin page + config
- `static/images/historie/` — 3 Fotos (1931, Burgansicht, Clubhaus)
- `static/images/trainer/Mico.jpg` — Trainerfoto
- `mockup/index.html` — Original HTML mockup

## Agent Outputs Referenced
- `doc/agents/architecture/2026-03-17_homepage-analyse.md` — Analyse aktuelle HP
- `doc/plans/2026-03-17-hugo-implementation.md` — Implementierungsplan