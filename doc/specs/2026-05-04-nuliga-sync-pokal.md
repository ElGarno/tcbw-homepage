# Spec: nuliga-sync — Phase 2 (WTV Pokal)

## Überblick

Erweiterung des bestehenden `nuliga-sync`-Workflows (Spec
`2026-04-20-nuliga-sync-workflow.md`) um den WTV Vereinspokal. Pokal-Spiele
werden auf liga.nu in eigenen `championship`/`group`-IDs geführt und betreffen
keine Mannschafts-Page (Pokal-Teams sind LK-basierte Wettbewerbe, keine
Vereinsmannschaften).

Phase 1 (Spec `2026-05-04-wtv-pokal-termine.md`) hat die Pokal-Termine manuell
in `content/termine/_index.md` mit Marker-Feldern `liga_championship` +
`liga_group` versehen. Phase 2 macht aus den manuellen Einträgen
auto-synchronisierte Einträge.

## Status-Hinweis: nuliga-sync noch nicht live

Der `nuliga-sync`-Workflow ist im Repo + n8n vorbereitet, aber noch nicht
aktiviert. Dieses Spec wird zusammen mit dem ersten Live-Run der erste
produktive Sync-Lauf sein. Implikationen:

- Keine "Migration"-Schritte für bestehende Sync-Artefakte nötig.
- Vor Aktivierung muss `npm run baseline` 0 Changes melden — sowohl für
  Medenspiele als auch für Pokal — sonst gibt es beim ersten Cron-Lauf
  unerwarteten PR-Noise.
- Der Bundle-Roll-out ist Teil des Deployment-Schritts (Bundle bauen →
  n8n Code-Node aktualisieren → Cron aktivieren).

## Architekturentscheidungen (kondensiert aus Brainstorming)

| Entscheidung | Wahl | Begründung |
|---|---|---|
| Code-Integration | A — minimal-invasiv erweitern | bestehender Stack funktioniert, polymorpher Refactor wäre Over-Engineering für 2 Pseudo-Teams |
| Auswärtsspiele | A — nur Heimspiele | konsistent zur bestehenden `termine/_index.md`-Logik |
| n8n-Workflow | A — ein Workflow, ein PR | Pokal hat sehr wenig Volumen, getrennter Cron wäre Overhead |
| PR-Body | A — gemeinsame Tabellen | `teamLabel` (`Herren-Pokal`) ist selbsterklärend, eigene Sektion meist leer |
| `kind`-Field | explizit auf allen Teams | bessere Code-Lesbarkeit |
| Heimspielfilter | post-parse im syncRunner | parser bleibt generisch |

## Datenmodell

### `tools/nuliga-sync/src/teams.js`

Bestehende Einträge bekommen explizit `kind: 'medenspiel'`. Zwei neue
Pokal-Einträge mit `championship` + `pokalDetail`:

```js
export const TEAMS = [
  { kind: 'medenspiel', slug: 'damen-6er',  file: 'content/mannschaften/damen-6er.md',  group: '2',   label: 'Damen' },
  { kind: 'medenspiel', slug: 'herren-30',  file: 'content/mannschaften/herren-30.md',  group: '67',  label: 'Herren 30' },
  { kind: 'medenspiel', slug: 'herren-40',  file: 'content/mannschaften/herren-40.md',  group: '77',  label: 'Herren 40' },
  { kind: 'medenspiel', slug: 'herren-60',  file: 'content/mannschaften/herren-60.md',  group: '109', label: 'Herren 60' },
  { kind: 'medenspiel', slug: 'gemischt-1', file: 'content/mannschaften/gemischt-1.md', group: '120', label: 'Gemischt 1' },
  { kind: 'medenspiel', slug: 'gemischt-2', file: 'content/mannschaften/gemischt-2.md', group: '129', label: 'Gemischt 2' },
  { kind: 'medenspiel', slug: 'mixed-u12',  file: 'content/mannschaften/mixed-u12.md',  group: '205', label: 'Mixed U12' },
  {
    kind: 'pokal', slug: 'herren-pokal',
    group: '2229674', championship: 'WTV VP 2026',
    label: 'Herren-Pokal',
    pokalDetail: 'WTV Vereinspokal · Herren LK 18,0–25,0, Heimspiel',
  },
  {
    kind: 'pokal', slug: 'herren-40-pokal',
    group: '2229754', championship: 'WTV VP 2026',
    label: 'Herren 40-Pokal',
    pokalDetail: 'WTV Vereinspokal · Herren Ü40 LK 1,0–25,0, Heimspiel',
  },
];

const BASE = 'https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage';

export function liganuUrl(group, championship = 'SW 2026') {
  const params = new URLSearchParams({ championship, group });
  return `${BASE}?${params.toString()}`;
}
```

