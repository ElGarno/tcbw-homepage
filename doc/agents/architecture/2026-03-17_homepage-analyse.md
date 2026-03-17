# Analyse der aktuellen Homepage TC-Blau-Weiss Attendorn

**URL**: http://www.tc-bw-attendorn.de/
**Backend-URL**: http://tcblauweissattendorn.apps-1and1.net/
**Analysedatum**: 2026-03-17

---

## 1. Technische Grundlage

| Aspekt | Details |
|--------|---------|
| **CMS** | WordPress (Version nicht sichtbar, aber aktueller Core 6.9.1) |
| **Hosting** | 1&1 (IONOS) - `apps-1and1.net` |
| **Server** | Apache |
| **PHP-Version** | 7.4.33 (EOL seit November 2022!) |
| **Theme** | "Sparkling" von Colorlib (Bootstrap-basiert) |
| **CSS-Framework** | Bootstrap (eingebunden ueber Theme) |
| **JavaScript** | jQuery 3.7.1, jQuery Migrate 3.4.1, jQuery UI |
| **Icons** | Font Awesome 5.1.1 |
| **Plugins** | `imagelightbox`, `wp-simple-booking-calendar` |

---

## 2. Security - KRITISCH

### Schweregrad: HOCH

| Problem | Bewertung | Beschreibung |
|---------|-----------|-------------|
| **Kein HTTPS** | KRITISCH | Seite nur ueber HTTP erreichbar. HTTPS-Verbindung scheitert (Connection Refused). Alle Daten werden unverschluesselt uebertragen. |
| **PHP 7.4 EOL** | KRITISCH | PHP 7.4 hat seit November 2022 keine Sicherheitsupdates mehr. Bekannte Schwachstellen werden nicht gepatcht. |
| **Fehlende Security Headers** | HOCH | Keine Security-Header vorhanden (kein `X-Content-Type-Options`, kein `X-Frame-Options`, kein `Content-Security-Policy`, kein `Strict-Transport-Security`). |
| **XML-RPC exponiert** | MITTEL | `xmlrpc.php` ist erreichbar - haeufiger Angriffsvektor fuer Brute-Force-Attacken und DDoS-Amplification. |
| **WP-JSON API offen** | MITTEL | REST API unter `/wp-json/` oeffentlich zugaenglich, liefert Informationen ueber Benutzer und Struktur. |
| **Backend-URL sichtbar** | NIEDRIG | Internes Backend `tcblauweissattendorn.apps-1and1.net` ist in allen Links sichtbar - Domain-Mapping nicht korrekt konfiguriert. |
| **WordPress Login** | MITTEL | Standard-WP-Login vermutlich unter `/wp-admin/` erreichbar ohne 2FA oder Rate-Limiting. |

### Zusammenfassung Security
Die Seite ist aus Sicherheitsperspektive nicht tragbar. Fehlende Verschluesselung und eine veraltete PHP-Version stellen ein ernstes Risiko dar, insbesondere da WordPress ein haeufiges Angriffsziel ist.

---

## 3. Design & User Experience

### Schweregrad: HOCH

| Problem | Bewertung | Beschreibung |
|---------|-----------|-------------|
| **Veraltetes Theme** | HOCH | "Sparkling" ist ein kostenloses Theme von ~2015, visuell veraltet. Bootstrap-basiert, aber mit IE7/8/9-Conditional-Comments - zeigt das Alter. |
| **Kein einheitliches Branding** | HOCH | Kein sichtbares Logo oder Vereinsfarben-Konzept (Blau-Weiss) im Theme. |
| **Blog-artige Startseite** | MITTEL | Startseite zeigt Blog-Posts chronologisch - kein Hero-Bereich, keine Highlights, keine klare Informationsarchitektur. |
| **Unstrukturierte Navigation** | MITTEL | Navigation mischt verschiedene Ebenen: "Ansprechpartner", "Termine", "Mitgliedschaften", "Daten & Fakten", "Anfahrt", "Mannschaften", "Trainer", "Historie", "Galerie", "Impressum", "Datenschutzerklaerung". Impressum/Datenschutz gehoeren in den Footer. |
| **Fehlende visuelle Hierarchie** | MITTEL | Alle Inhalte gleichwertig dargestellt, kein visueller Fokus auf wichtige Infos (naechste Termine, Neuigkeiten). |
| **Responsive** | OK | Viewport-Meta-Tag vorhanden, Bootstrap sorgt fuer grundlegende Responsiveness. |

