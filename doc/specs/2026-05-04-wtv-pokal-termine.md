# Spec: WTV Pokal Termine

## Überblick

Aufnahme der WTV-Vereinspokal-Heimspiele (Saison 2026) als neue eigene
Kategorie auf der Homepage. Phase 1: manuelle Pflege in
`content/termine/_index.md`. Phase 2 (separater Spec): Erweiterung des
nuliga-sync-Workflows auf Pokal-Gruppen.

Hintergrund: Der WTV Vereinspokal ist eine vom Medenspielbetrieb
separate Wettbewerbsschiene (eigene `championship`-IDs auf liga.nu).
Pokal-"Mannschaften" sind nicht deckungsgleich mit den
Medenspiel-Teams (offene LK-basierte Wettbewerbe), sie bekommen
deshalb keine eigene Mannschafts-Page.

## Scope

### Phase 1 (dieser Spec)

- Zwei neue Pokal-Einträge in `content/termine/_index.md`
- Neue Termin-Kategorie `pokal` mit eigener Farbe (orange), eigenem
  Filter-Button und eigenem Badge auf der Termine-Übersichtsseite
- Marker-Felder (`liga_championship`, `liga_group`) als Identity-Key
  vorbereitet — kein Auto-Sync in Phase 1, aber forward-kompatibel

### Phase 2 (separater Spec, nicht Teil dieser Umsetzung)

- nuliga-sync-Erweiterung: Pseudo-Teams für die Pokal-Wettbewerbe in
  `team_registry`
- Diff-Engine bekommt zweiten Identity-Pfad für `category: "pokal"`
- Parser bleibt unverändert (gleicher liga.nu-HTML-Aufbau)

## Datenquellen (liga.nu)

| Wettbewerb | championship | group | URL |
|---|---|---|---|
| Herren Generali LK 18,0–25,0 | `WTV VP 2026` | `2229674` | <https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage?championship=WTV+VP+2026&group=2229674> |
| Herren Ü40 Generali LK 1,0–25,0 | `WTV VP 2026` | `2229754` | <https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage?championship=WTV+VP+2026&group=2229754> |

### Heimspiele Sommer 2026 (Stand 2026-05-04)

| Datum | Uhrzeit | Heim | Gast | Wettbewerb | Group |
|---|---|---|---|---|---|
| 05.05.2026 | 18:00 | TC BW Attendorn 1 | TV Rönkhausen 1892 TA | Herren LK 18–25 | 2229674 |
| 06.05.2026 | 18:00 | TC BW Attendorn 1 | TV Rosenthal 1899 | Herren Ü40 LK 1–25 | 2229754 |

(`opponent`-Schreibweise: trailing ` 1` und ` e.V.` gestrippt — kanonische
Form gemäß nuliga-sync Identity-Konvention; bei zweiten/dritten Teams
bleibt die Nummer erhalten.)

Auswärtsspiele werden in dieser Phase ignoriert (Termine-Liste zeigt
ausschließlich Heimspiele, analog zu den bestehenden Medenspiel-Einträgen).

## Datenmodell

### Neue Einträge in `content/termine/_index.md`

Chronologisch einsortiert (vor `2026-05-09`-Eintrag der Herren 30):

```yaml
- title: "Herren-Pokal vs. TV Rönkhausen 1892"
  date: 2026-05-05
  time: "18:00 Uhr"
  detail: "WTV Vereinspokal · Herren LK 18,0–25,0, Heimspiel"
  category: "pokal"
  opponent: "TV Rönkhausen 1892 TA"
  liga_championship: "WTV VP 2026"
  liga_group: "2229674"
- title: "Herren 40-Pokal vs. TV Rosenthal 1899"
  date: 2026-05-06
  time: "18:00 Uhr"
  detail: "WTV Vereinspokal · Herren Ü40 LK 1,0–25,0, Heimspiel"
  category: "pokal"
  opponent: "TV Rosenthal 1899"
  liga_championship: "WTV VP 2026"
  liga_group: "2229754"
```

### Feld-Semantik

| Feld | Zweck | Phase 1 | Phase 2 |
|---|---|---|---|
| `category: "pokal"` | UI-Klassifizierung (Filter, Badge, Farbe) | aktiv | aktiv |
| `opponent` | Identity-Bestandteil (kanonische liga.nu-Schreibweise) | nur dokumentarisch | Identity-Match |
| `liga_championship` | championship-String der liga.nu-URL | nur dokumentarisch | URL-Bau |
| `liga_group` | Group-ID der liga.nu-URL | nur dokumentarisch | URL-Bau + Identity-Diskriminator |

**Kein `team`-Feld** — anders als bei Medenspielen (`team: "herren-30"`),
weil keine Mannschafts-Page existiert. Die Pokal-Identity in Phase 2 ist
`liga_group + opponent + H/A`.

### Naming Conventions

- **Title-Format:** `"Herren-Pokal vs. <Gegner>"` bzw.
  `"Herren 40-Pokal vs. <Gegner>"` — verständlich auf einen Blick,
  optisch trennbar vom Medenspiel-Format `"Herren 30 vs. ..."`.
