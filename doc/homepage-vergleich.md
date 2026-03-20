# Vergleich: Alte vs. Neue Homepage TC Blau-Weiss Attendorn

**Erstellt:** 2026-03-20
**Alte Seite:** WordPress auf IONOS (http://www.tc-bw-attendorn.de/)
**Neue Seite:** Hugo auf Cloudflare Pages (https://tc-bw-attendorn.de/)

---

## Bewertung im Ueberblick

| Kriterium | Alte Seite | Neue Seite | Verbesserung |
|-----------|:---------:|:----------:|:------------:|
| Sicherheit | 6 | 1-2 | +++ |
| SEO | 6 | 2 | +++ |
| Design | 5 | 1-2 | +++ |
| UX / Navigation | 5 | 2 | ++ |
| Content-Aktualitaet | 5 | 2 | +++ |
| Performance | 3-4 | 1 | ++ |
| Responsive Design | 3 | 2 | + |
| Barrierefreiheit | 4 | 2-3 | + |
| Wartbarkeit | 4 | 1-2 | ++ |
| Laufende Kosten | 5-10 EUR/Monat | 0 EUR/Monat | ++ |
| **Gesamt** | **5 (mangelhaft)** | **~1,5-2 (gut bis sehr gut)** | |

Notenskala: 1 (sehr gut) bis 6 (ungenuegend)

---

## Detailbewertung

### Sicherheit

**Alt: Note 6 (ungenuegend)**
- Kein HTTPS — alle Daten unverschluesselt uebertragen
- PHP 7.4 End-of-Life seit November 2022 — keine Sicherheitsupdates
- XML-RPC Schnittstelle offen — Brute-Force-Angriffsvektor
- WordPress REST-API oeffentlich zugaenglich
- Keine Security-Headers (X-Content-Type-Options, X-Frame-Options, CSP)
- Standard-WordPress-Login ohne 2FA oder Rate-Limiting

**Neu: Note 1-2 (sehr gut)**
- HTTPS automatisch via Cloudflare
- Kein Server, kein PHP, kein CMS-Backend — keine Angriffsflaeche
- DDoS-Schutz durch Cloudflare CDN inklusive
- Keine Datenbank, keine Login-Seite, keine API-Endpunkte
- Statische HTML-Dateien sind inhaerent sicher

**Was im schlimmsten Fall haette passieren koennen (alte Seite):**
1. **Server-Uebernahme** durch bekannte PHP 7.4 Schwachstellen — Angreifer haetten beliebigen Code ausfuehren, auf die Datenbank zugreifen oder Malware/Phishing unter der Vereinsdomain hosten koennen
2. **Admin-Account-Kompromittierung** ueber Brute-Force via xmlrpc.php
3. **Datenabfang** in oeffentlichen WLANs (Clubhaus) durch fehlende Verschluesselung — DSGVO-Verstoss
4. **SEO-Spam-Injection** — unsichtbare Casino/Viagra-Links in der Seite
5. **Defacement** — Startseite durch politische Botschaften oder "Hacked by"-Nachrichten ersetzt

Diese Angriffe passieren automatisiert durch Bots, die das Internet nach verwundbaren WordPress-Installationen scannen.

### SEO (Suchmaschinenoptimierung)

**Alt: Note 6 (ungenuegend)**
- Aktives `noindex, nofollow` Meta-Tag — Seite wurde von Google AUSGESCHLOSSEN
- Kein HTTPS (Ranking-Nachteil)
- Keine Meta-Description
- Interne Links auf `apps-1and1.net` statt eigene Domain
- 17 Bilder ohne Alt-Text
- Kein Schema.org Markup

**Neu: Note 2 (gut)**
- Saubere URLs und Seitenstruktur
- Meta-Descriptions auf allen Seiten
- Korrektes `lang="de"` Attribut
- HTTPS (Ranking-Vorteil)
- Schnelle Ladezeiten (positiver Ranking-Faktor)
- Noch ausbaufaehig: Schema.org Markup, Open Graph Tags

### Design

**Alt: Note 5 (mangelhaft)**
- "Sparkling" Theme von ~2015 (kostenloses Bootstrap-Theme)
- Kein sichtbares Vereinsbranding (kein Logo, keine Vereinsfarben)
- Blog-artige Startseite mit chronologischen Posts
- Keine visuelle Hierarchie
- IE7/8/9 Conditional Comments zeigen das Alter

**Neu: Note 1-2 (sehr gut)**
- Modernes, minimalistisches Design
- Vereinsfarben Blau/Weiss konsequent umgesetzt
- Typografie: DM Sans + Playfair Display
- Hero-Bereich mit Tennisplatz-Linien als grafisches Element
- Klare visuelle Hierarchie mit Eyebrows, Headings, Cards
- Vereinswappen als Logo und Favicon

### UX / Navigation

**Alt: Note 5 (mangelhaft)**
- 11 Menuepunkte auf einer Ebene (inkl. Impressum/Datenschutz)
- Keine Informationsarchitektur
- Wichtige Infos (naechster Termin, Platzbuchung) nicht hervorgehoben

**Neu: Note 2 (gut)**
- 5 klare Hauptmenuepunkte
- Rechtliches im Footer
- Quick-Info-Kacheln mit dynamischem naechsten Termin
- Courtbooking-CTA prominent in der Navigation
- Hamburger-Menu auf Mobilgeraeten

### Content-Aktualitaet

**Alt: Note 5 (mangelhaft)**
- Letzter Beitrag von April 2024
- Spielplan von 2022 als JPEG-Screenshot
- Satzung als 7 einzelne Bildschirmfotos
- Vorstand moeglicherweise veraltet

**Neu: Note 2 (gut)**
- Aktuelle Mannschaften Sommer 2026 mit echten Daten von liga.nu
- 7 Teams mit Spielplaenen und Liga-Links
- 18 Termine/Heimspiele eingepflegt
- Dynamische Anzeige: vergangene Events werden ausgeblendet
- Aktueller Vorstand und Ansprechpartner

### Performance

**Alt: Note 3-4 (befriedigend bis ausreichend)**
- WordPress mit PHP-Rendering bei jedem Seitenaufruf
- jQuery + jQuery UI + jQuery Migrate (grosser JS-Footprint)
- Uebergrosse Bilder (2048px breit)
- Keine Cache-Control Headers

**Neu: Note 1 (sehr gut)**
- Statische HTML-Dateien, kein Server-Rendering
- Cloudflare CDN weltweit verteilt
- Minimales JavaScript (37 Zeilen, kein jQuery)
- Typische Ladezeit < 1 Sekunde

### Responsive Design

**Alt: Note 3 (befriedigend)**
- Bootstrap sorgt fuer grundlegende Responsiveness
- Viewport-Meta-Tag vorhanden
- Nicht optimiert fuer verschiedene Geraeteklassen

**Neu: Note 2 (gut)**
- Mobil-optimiert mit Hamburger-Menu
- CSS Grid und Flexbox fuer flexible Layouts
- Angepasste Schriftgroessen und Abstande pro Breakpoint

### Barrierefreiheit

**Alt: Note 4 (ausreichend)**
- 17 Bilder mit leerem Alt-Text
- Spielplan und Satzung als Bilder (nicht vorlesbar)
- Skip-Link und lang-Attribut vorhanden

**Neu: Note 2-3 (gut bis befriedigend)**
- Alt-Texte auf relevanten Bildern
- Semantisches HTML (nav, main, section, article)
- Noch Potenzial: einige Platzhalterbilder ohne Alt-Text

### Wartbarkeit

**Alt: Note 4 (ausreichend)**
- WordPress erfordert regelmaessige Updates (Core, Theme, Plugins)
- PHP-Version muss aktuell gehalten werden
- Plugin-Konflikte moeglich
- Datenbank-Backups noetig

**Neu: Note 1-2 (sehr gut)**
- Kein Server zu warten
- Keine Sicherheitsupdates noetig
- Content als Markdown-Dateien in Git (versioniert, nachvollziehbar)
- Deployment automatisch bei Push auf main

### Laufende Kosten

**Alt: ~5-10 EUR/Monat** (IONOS WordPress Hosting)

**Neu: 0 EUR/Monat** (Cloudflare Pages Free Tier)

Ersparnis: 60-120 EUR/Jahr

---

## Kostenabschaetzung: Was haette eine Agentur berechnet?

### Leistungsumfang

- Konzept & Beratung
- Individuelles Design (Wireframes + Mockup)
- Entwicklung (Templates, CSS, JavaScript)
- Content-Migration und Aufbereitung
- CMS-Setup
- Deployment und Domain-Setup
- Testing und Bugfixing

### Kalkulation

| Posten | Stunden (geschaetzt) | Agenturpreis |
|--------|:-------------------:|:------------:|
| Konzept & Beratung | 8-12h | 800-1.500 EUR |
| Design (Wireframes + Mockup) | 16-24h | 1.600-3.000 EUR |
| Entwicklung (Templates, CSS, JS) | 24-40h | 2.400-5.000 EUR |
| Content-Migration & Aufbereitung | 8-16h | 800-2.000 EUR |
| CMS-Setup (DecapCMS) | 4-8h | 400-1.000 EUR |
| Deployment & Domain-Setup | 4-6h | 400-750 EUR |
| Testing & Bugfixing | 8-12h | 800-1.500 EUR |
| **Gesamt** | **72-118h** | **~7.000-15.000 EUR** |

### Stundensaetze (Marktdurchschnitt 2026)

- **Freelancer:** 80-130 EUR/Stunde
- **Agentur:** 120-180 EUR/Stunde

### Realistische Preisrange

| Anbieter-Typ | Preisrange | Anmerkung |
|-------------|:----------:|-----------|
| Guenstiger Freelancer | 4.000-6.000 EUR | Meist Standard-Templates, weniger individuell |
| Vereinspaket (Agentur) | 3.000-5.000 EUR | Standard-Templates, wenig Individualitaet |
| Mittelklasse-Agentur | 8.000-12.000 EUR | Individuelles Design, vergleichbar mit dieser Seite |
| Premium-Agentur | 12.000-20.000 EUR | Umfangreichere Beratung, Markenentwicklung |

**Realistischer Agenturpreis fuer eine Vereinswebsite dieser Qualitaet: 8.000-12.000 EUR**

---

## Fazit

Die neue Website ist in allen bewerteten Kategorien deutlich besser als die alte WordPress-Seite. Die gravierendsten Verbesserungen liegen in den Bereichen Sicherheit (von kritisch unsicher zu praktisch unangreifbar) und SEO (von aktiv blockiert zu gut optimiert). Die laufenden Kosten sinken von ~5-10 EUR/Monat auf 0 EUR/Monat.