`liganuUrl`-Default `'SW 2026'` bleibt unverändert (greift für Medenspiel,
falls explizites `championship` fehlt). Pokal-Einträge geben
`championship` immer explizit mit.

### Pokal-Identifikation in `_index.md`

Pokal-Events sind eindeutig identifiziert durch:
- `category: "pokal"`
- `liga_group: "<group-id>"` (Phase-1-Marker)

Die Diff-Identity *innerhalb* eines Pokal-Teams bleibt
`opponent + H/A` — gleich wie für Medenspiel, weil pro Team gediffft
wird und ein Pokal-Team in einer Pokal-Gruppe nur gegen einen anderen
Verein spielt.

## Implementierung

### `src/syncRunner.js`

**Pre-loop:** Termine-MD einmal lesen, YAML parsen, Events sammeln. Diese
Liste wird sowohl für Pokal-Existing-Match-Lookup als auch für die
Termine-Update-Decoration verwendet.

**Loop pro Team — verzweigt auf `team.kind`:**

```js
for (const team of TEAMS) {
  try {
    const url = liganuUrl(team.group, team.championship ?? 'SW 2026');
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const liga = parseGroupPage(html);

    let existing, frontmatter, body, existingMd;

    if (team.kind === 'pokal') {
      // Heimspielfilter post-parse
      const ligaHome = liga.matches.filter(m => m.home.includes('Attendorn'));
      // Existing matches aus _index.md
      existing = pokalExistingFromTermine(termineEvents, team.group);
      // Diff
      const cs = diffMatches(existing, ligaHome);
      teamReports.push({ team, cs, existingMatches: existing, ligaMatches: ligaHome });
      // KEIN MD-Read, KEIN frontmatter/body/existingMd
    } else {
      existingMd = await readRepoFile(team.file);
      ({ matches: existing, frontmatter, body } = readMannschaftMd(existingMd));
      const cs = diffMatches(existing, liga.matches);
      teamReports.push({ team, cs, existingMd, frontmatter, body, existingMatches: existing, ligaMatches: liga.matches });
    }
  } catch (err) {
    errors.push({ team: team.slug, error: err.message });
  }
}
```

**Neuer Helper `pokalExistingFromTermine(events, ligaGroup)`:**

```js
function pokalExistingFromTermine(events, ligaGroup) {
  return events
    .filter(e => e.category === 'pokal' && e.liga_group === ligaGroup)
    .map(e => ({
      // Date kann Date-Objekt (aus js-yaml) oder String sein — beide normalisiert auf YYYY-MM-DD
      date: e.date instanceof Date
        ? e.date.toISOString().slice(0, 10)
        : e.date,
      time: e.time.replace(/\s*Uhr\s*$/, ''),  // "18:00 Uhr" → "18:00"
      home: 'TC Blau-Weiß Attendorn 1',  // konstant — nur Heimspiele
      guest: e.opponent,
    }));
}
```

Der konstante Heim-String muss exakt mit dem Wert übereinstimmen, mit dem
liga.nu Attendorn-Heimspiele identifiziert (`'TC Blau-Weiß Attendorn 1'`).
Der Identity-Key (`getIdentity` in `diff.js`) prüft per
`home.includes('Attendorn')` — der genaue Suffix `' 1'` ist nicht
identitätsrelevant. Aber für Konsistenz bei späteren Auswertungen halten
wir uns an die liga.nu-Schreibweise.

**File-Changes-Sektion:** Pokal-Reports erzeugen keinen `fileChanges`-Eintrag
für Mannschafts-MDs (kein `team.file`), nur das gemeinsame `_index.md`.