- **`detail`-Format:** `"WTV Vereinspokal · <LK-Range>, Heimspiel"` —
  Mittelpunkt als Trenner; LK-Range identifiziert die Pokal-"Mannschaft".
- **`opponent`-Format:** liga.nu-kanonisch (mit Trailing-` 1` falls in
  liga.nu so geschrieben, ohne ` e.V.`) — für späteren Auto-Sync wichtig.

## UI / Templates

### Farbschema

Pokal = Cup → orange. Drei neue CSS-Variablen:

```css
--orange-500: #f97316;
--orange-600: #ea580c;
--orange-50:  #fff7ed;
```

Begründung: kontrastiert klar mit Blau (Medenspiel) und Grün (Event),
Orange ist semantisch passend (Trophäe/Pokal).

### `static/css/main.css`

Zwei neue Selektoren analog zu den bestehenden `medenspiel`/`event`:

```css
.termin-item[data-category="pokal"]::before {
  background: var(--orange-500);
}

.termin-badge-pokal {
  background: var(--orange-50);
  color: var(--orange-600);
}
```

### `layouts/partials/termine.html` (Homepage-Termine-Sektion)

Ein neuer Legend-Eintrag nach dem Vereinsevent-Eintrag:

```html
<div class="termine-legend-item">
  <div class="termine-legend-dot" style="background: var(--orange-500);"></div>
  <span>Pokal</span>
</div>
```

Keine weiteren Änderungen — die Schleife rendert generisch über alle
Events.

### `layouts/termine/list.html` (Termine-Übersichtsseite)

Drei Ergänzungen:

1. Legend-Eintrag wie oben.
2. Filter-Button:
   ```html
   <button class="termine-filter-btn" data-filter="pokal">Pokal</button>
   ```
3. Badge-Label-Logik: aktuelles `{{ if eq .category "medenspiel" }}…{{ else }}…{{ end }}`
   wird durch dict-Lookup ersetzt, damit weitere Kategorien später
   trivial dazukommen:
   ```go-html-template
   {{ $labels := dict "medenspiel" "Medenspiel" "event" "Event" "pokal" "Pokal" }}
   <span class="termin-badge termin-badge-{{ .category }}">
     {{ index $labels .category }}
   </span>
   ```

Die JavaScript-Filter-Logik (`item.dataset.category === filter`) ist
generisch und braucht keine Anpassung.

## Was *nicht* geändert wird

- `content/mannschaften/*.md` — Spielpläne bleiben Medenspiel-only
- `tools/nuliga-sync/` — kein Code, kein Bundle, kein n8n-Workflow
- `doc/specs/2026-04-20-nuliga-sync-workflow.md` — bleibt unverändert
- Daily-Deploy-Cron — keine Berührung
- Andere Hugo-Layouts (`index.html`, Partials abseits `termine.html`)

## Test-Strategie

1. `hugo server` starten, Homepage öffnen → Termin-Sektion zeigt beide
   Pokal-Einträge mit orangenem Streifen, Legende hat 3 Einträge.
2. `/termine/`-Seite → Filter-Buttons zeigen "Alle / Medenspiele /
   Vereinsevents / Pokal"; Klick auf "Pokal" zeigt nur die zwei
   Pokal-Einträge; Badge "Pokal" in Orange auf jedem.
3. Filter "Medenspiele" zeigt weiterhin alle Medenspiel-Einträge
   (Regression-Check).
4. Filter "Vereinsevents" zeigt Sommerfest, JHV etc. (Regression-Check).
5. Datum-Sortierung korrekt (`05.05.` und `06.05.` vor dem
   `09.05.`-Medenspiel).
6. Mobile-Ansicht: Legende bricht sauber, Filter-Buttons wrap.

## Akzeptanzkriterien

- Beide Pokal-Spiele erscheinen auf Homepage und `/termine/`-Seite
  in chronologischer Reihenfolge.
- Eigene Farbe (orange), Filter, Badge funktionieren.
- Keine Regression bei bestehenden Medenspiel- oder Event-Einträgen.
- Keine Code-Änderungen in `tools/nuliga-sync/` oder n8n-Bundles.
- `hugo --minify` läuft fehlerfrei durch.

## Offene Punkte / spätere Entscheidungen

- **Auswärtsspiele:** aktuell nicht in `termine/_index.md` (analog
  Medenspiel-Logik). Falls später gewünscht, separates Konzept
  (eigene Liste oder Erweiterung der Termine-Logik).
- **Phase-2-Auto-Sync:** Pokal-Liga.nu-Seiten ändern sich erfahrungsgemäß
  selten (Single-Match-K.O.), Auto-Sync hat geringere Dringlichkeit als
  bei Medenspielen. Spec wird gemacht, sobald Phase 1 läuft.
- **Pokal-LK-Werte als strukturierte Felder:** aktuell nur im
  `detail`-String. Falls später Pokal-spezifische Anzeige (z.B. eigene
  Übersichtsseite) gewünscht, könnte LK-Range als eigenes Feld
  ergänzt werden — aktuell YAGNI.