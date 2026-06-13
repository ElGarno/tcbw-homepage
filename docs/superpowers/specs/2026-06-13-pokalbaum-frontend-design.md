# Spec: Pokalbaum-Frontend + Pokal-Ergebnis-Sync

**Status:** Design — freigegeben, Implementierungsplanung offen
**Datum:** 2026-06-13
**Folgt aus:** nuliga-sync Phase 2 (`2026-05-04-nuliga-sync-pokal.md`),
Feli-Result-Notification (`2026-05-28-feli-result-notification.md`)

## Ausgangsproblem

Neue Pokalergebnisse (Herren LK 18–25) wurden „nicht vom Workflow gefunden".
Ursachenanalyse ergab **keinen Bug, sondern eine strukturelle Lücke**:

1. **`syncRunner.js:128`** verwirft result-only-Updates für Pokal:
   ```js
   cs.updates = cs.updates.filter(u => u.oldDate !== u.newDate || u.oldTime !== u.newTime);
   ```
   Das Termine-Schema (`_index.md`) hat kein `result`-Feld. Ergebnis-only-Updates
   (Datum/Zeit unverändert, nur Score neu) fallen weg. Weil der Filter **vor**
   `extractNewResults()` greift, feuert auch die **Feli-Mail** nicht.
2. **`syncRunner.js:122`** Heimspielfilter (`m.home.includes('Attendorn')`) —
   Auswärtsergebnisse (z. B. der 1:2-Auswärtssieg in Rosenthal = Weiterkommen)
   werden gar nicht betrachtet.

Beides bewusst so angelegt; der Code-Kommentar nannte als intended fix bereits
„add a result column + a frontend renderer". Dieses Spec liefert diesen Renderer.

## Datenlage (verifiziert am 2026-06-13)

Der WTV Vereinspokal ist ein **K.-o.-Turnier mit Loser-Branch** (eine zweite
Chance nach Hauptrunden-Niederlage). Der komplette Baum einer LK-Klasse liegt
als *eine* flache, chronologische Spielliste in *einer* `groupPage`. Attendorns
Pfad lässt sich daraus rekonstruieren.

**Herren LK 18–25** (Hauptrunde `2229674`) — noch im Winner-Branch:

| Runde | Datum | H/A | Gegner | Ergebnis | Outcome |
|---|---|---|---|---|---|
| R1 | 05.05. | H | TV Rönkhausen 1892 | 2:1 | win |
| R2 | 19.05. | H | TC Letmathe | 2:1 | win |
| R3 | 09.06. | A | TV Rosenthal 1899 | 2:1 (auswärts) | win |
| R4 | 23.06. | H | TuS Elch Holzwickede | – | open |

Nebenrunde `2236574`: keine Attendorn-Spiele (nie abgestiegen).

**Herren Ü40** (Hauptrunde `2229754`) — nach R1-Niederlage im Loser-Branch:

| Runde | Datum | H/A | Gegner | Ergebnis | Outcome |
|---|---|---|---|---|---|
| R1 (Haupt) | 06.05. | H | TV Rosenthal 1899 | 1:2 | loss |
| R1 (Neben `2236634`) | 17.06. | H | TC GW Meinerzhagen | – | open |

Die group-IDs stammen aus der championship-Übersicht
`leaguePage?championship=WTV+VP+2026` (Tab 2 = Herren LK, Tab 3 = Senioren).

## Architekturentscheidung

**nuliga-sync ist alleinige Datenquelle und schreibt die vollständigen
Pokal-Pfade nach `data/pokal.yaml`; Hugo rendert daraus statisch.**

Konsistent zum bestehenden Muster (Repo = Source of Truth, täglicher
Rebuild via daily-deploy-Cron um 06:30).

Verworfen:
- **Hugo `resources.GetRemote` zur Build-Zeit** — HTML-Parsing in Go-Templates
  brüchig, Build hängt an liga.nu-Verfügbarkeit, keine Git-Historie.
- **Client-side fetch** — CORS-blockiert, brüchig.

## Datenfluss

```
liga.nu (4 group-Seiten: je Team Haupt + Neben)
   │  ALLE Attendorn-Spiele (Heim+Auswärts, mit Ergebnis)
   ▼
nuliga-sync (Code-Node, täglich 06:00 Europe/Berlin)
   ├─→ content/termine/_index.md   nur Heim-Ankündigungen (unverändert)
   ├─→ data/pokal.yaml             vollständige Pfade beider Teams (NEU)
   └─→ newResults[]                +Pokal-Ergebnisse (Heim & Auswärts) → Feli-Mail
                                     ▼
                            Hugo rendert /pokal/  (vertikale Timeline)
```