---

## 4. Content & Aktualitaet

### Schweregrad: HOCH

| Problem | Bewertung | Beschreibung |
|---------|-----------|-------------|
| **Veralteter Content** | KRITISCH | Neuester Beitrag: "Unsere Termine 2024" (April 2024). Davor: "Schnuppermitgliedschaft 2023" (April 2023). Seite wirkt seit fast einem Jahr unaktuell. |
| **Fehlende aktuelle Informationen** | HOCH | Keine Spielergebnisse 2025/2026, keine aktuellen Termine, kein Saisonueberblick. |
| **Spielplan als Bild** | MITTEL | Spielplan 2022 als JPEG-Screenshot eingebunden - nicht suchbar, nicht aktualisierbar, nicht barrierefrei. |
| **Satzung als Bilder** | MITTEL | Vereinssatzung als 7 einzelne JPEG-Screenshots statt als durchsuchbares PDF. |
| **Nur ein Autor** | NIEDRIG | Alle Beitraege von "Editor" - kein multi-author Konzept sichtbar genutzt. |
| **Inhalte**: | | |
| - Vereinsvorstand (2022) | | Moeglicherweise veraltet |
| - Schnuppermitgliedschaft 2023 | | Abgelaufen |
| - Wall des Sports (2022) | | Historisch |
| - Satzungsentwurf (2022) | | Veraltet |

### Seitenstruktur (Navigation)
1. Ansprechpartner
2. Termine
3. Mitgliedschaften
4. Daten & Fakten
5. Anfahrt
6. Mannschaften
7. Trainer
8. Historie
9. Galerie
10. Impressum
11. Datenschutzerklaerung

---

## 5. SEO

### Schweregrad: HOCH

| Problem | Bewertung | Beschreibung |
|---------|-----------|-------------|
| **noindex, nofollow** | KRITISCH | Meta-Tag `<meta name='robots' content='noindex, nofollow' />` - die Seite wird aktiv von Suchmaschinen AUSGESCHLOSSEN! Google indexiert die Seite nicht. |
| **Kein HTTPS** | HOCH | Google bevorzugt HTTPS-Seiten im Ranking. |
| **Fehlende Meta-Description** | HOCH | Keine Meta-Description vorhanden. |
| **Title-Tag** | MITTEL | Nur "TC-Blau-Weiss Attendorn" - kein beschreibender Zusatz (z.B. "Tennisclub in Attendorn"). |
| **URL-Struktur** | MITTEL | Interne Links zeigen auf `tcblauweissattendorn.apps-1and1.net` statt auf die eigentliche Domain `tc-bw-attendorn.de`. |
| **Fehlende strukturierte Daten** | MITTEL | Kein Schema.org Markup (LocalBusiness, SportsOrganization). |
| **Bilder ohne Alt-Text** | HOCH | 17 Bilder mit leerem `alt=""`-Attribut gefunden. Schlecht fuer SEO und Barrierefreiheit. |
| **RSS-Feed** | OK | Vorhanden unter `/feed/`. |

### Zusammenfassung SEO
Die Seite ist de facto unsichtbar fuer Suchmaschinen durch das `noindex`-Tag. Selbst wenn das entfernt wuerde, fehlen grundlegende SEO-Massnahmen.

---

## 6. Barrierefreiheit (Accessibility)

### Schweregrad: MITTEL

| Problem | Bewertung | Beschreibung |
|---------|-----------|-------------|
| **Leere Alt-Texte** | HOCH | 17 Bilder ohne beschreibenden Alt-Text. Screenreader koennen Bildinhalt nicht vermitteln. |
| **Spielplan als Bild** | HOCH | Tabellarische Daten als Bilddatei - fuer Screenreader unzugaenglich. |
| **Satzung als Bilder** | HOCH | Text als Bilder - nicht suchbar, nicht vorlesbar. |
| **Skip-Link** | OK | Skip-to-content Link vorhanden (`#content`). |
| **Sprachattribut** | OK | `lang="de"` gesetzt. |
| **Keine ARIA-Labels** | MITTEL | Keine ARIA-Attribute fuer interaktive Elemente erkennbar. |

---

## 7. Performance