**Decoration:** `decorateTeamChange` wird leicht erweitert, um den `kind`,
`teamLabel`, `championship`, `ligaGroup`, `pokalDetail` mit in den Output zu
nehmen — diese Felder fließen dann in `applyTermineChanges` und `prBody`.

### `src/termineUpdater.js`

Zwei neue Helpers + kind-Branch in der Hauptschleife:

```js
function findPokalIdx(events, ligaGroup, opponent) {
  return events.findIndex(e =>
    e.category === 'pokal' &&
    e.liga_group === ligaGroup &&
    sameOpponent(e.opponent, opponent)
  );
}

function buildEventEntry(tc, addMatch) {
  if (tc.kind === 'pokal') {
    return {
      title: `${tc.teamLabel} vs. ${addMatch.opponent}`,
      date: toDate(addMatch.newDate),
      time: `${addMatch.newTime} Uhr`,
      detail: tc.pokalDetail,
      category: 'pokal',
      opponent: addMatch.opponent,
      liga_championship: tc.championship,
      liga_group: tc.ligaGroup,
    };
  }
  return {
    title: titleFor(tc.team, addMatch.opponent),
    date: toDate(addMatch.newDate),
    time: `${addMatch.newTime} Uhr`,
    detail: detailFor(tc.team),
    category: 'medenspiel',
    team: tc.team,
    opponent: addMatch.opponent,
  };
}

// Hauptschleife in applyTermineChanges:
for (const tc of teamChanges) {
  const findIdx = tc.kind === 'pokal'
    ? (events, opp) => findPokalIdx(events, tc.ligaGroup, opp)
    : (events, opp) => findMedenspielIdx(events, tc.team, opp);

  for (const u of tc.updates) {
    if (!u.isHome) continue;
    const idx = findIdx(events, u.opponent);
    if (idx === -1) continue;
    events[idx].date = toDate(u.newDate);
    events[idx].time = `${u.newTime} Uhr`;
  }

  for (const a of tc.adds) {
    if (!a.isHome) continue;
    if (findIdx(events, a.opponent) !== -1) continue;
    events.push(buildEventEntry(tc, a));
  }
}
```

Sort + YAML-Dump bleiben unverändert — alle Events werden chronologisch
sortiert, Pokal landet zwischen Medenspiel-Einträgen.

### `src/prBody.js`

Keine Änderung. Pokal-Updates/Adds bekommen `teamLabel: 'Herren-Pokal'` /
`'Herren 40-Pokal'` und laufen durch dieselben Tabellen.