## Komponenten

### 1. `tools/nuliga-sync/src/teams.js` — Pokal-Teams als Branch-Gruppen

Medenspiel-Einträge bleiben unverändert. Die drei losen Pokal-Einträge
(Haupt + Vorsorge-Neben als separate Pseudo-Teams) werden zu **zwei logischen
Pokalteams mit je Haupt- + Nebenrunde-group** zusammengefasst. Die bisher als
TODO offene H40-Nebenrunde `2236634` wird ergänzt.

```js
export const POKAL_TEAMS = [
  {
    kind: 'pokal',
    slug: 'herren-lk18-25',
    label: 'Herren-Pokal LK 18–25',
    championship: 'WTV VP 2026',
    detail: 'WTV Vereinspokal · Herren LK 18,0–25,0',
    branches: { haupt: '2229674', neben: '2236574' },
  },
  {
    kind: 'pokal',
    slug: 'herren-40',
    label: 'Herren-40-Pokal',
    championship: 'WTV VP 2026',
    detail: 'WTV Vereinspokal · Herren Ü40 LK 1,0–25,0',
    branches: { haupt: '2229754', neben: '2236634' },
  },
];
```

Offen für die Implementierungsplanung: ob `POKAL_TEAMS` separat exportiert wird
oder die bestehende `TEAMS`-Liste mit dem neuen Branch-Schema erweitert wird.
Leitlinie: minimale Störung der Medenspiel-Pfade.

### 2. `tools/nuliga-sync/src/pokalPath.js` (neu) — Pfad-Builder

Reine Funktion, gut testbar:

```
buildPokalPath(team, hauptMatches, nebenMatches) -> { label, detail, liga_url, rounds[] }
```

Algorithmus pro Team:
1. Filtere je group die Attendorn-Spiele, sortiere chronologisch (Datum+Zeit).
2. Hauptrunde-Spiele werden Runden `branch: 'haupt'`, fortlaufend `round: 1..n`.
3. **Outcome je Spiel:**
   - kein Score → `open`
   - Attendorn Heim & `scoreHome > scoreGuest` → `win`; `<` → `loss`
   - Attendorn Gast & `scoreGuest > scoreHome` → `win`; `<` → `loss`
   - (Unentschieden gibt es im Pokal nicht; defensiv → `open` + Log.)
4. **Branch-Knick:** Wenn ein Hauptrunde-Spiel `loss` ist UND Nebenrunde-Spiele
   existieren, werden diese als `branch: 'neben'`, `round: 1..m` angehängt.
5. `liga_url` zeigt auf die jeweils *aktive* group (Haupt, solange kein Abstieg;
   sonst Neben).

### 3. `data/pokal.yaml` (neu) — generierte Datenquelle

Von der Sync-Logik geschrieben, von Hugo via `site.Data.pokal` gelesen.

```yaml
teams:
  - label: "Herren-Pokal LK 18–25"
    detail: "WTV Vereinspokal · Herren LK 18,0–25,0"
    liga_url: "https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage?championship=WTV+VP+2026&group=2229674"
    rounds:
      - branch: haupt
        round: 1
        date: 2026-05-05
        home: true
        opponent: "TV Rönkhausen 1892"
        result: "2:1"
        outcome: win
      # … weitere Runden
```

Wird im Repo eingecheckt (Git-Historie der Ergebnisse). Diff gegen den
bestehenden Inhalt entscheidet, ob ein PR/Commit nötig ist.

### 4. Frontend — neue Seite `/pokal/`

- **Content:** `content/pokal/_index.md` (Titel, Intro-Text; Daten kommen aus
  `site.Data.pokal`).