### Schweregrad: MITTEL

| Problem | Bewertung | Beschreibung |
|---------|-----------|-------------|
| **Uebergrosse Bilder** | MITTEL | Bilder werden in voller Aufloesung geladen (z.B. 2048px breit), WordPress generiert zwar Thumbnails, aber Original-Links sind verfuegbar. |
| **jQuery + jQuery UI** | MITTEL | Veraltete JavaScript-Bibliotheken mit grossem Footprint. |
| **Kein Caching-Header** | MITTEL | Keine Cache-Control Header in der HTTP-Antwort. |
| **Inline CSS** | NIEDRIG | Mehrere Inline-CSS-Bloecke im `<head>`, die Rendering blockieren. |

---

## 8. Social Media Integration

### Schweregrad: NIEDRIG

| Aspekt | Status |
|--------|--------|
| **Facebook** | Link vorhanden: `facebook.com/tc.blauweiss.attendorn.de` |
| **Instagram** | Link vorhanden: `instagram.com/tcbwattendorn/` |
| **Social Media Seite** | Eigene Seite "Unsere Social Media Kanaele" existiert |
| **Einbettung** | Keine Einbettung von Social-Media-Feeds auf der Startseite |
| **Open Graph Tags** | Nicht vorhanden - geteilte Links haben kein Vorschaubild. |

---

## 9. Funktionalitaet

| Feature | Status | Bewertung |
|---------|--------|-----------|
| **Buchungskalender** | Plugin `wp-simple-booking-calendar` installiert | UNKLAR ob funktional |
| **Kontaktformular** | Seite "Kontakt" vorhanden | UNKLAR |
| **Bildergalerie** | Seite "Galerie" vorhanden, `imagelightbox` Plugin | UNKLAR |
| **Suchfunktion** | Nicht sichtbar in Navigation | FEHLT |
| **Newsletter** | Nicht vorhanden | FEHLT |
| **Veranstaltungskalender** | Nur statische Seiten ("Termine 2024") | MANGELHAFT |
| **Spielergebnisse** | Nur als Bild (Spielplan 2022) | MANGELHAFT |
| **Mitgliederbereich** | Nicht vorhanden | FEHLT |

---

## 10. Gesamtbewertung

```
Bereich               Bewertung    Note
──────────────────────────────────────────
Security              KRITISCH     6 (ungenuegend)
SEO                   KRITISCH     6 (ungenuegend)
Content-Aktualitaet   SCHLECHT     5 (mangelhaft)
Design/UX             SCHLECHT     5 (mangelhaft)
Barrierefreiheit      MANGELHAFT   4 (ausreichend)
Funktionalitaet       MANGELHAFT   4 (ausreichend)
Social Media          AUSREICHEND  4 (ausreichend)
Performance           AUSREICHEND  3-4
Responsive Design     OK           3 (befriedigend)
──────────────────────────────────────────
Gesamt                             5 (mangelhaft)
```

---

## 11. Top-10 der dringendsten Probleme

1. **Kein HTTPS** - Datenschutzrechtlich bedenklich (DSGVO), unsicher, SEO-Nachteil
2. **noindex/nofollow aktiv** - Seite ist fuer Google unsichtbar
3. **PHP 7.4 End-of-Life** - Keine Sicherheitsupdates seit 2022
4. **Content seit 2024 nicht aktualisiert** - Verein wirkt inaktiv
5. **Fehlende Security-Headers** - Anfaellig fuer Clickjacking, XSS, etc.
6. **Domain-Mapping defekt** - Alle internen Links gehen auf `apps-1and1.net`
7. **Veraltetes Design** - Theme aus ~2015, kein Vereinsbranding
8. **Spielplan/Satzung als Bilder** - Nicht barrierefrei, nicht suchbar
9. **17 Bilder ohne Alt-Text** - Barrierefreiheit und SEO
10. **Keine Meta-Description** - Keine Kontrolle ueber Suchergebnis-Darstellung

---

## 12. Empfehlung

Ein Relaunch ist die richtige Entscheidung. Die Kombination aus Sicherheitsmaengeln (kein HTTPS, PHP EOL), SEO-Blockade (noindex), veraltetem Design und inaktuellem Content macht eine Reparatur unwirtschaftlich. Ein Neubau mit modernem Tech-Stack ist effizienter und nachhaltiger.