`termineUpdates` (Footer-Sektion "Termine in /termine/_index.md
mit-aktualisiert") wird **nur für Medenspiel** befüllt — bei Pokal *ist*
der Termine-Eintrag der Sync-Output, kein Side-Effect der Mannschafts-MD-Änderung.

### Was *nicht* geändert wird

- `parser.js` — bleibt generisch
- `diff.js` — Identity-Logik wiederverwendet
- `mdReader.js`, `mdWriter.js` — werden für Pokal nicht aufgerufen
- `normalize.js` — Opponent-Normalisierung gleich
- n8n-Workflow-JSON (`doc/specs/n8n-nuliga-sync.json`) — keine neuen Nodes
- Cron-Schedule, Pushover-Settings, GitHub-PAT-Scope

## Test-Strategie

### Unit-Tests (Jest, `npm test`)

**`tests/teams.test.js` (neu)**
- `TEAMS` hat 9 Einträge: 7 medenspiel + 2 pokal
- Jeder Eintrag hat `kind` gesetzt
- Pokal-Einträge haben `championship` + `pokalDetail`
- Medenspiel-Einträge haben `file`

**`tests/termineUpdater.test.js` (erweitern, 4 Cases)**
1. *Pokal-Update:* `_index.md` enthält `category: pokal` + `liga_group: 2229674` + `opponent: TV Rönkhausen 1892 TA`. Sync liefert Update mit neuem Datum. Erwartet: nur dieses Event ist date-aktualisiert, alle anderen unverändert.
2. *Pokal-Add:* `_index.md` enthält keinen Eintrag mit `liga_group: 2229754`. Sync liefert Add. Erwartet: neues `category: pokal`-Event mit allen 7 Feldern (`title`, `date`, `time`, `detail`, `category`, `opponent`, `liga_championship`, `liga_group`), chronologisch korrekt einsortiert.
3. *Cross-Contamination Pokal → Medenspiel:* Pokal-Sync mit `opponent: "TC Halver 1960"` (zufällig auch ein Medenspiel-Gegner) ändert *nicht* den Damen-Medenspiel-Eintrag.
4. *Cross-Contamination Medenspiel → Pokal:* Medenspiel-Sync mit `opponent: "TV Rosenthal 1899"` (Pokal-Gegner) ändert *nicht* den Pokal-Eintrag.

**`tests/syncRunner.test.js` (erweitern, 2 Cases)**
1. *Pokal-Team läuft:* Mock `fetchImpl` liefert Pokal-HTML, Mock `readRepoFile` für `_index.md` liefert YAML mit Pokal-Markern. Erwartet: kein `readRepoFile`-Aufruf für Mannschafts-MD-Pfad, `fileChanges` enthält nur `content/termine/_index.md`.
2. *Mischlauf:* 1 Medenspiel-Update + 1 Pokal-Update. Erwartet: PR-Body hat beide Updates in derselben "Geänderte Spiele"-Tabelle, `fileChanges` enthält die Mannschaft-MD + `_index.md`.

### Baseline-Test (`npm run baseline`)

Nach Implementierung muss `baseline.js` 0 Changes melden — d.h. die
Phase-1-manuell-eingetragenen Pokal-Spiele in `_index.md` müssen exakt
mit dem liga.nu-Stand der Pokal-Gruppen übereinstimmen. Falls liga.nu
zwischenzeitlich Änderungen hatte, sind das die ersten echten Sync-Diffs
und müssen vor Aktivierung manuell reviewed/übernommen werden.

### Deployment-Check vor n8n-Aktivierung

1. `npm test` → alles grün
2. `npm run baseline` → 0 Changes
3. `npm run bundle` → neuer `dist/n8n-bundle.js`
4. n8n Code-Node mit neuem Bundle aktualisieren
5. n8n "Test Workflow" → kein PR (current state == liga.nu state)
6. Forced Diff: temporär eine Pokal-Zeit in `_index.md` ändern (z.B. 18:00 → 18:01), pushen, Test-Workflow → PR mit 1 Update für Pokal-Team
7. Diff zurücknehmen
8. Cron aktivieren

## Akzeptanzkriterien

- `tools/nuliga-sync/src/teams.js` enthält 9 Teams (7 medenspiel + 2 pokal),
  alle mit explizitem `kind`
- Pokal-Sync schreibt nur `content/termine/_index.md`, nie eine Mannschafts-MD
- `npm test` grün, neue Test-Cases vorhanden
- `npm run baseline` meldet 0 Changes
- `npm run bundle` produziert lauffähigen Bundle
- PR-Body bei Mischlauf zeigt Pokal-Einträge in den Standard-Tabellen mit
  Label `Herren-Pokal` / `Herren 40-Pokal`
- Keine Änderungen an `parser.js`, `diff.js`, `prBody.js`, `mdReader.js`,
  `mdWriter.js`, `normalize.js`, n8n-Workflow-JSON

## Offene Punkte / spätere Entscheidungen

- **Auswärts-Pokal** — falls jemals gewünscht, wäre das eine eigene
  UX-Frage (zusammen mit Auswärts-Medenspielen, die heute auch nicht im
  Termine-Stream sind). Nicht Teil dieses Specs.
- **Mehrere Saisons** — `championship: 'WTV VP 2026'` ist hardgecoded.
  Bei Saison-Wechsel müssen sowohl `championship` als auch `group`-IDs
  in `teams.js` aktualisiert werden, parallel zu `championship` der
  Medenspiel-Liganu-URLs (`'SW 2026'`). Das ist ein bewusster
  Manual-Touch-Point pro Saison.
- **Mehr als 2 Pokal-Teams** — wenn weitere Vereins-Teams (z.B. Damen-Pokal)
  am WTV-Pokal teilnehmen, einfach Eintrag in `TEAMS` ergänzen. Spec/Plan
  wird trivial.