- **Layout:** `layouts/pokal/list.html` + Partial `layouts/partials/pokalbaum.html`.
- **Nav:** neuer Menü-Eintrag „Pokal".
- **Darstellung:** pro Team eine **vertikale Timeline** (gewählte Variante A):
  - Runden-Karten untereinander, gruppiert nach `branch` (Überschrift
    „Hauptrunde" / „Nebenrunde").
  - Farb-Logik: `win` = grün, `loss` = rot, `open` = grau (links Akzentbalken).
  - Heim/Auswärts als Badge, Datum + Gegner + Score je Karte.
  - Bei `loss` mit folgendem Neben-Branch ein sichtbarer Knick
    („↳ ausgeschieden → Nebenrunde").
  - Responsive, mobil-first; Stil an Site-Design (blau/weiß, DM Sans /
    Playfair Display, bestehende `--blue-600`/`--radius-lg`-Tokens).
  - Button „Ergebnisse & Tabelle auf liga.nu" (wie Mannschaftsseiten).
- Die Timeline **ist** die Ergebnisliste — keine zusätzliche Tabelle.
- Zeigt **nur Attendorns Pfad**, nicht den ganzen 64-Teams-Turnierbaum.

### 5. Termine — unverändert

`content/termine/_index.md` zeigt weiterhin **nur Pokal-Heimspiele als
Ankündigungen**. Die Heim-Ankündigungen werden aus den Pfad-Daten abgeleitet
(Heimspiele ohne Ergebnis / in der Zukunft) und über die bestehende
`termineUpdater`-Logik gepflegt. Auswärtsspiele erscheinen dort nicht.

### 6. Social-Fix — `syncRunner.js`

Der result-only-Filter (Zeile 128) wird so umgebaut, dass Pokal-Ergebnisse
**nicht mehr aus `newResults` herausfallen** — Heim *und* Auswärts. Sie erzeugen
dann wie Medenspiel-Ergebnisse eine Feli-Mail (`extractNewResults()`-Format:
`team`=Label, `opponent`, `date`, `time`, `result`, `isHome`).

Der Filter darf weiterhin verhindern, dass ein reines Ergebnis-Update das
*Termine-File* anfasst (dort kein `result`-Feld) — aber der Ergebnis-Strom für
Benachrichtigung **und** `data/pokal.yaml` muss vollständig sein.

**Annahme (überschreibbar):** Feli-Mail bei *jedem* Pokal-Ergebnis, auch
Niederlagen — konsistent zu Medenspiel; sie entscheidet, was sie postet.

## Was *nicht* geändert wird

- Medenspiel-Sync-Pfad (TEAMS-Einträge, Mannschafts-MD-Schreiben).
- Termine-Heim-only-Verhalten.
- Cron-Schedule, Pushover-Settings (Fabian), GitHub-PAT-Scope.
- n8n-Workflow-Struktur — bis auf den ohnehin offenen Feli-Mail-Node aus
  `2026-05-28-feli-result-notification.md`, der nun auch Pokal-Ergebnisse
  transportiert (keine neuen Nodes).

## Test-Strategie

**Unit (Jest, `npm test`):**
- `pokalPath.test.js` (neu): Outcome-Ableitung (win/loss/open, Heim & Auswärts),
  Runden-Nummerierung, Haupt→Neben-Knick nur bei Hauptrunden-Niederlage,
  `liga_url` zeigt auf aktive group.
- `syncRunner.test.js` (erweitern): Pokal-Ergebnis (Heim & Auswärts) landet in
  `newResults`; `data/pokal.yaml`-Inhalt wird erzeugt; Termine-File bekommt nur
  Heim-Ankündigungen, kein Auswärts.
- `teams.test.js` (anpassen): zwei Pokalteams mit `branches.haupt` + `branches.neben`.

**Baseline (`npm run baseline`):** muss mit dem neuen Schema 0 unerwartete
Changes melden (Pfad-Daten == liga.nu-Stand).

**Frontend (Hugo):** `hugo --gc` baut fehlerfrei; `/pokal/`-Seite rendert beide
Teams; Smoke-Test mobil/desktop.

## Akzeptanzkriterien

- `data/pokal.yaml` enthält beide Pfade vollständig (Haupt + ggf. Neben,
  Heim + Auswärts, mit Outcome).
- `/pokal/`-Seite zeigt beide Teams als vertikale Timeline, Farb-Logik korrekt,
  Nav-Eintrag „Pokal" vorhanden, responsive.
- Neue Pokal-Ergebnisse (auch Auswärts) erzeugen einen `newResults`-Eintrag →
  Feli-Mail.
- `content/termine/_index.md` zeigt weiterhin nur Pokal-Heimspiele, kein Auswärts.
- H40-Nebenrunde `2236634` ist in `teams.js` ergänzt (TODO aufgelöst).
- `npm test` grün, neue Tests vorhanden; `npm run baseline` 0 Changes;
  `npm run bundle` lauffähig; `hugo` baut fehlerfrei.

## Offene Punkte / spätere Entscheidungen

- **Saison-Wechsel:** `championship` + alle vier group-IDs sind pro Saison ein
  bewusster Manual-Touch-Point in `teams.js`.
- **Weitere Pokalteams** (z. B. Damen-Pokal): einfach `POKAL_TEAMS`-Eintrag
  ergänzen; Pfad-Builder + Frontend skalieren ohne Änderung.
- **Gegner-Kontext** (gegen wen der Gegner die Vorrunde gewann) bewusst
  weggelassen — für eine Vereins-HP nicht relevant.
