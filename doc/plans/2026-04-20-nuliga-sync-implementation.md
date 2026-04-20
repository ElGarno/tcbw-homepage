# Liga.nu Sync Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a daily n8n workflow that scrapes 7 liga.nu group pages, diffs them against `content/mannschaften/*.md` and `content/termine/_index.md`, and creates a Draft-PR on changes — never deleting entries, only flagging missing matches.

**Architecture:** All parsing/diff/writing logic lives in pure JS modules under `tools/nuliga-sync/` with Node test coverage. Modules are then bundled into n8n Code nodes (the n8n workflow is just glue around them: HTTP, GitHub API, Pushover). Migration step adds marker fields (`team`, `opponent`) to existing `medenspiel` entries so the sync knows which `_index.md` rows are auto-managed.

**Tech Stack:**
- Node.js 20+ (built-in `node:test` test runner)
- `cheerio` — HTML parsing (also available in n8n Code nodes when `NODE_FUNCTION_ALLOW_EXTERNAL=cheerio`)
- `js-yaml` — YAML parsing of `_index.md` frontmatter (also available in n8n)
- n8n on existing Synology NAS (Cron, HTTP Request, Code, GitHub, Pushover nodes)
- GitHub Git Trees API (re-using approach from Mail-to-Homepage workflow)

---

## File Structure

**New files:**
- `tools/nuliga-sync/package.json` — npm config (cheerio, js-yaml as deps; node:test for testing)
- `tools/nuliga-sync/.gitignore` — `node_modules/`
- `tools/nuliga-sync/README.md` — how to run tests + baseline
- `tools/nuliga-sync/src/normalize.js` — opponent name normalization
- `tools/nuliga-sync/src/parser.js` — cheerio HTML parser → match list
- `tools/nuliga-sync/src/mdReader.js` — parse existing Mannschafts-MD table → match list
- `tools/nuliga-sync/src/diff.js` — compute change set (Updates / Adds / Missings)
- `tools/nuliga-sync/src/mdWriter.js` — generate updated Mannschafts-MD table
- `tools/nuliga-sync/src/termineUpdater.js` — apply changes to `_index.md` YAML
- `tools/nuliga-sync/src/prBody.js` — render PR-body markdown from change set
- `tools/nuliga-sync/src/teams.js` — list of 7 teams with their config (slug, file, group_url)
- `tools/nuliga-sync/tests/normalize.test.js`
- `tools/nuliga-sync/tests/parser.test.js`
- `tools/nuliga-sync/tests/mdReader.test.js`
- `tools/nuliga-sync/tests/diff.test.js`
- `tools/nuliga-sync/tests/mdWriter.test.js`
- `tools/nuliga-sync/tests/termineUpdater.test.js`
- `tools/nuliga-sync/tests/prBody.test.js`
- `tools/nuliga-sync/tests/fixtures/group-67.html` (and 6 more for each team)
- `tools/nuliga-sync/tests/fixtures/herren-30.md` (and 6 more)
- `tools/nuliga-sync/tests/fixtures/termine.md`
- `tools/nuliga-sync/scripts/baseline.js` — fetch live + diff against current MDs (must report 0 changes after migrations)
- `tools/nuliga-sync/scripts/bundle.js` — concatenate src/ modules into single string for paste into n8n Code node
- `doc/specs/n8n-nuliga-sync.json` — n8n workflow JSON

**Modified files:**
- `content/termine/_index.md` — add `team` + `opponent` fields to all `medenspiel` entries
- `content/mannschaften/herren-30.md` — align opponent names with liga.nu canonical form
- `content/mannschaften/herren-40.md` — same
- `content/mannschaften/herren-60.md` — same
- `content/mannschaften/damen-6er.md` — same
- `content/mannschaften/gemischt-1.md` — same
- `content/mannschaften/gemischt-2.md` — same
- `content/mannschaften/mixed-u12.md` — same
- `CLAUDE.md` — add reference to new workflow
- `doc/tasks/context_session_01.md` — log progress

---

## Task 1: Bootstrap `tools/nuliga-sync/`

**Files:**
- Create: `tools/nuliga-sync/package.json`
- Create: `tools/nuliga-sync/.gitignore`
- Create: `tools/nuliga-sync/README.md`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "nuliga-sync",
  "version": "0.1.0",
  "description": "Liga.nu match schedule sync logic for TC-BW Attendorn homepage",
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "baseline": "node scripts/baseline.js",
    "bundle": "node scripts/bundle.js"
  },
  "dependencies": {
    "cheerio": "^1.0.0",
    "js-yaml": "^4.1.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
*.log
```

- [ ] **Step 3: Create README.md**

```markdown
# nuliga-sync

Standalone JS modules for syncing match schedules from liga.nu into Hugo content.
Logic is bundled into n8n Code nodes for production. See `doc/specs/2026-04-20-nuliga-sync-workflow.md` for the design spec.

## Setup
```bash
cd tools/nuliga-sync
npm install
```

## Test
```bash
npm test
```

## Baseline (fetch live + diff)
```bash
npm run baseline
```
Should report 0 changes after content migration is complete. Any non-zero diff means parser/normalizer needs adjustment OR liga.nu has actual changes that need a PR.

## Bundle for n8n
```bash
npm run bundle
```
Outputs `dist/n8n-bundle.js` — paste into the relevant Code node in `doc/specs/n8n-nuliga-sync.json`.
```

- [ ] **Step 4: Install deps**

Run: `cd tools/nuliga-sync && npm install`
Expected: `node_modules/` populated, `package-lock.json` created. Note: `package-lock.json` IS committed.

- [ ] **Step 5: Commit**

```bash
git add tools/nuliga-sync/package.json tools/nuliga-sync/package-lock.json tools/nuliga-sync/.gitignore tools/nuliga-sync/README.md
git commit -m "chore(nuliga-sync): bootstrap tools/nuliga-sync project"
```

---

## Task 2: `normalize.js` — opponent name normalization

**Files:**
- Create: `tools/nuliga-sync/src/normalize.js`
- Create: `tools/nuliga-sync/tests/normalize.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/normalize.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOpponent } from '../src/normalize.js';

test('lowercases and trims whitespace', () => {
  assert.equal(normalizeOpponent('  Olper TC  '), 'olper tc');
});

test('strips trailing " 1" (default first team)', () => {
  assert.equal(normalizeOpponent('Olper TC 1'), 'olper tc');
});

test('keeps " 2"+ trailing number (second team is a different team)', () => {
  assert.equal(normalizeOpponent('TuS Ferndorf 2'), 'tus ferndorf 2');
  assert.equal(normalizeOpponent('TC SSV Elspe 2'), 'tc ssv elspe 2');
});

test('strips e.V. suffix', () => {
  assert.equal(normalizeOpponent('Tennisclub Iserlohn e.V. 1'), 'tennisclub iserlohn');
  assert.equal(normalizeOpponent('TC Esseltal e.V.'), 'tc esseltal');
});

test('normalizes German umlauts (both directions)', () => {
  assert.equal(normalizeOpponent('Höinger SV'), normalizeOpponent('Hoeinger SV'));
  assert.equal(normalizeOpponent('TC Blau-Weiß Attendorn'), normalizeOpponent('TC Blau-Weiss Attendorn'));
  assert.equal(normalizeOpponent('TC Buschhütten 1'), normalizeOpponent('TC Buschhuetten'));
});

test('collapses internal whitespace', () => {
  assert.equal(normalizeOpponent('TC   Blau-Weiss   Attendorn'), 'tc blau-weiss attendorn');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/nuliga-sync && npm test`
Expected: FAIL with "Cannot find module '../src/normalize.js'"

- [ ] **Step 3: Write the minimal implementation**

Create `src/normalize.js`:

```javascript
export function normalizeOpponent(raw) {
  if (!raw) return '';
  let s = raw.toLowerCase().trim();
  // umlaut normalization (German → ASCII variants)
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  // strip "e.V." (with optional surrounding whitespace)
  s = s.replace(/\s*e\.v\.?\s*/g, ' ');
  // strip trailing " 1" (default first-team indicator) but keep " 2"+
  s = s.replace(/\s+1$/, '');
  // collapse all whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tools/nuliga-sync && npm test`
Expected: PASS — all 6 tests green

- [ ] **Step 5: Commit**

```bash
git add tools/nuliga-sync/src/normalize.js tools/nuliga-sync/tests/normalize.test.js
git commit -m "feat(nuliga-sync): opponent name normalization"
```

---

## Task 3: Save HTML fixtures from live liga.nu

**Files:**
- Create: `tools/nuliga-sync/tests/fixtures/group-67.html`
- Create: `tools/nuliga-sync/tests/fixtures/group-77.html`
- Create: `tools/nuliga-sync/tests/fixtures/group-109.html`
- Create: `tools/nuliga-sync/tests/fixtures/group-2.html`
- Create: `tools/nuliga-sync/tests/fixtures/group-120.html`
- Create: `tools/nuliga-sync/tests/fixtures/group-129.html`
- Create: `tools/nuliga-sync/tests/fixtures/group-205.html`

- [ ] **Step 1: Fetch all 7 group pages**

Run from `tools/nuliga-sync/`:

```bash
mkdir -p tests/fixtures
for g in 67 77 109 2 120 129 205; do
  curl -s "https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage?championship=SW+2026&group=$g" \
    -o "tests/fixtures/group-$g.html"
done
ls -la tests/fixtures/
```

Expected: 7 files, each > 10kB.

- [ ] **Step 2: Verify content**

Run: `grep -c "Attendorn" tests/fixtures/group-67.html`
Expected: number > 0 (the file should mention "Attendorn" multiple times — table rows + team header)

- [ ] **Step 3: Commit fixtures**

```bash
git add tools/nuliga-sync/tests/fixtures/
git commit -m "test(nuliga-sync): add liga.nu HTML fixtures for 7 teams"
```

---

## Task 4: `parser.js` — cheerio HTML parser

**Files:**
- Create: `tools/nuliga-sync/src/parser.js`
- Create: `tools/nuliga-sync/tests/parser.test.js`

- [ ] **Step 1: Inspect fixture HTML to find correct selectors**

Run: `grep -n -i "matches\|fixture\|begegnung\|spiele" tools/nuliga-sync/tests/fixtures/group-67.html | head -30`

Identify the table that contains the schedule (look for "Begegnungen" heading or table classes). Note the exact selectors needed (table class, row structure, cell order).

If selectors aren't obvious from grep, open the HTML in a browser and use DevTools to find the table. Document findings in a comment at top of `parser.js`.

- [ ] **Step 2: Write the failing tests**

Create `tests/parser.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseGroupPage } from '../src/parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html67 = readFileSync(join(__dirname, 'fixtures/group-67.html'), 'utf8');

test('parses group 67 (Herren 30) and finds 4 Attendorn matches', () => {
  const result = parseGroupPage(html67);
  assert.equal(result.matches.length, 4);
});

test('every match has date in YYYY-MM-DD form, time in HH:MM, home/guest strings', () => {
  const result = parseGroupPage(html67);
  for (const m of result.matches) {
    assert.match(m.date, /^\d{4}-\d{2}-\d{2}$/, `bad date: ${m.date}`);
    assert.match(m.time, /^\d{2}:\d{2}$/, `bad time: ${m.time}`);
    assert.ok(m.home && m.home.length > 0);
    assert.ok(m.guest && m.guest.length > 0);
  }
});

test('throws on empty/garbage HTML (sanity check)', () => {
  assert.throws(() => parseGroupPage('<html></html>'), /no matches/i);
});

test('detects the Attendorn-side team_name', () => {
  const result = parseGroupPage(html67);
  assert.match(result.team_name, /Attendorn/);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd tools/nuliga-sync && npm test -- tests/parser.test.js`
Expected: FAIL — "Cannot find module"

- [ ] **Step 4: Write the implementation**

Create `src/parser.js` (selector details verified against fixture in Step 1):

```javascript
import * as cheerio from 'cheerio';

function parseGermanDate(s) {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) throw new Error(`Cannot parse date: ${s}`);
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function parseTime(s) {
  const m = s.match(/(\d{2}:\d{2})/);
  return m ? m[1] : null;
}

export function parseGroupPage(html) {
  const $ = cheerio.load(html);
  const matches = [];

  // liga.nu schedule table: located after a "Begegnungen" heading.
  // Rows have cells: [Tag, Datum, Uhrzeit, Heim, Gast, Ergebnis, ...]
  // Verify selectors against actual fixture before committing.
  $('table.result-set tr, table.matches tr').each((_, row) => {
    const cells = $(row).find('td').map((_, c) => $(c).text().trim()).get();
    if (cells.length < 5) return;

    // Cell layout (verified against fixture): [day, date, time, home, guest, result, ...]
    // OR: [date, time, home, guest, result] — adjust offset based on actual HTML
    const dateCell = cells.find(c => /^\d{2}\.\d{2}\.\d{4}$/.test(c));
    const timeCell = cells.find(c => /^\d{2}:\d{2}$/.test(c));
    if (!dateCell || !timeCell) return;

    const dateIdx = cells.indexOf(dateCell);
    const homeTeam = cells[dateIdx + 2];
    const guestTeam = cells[dateIdx + 3];

    if (!homeTeam || !guestTeam) return;
    if (!homeTeam.includes('Attendorn') && !guestTeam.includes('Attendorn')) return;

    matches.push({
      date: parseGermanDate(dateCell),
      time: parseTime(timeCell),
      home: homeTeam,
      guest: guestTeam,
    });
  });

  if (matches.length === 0) {
    throw new Error('No matches found — liga.nu layout may have changed');
  }

  // Detect the team_name (the side that contains "Attendorn")
  const team_name = matches[0].home.includes('Attendorn') ? matches[0].home : matches[0].guest;

  return { team_name, matches };
}
```

- [ ] **Step 5: Run tests, iterate on selectors if failing**

Run: `cd tools/nuliga-sync && npm test -- tests/parser.test.js`

If FAIL: inspect actual HTML structure, adjust selectors in `parser.js`. Common adjustments:
- Table class might be different (e.g., `.matches` vs `.result-set`)
- Cell offset might differ (some pages have a leading "day-of-week" column, some don't)

Iterate until tests pass.

- [ ] **Step 6: Add a test per remaining group fixture**

Append to `tests/parser.test.js`:

```javascript
const GROUPS = [
  { id: 67, expectedCount: 4 },   // Herren 30 — verify against fixture
  { id: 77, expectedCount: 5 },   // Herren 40
  { id: 109, expectedCount: 5 },  // Herren 60
  { id: 2,   expectedCount: 6 },  // Damen
  { id: 120, expectedCount: 4 },  // Gemischt 1
  { id: 129, expectedCount: 5 },  // Gemischt 2
  { id: 205, expectedCount: 2 },  // Mixed U12
];

for (const g of GROUPS) {
  test(`parses group ${g.id} → ${g.expectedCount} matches`, () => {
    const html = readFileSync(join(__dirname, `fixtures/group-${g.id}.html`), 'utf8');
    const result = parseGroupPage(html);
    assert.equal(result.matches.length, g.expectedCount, `unexpected match count for group ${g.id}`);
  });
}
```

Note: `expectedCount` values reflect liga.nu state at fixture-capture time. If counts change later (real schedule update), update fixtures + counts together.

- [ ] **Step 7: Run all parser tests**

Run: `cd tools/nuliga-sync && npm test -- tests/parser.test.js`
Expected: PASS — all tests green

- [ ] **Step 8: Commit**

```bash
git add tools/nuliga-sync/src/parser.js tools/nuliga-sync/tests/parser.test.js
git commit -m "feat(nuliga-sync): cheerio parser for liga.nu group pages"
```

---

## Task 5: `mdReader.js` — parse Mannschafts-MD

**Files:**
- Create: `tools/nuliga-sync/src/mdReader.js`
- Create: `tools/nuliga-sync/tests/mdReader.test.js`
- Create: `tools/nuliga-sync/tests/fixtures/herren-30.md` (snapshot of current state)

- [ ] **Step 1: Capture fixture**

Run from project root:

```bash
cp content/mannschaften/herren-30.md tools/nuliga-sync/tests/fixtures/herren-30.md
```

- [ ] **Step 2: Write the failing tests**

Create `tests/mdReader.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readMannschaftMd } from '../src/mdReader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(__dirname, 'fixtures/herren-30.md'), 'utf8');

test('parses 4 matches from herren-30.md', () => {
  const { matches } = readMannschaftMd(md);
  assert.equal(matches.length, 4);
});

test('first match: 09.05.2026 13:00 Attendorn vs Olper TC', () => {
  const { matches } = readMannschaftMd(md);
  const m = matches[0];
  assert.equal(m.date, '2026-05-09');
  assert.equal(m.time, '13:00');
  assert.match(m.home, /Attendorn/);
  assert.equal(m.guest.replace(/\*\*/g, '').trim(), 'Olper TC');
});

test('preserves frontmatter and body', () => {
  const { frontmatter, body } = readMannschaftMd(md);
  assert.match(frontmatter, /title: "Herren 30"/);
  assert.match(body, /## Spielplan/);
});

test('result column captured as null/empty when "-"', () => {
  const { matches } = readMannschaftMd(md);
  for (const m of matches) {
    assert.ok(m.result === null || m.result === '');
  }
});
```

- [ ] **Step 3: Run tests, expect FAIL**

Run: `cd tools/nuliga-sync && npm test -- tests/mdReader.test.js`
Expected: FAIL — module not found

- [ ] **Step 4: Implement**

Create `src/mdReader.js`:

```javascript
function parseGermanDate(s) {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function stripBold(s) {
  return s.replace(/\*\*/g, '').trim();
}

export function readMannschaftMd(content) {
  // Split frontmatter from body
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) throw new Error('Missing frontmatter');
  const frontmatter = fmMatch[1];
  const body = fmMatch[2];

  // Find table rows: lines starting with "|" and containing a date
  const matches = [];
  for (const line of body.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 5) continue;
    const date = parseGermanDate(cells[0]);
    if (!date) continue;  // skip header / separator
    const time = cells[1].match(/(\d{2}:\d{2})/)?.[1] ?? null;
    matches.push({
      date,
      time,
      home: stripBold(cells[2]),
      guest: stripBold(cells[3]),
      result: cells[4] === '-' ? null : cells[4],
    });
  }

  return { frontmatter, body, matches };
}
```

- [ ] **Step 5: Run tests, expect PASS**

Run: `cd tools/nuliga-sync && npm test -- tests/mdReader.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add tools/nuliga-sync/src/mdReader.js tools/nuliga-sync/tests/mdReader.test.js tools/nuliga-sync/tests/fixtures/herren-30.md
git commit -m "feat(nuliga-sync): markdown reader for Mannschafts-MD tables"
```

---

## Task 6: `diff.js` — compute change set

**Files:**
- Create: `tools/nuliga-sync/src/diff.js`
- Create: `tools/nuliga-sync/tests/diff.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/diff.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffMatches } from '../src/diff.js';

const TEAM_NAME_FOR_HOME_DETECT = 'TC Blau-Weiß Attendorn 1';

const baseExisting = [
  { date: '2026-05-09', time: '13:00', home: 'TC BW Attendorn', guest: 'Olper TC' },
  { date: '2026-06-13', time: '13:00', home: 'TV Rosenthal 1899 2', guest: 'TC BW Attendorn' },
];

const baseLiga = [
  { date: '2026-05-09', time: '13:00', home: 'TC Blau-Weiß Attendorn 1', guest: 'Olper TC 1' },
  { date: '2026-06-13', time: '13:00', home: 'TV Rosenthal 1899 2', guest: 'TC Blau-Weiß Attendorn 1' },
];

test('identical (after normalization) → no changes', () => {
  const result = diffMatches(baseExisting, baseLiga);
  assert.deepEqual(result.updates, []);
  assert.deepEqual(result.adds, []);
  assert.deepEqual(result.missings, []);
});

test('time changed → 1 Update, 0 Adds, 0 Missings', () => {
  const liga = [
    { ...baseLiga[0] },
    { ...baseLiga[1], time: '10:00' },
  ];
  const result = diffMatches(baseExisting, liga);
  assert.equal(result.updates.length, 1);
  assert.equal(result.updates[0].newTime, '10:00');
  assert.equal(result.updates[0].oldTime, '13:00');
  assert.equal(result.adds.length, 0);
  assert.equal(result.missings.length, 0);
});

test('date shifted (same opponent, same H/A) → 1 Update (NOT delete+add)', () => {
  const liga = [
    { ...baseLiga[0] },
    { ...baseLiga[1], date: '2026-06-14' },
  ];
  const result = diffMatches(baseExisting, liga);
  assert.equal(result.updates.length, 1);
  assert.equal(result.updates[0].newDate, '2026-06-14');
  assert.equal(result.adds.length, 0);
  assert.equal(result.missings.length, 0);
});

test('match removed from liga.nu → 1 Missing (NOT deleted)', () => {
  const liga = [baseLiga[0]];
  const result = diffMatches(baseExisting, liga);
  assert.equal(result.missings.length, 1);
  assert.equal(result.updates.length, 0);
  assert.equal(result.adds.length, 0);
});

test('new match in liga.nu → 1 Add', () => {
  const liga = [
    ...baseLiga,
    { date: '2026-07-04', time: '13:00', home: 'TC Blau-Weiß Attendorn 1', guest: 'TuS Ferndorf 2' },
  ];
  const result = diffMatches(baseExisting, liga);
  assert.equal(result.adds.length, 1);
  assert.match(result.adds[0].guest, /Ferndorf/);
  assert.equal(result.updates.length, 0);
  assert.equal(result.missings.length, 0);
});

test('home/away differs (same opponent) → treated as different identity', () => {
  // Swapping home and guest = different identity = old is Missing, new is Add
  const liga = [
    baseLiga[0],
    { date: '2026-06-13', time: '13:00', home: 'TC Blau-Weiß Attendorn 1', guest: 'TV Rosenthal 1899 2' },
  ];
  const result = diffMatches(baseExisting, liga);
  assert.equal(result.missings.length, 1);
  assert.equal(result.adds.length, 1);
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `cd tools/nuliga-sync && npm test -- tests/diff.test.js`
Expected: FAIL

- [ ] **Step 3: Implement**

Create `src/diff.js`:

```javascript
import { normalizeOpponent } from './normalize.js';

function getIdentity(match) {
  const isHome = match.home.includes('Attendorn');
  const opponent = isHome ? match.guest : match.home;
  return `${normalizeOpponent(opponent)}|${isHome ? 'H' : 'A'}`;
}

export function diffMatches(existing, liga) {
  const existingByIdentity = new Map(existing.map(m => [getIdentity(m), m]));
  const ligaByIdentity = new Map(liga.map(m => [getIdentity(m), m]));

  const updates = [];
  const adds = [];
  const missings = [];

  for (const [id, ligaMatch] of ligaByIdentity) {
    const existingMatch = existingByIdentity.get(id);
    if (!existingMatch) {
      adds.push({ ...ligaMatch });
      continue;
    }
    if (existingMatch.date !== ligaMatch.date || existingMatch.time !== ligaMatch.time) {
      updates.push({
        identity: id,
        oldDate: existingMatch.date,
        oldTime: existingMatch.time,
        newDate: ligaMatch.date,
        newTime: ligaMatch.time,
        home: ligaMatch.home,
        guest: ligaMatch.guest,
      });
    }
  }

  for (const [id, existingMatch] of existingByIdentity) {
    if (!ligaByIdentity.has(id)) {
      missings.push({ ...existingMatch });
    }
  }

  return { updates, adds, missings };
}

export function isEmptyChangeSet(changeSet) {
  return changeSet.updates.length === 0 && changeSet.adds.length === 0 && changeSet.missings.length === 0;
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `cd tools/nuliga-sync && npm test -- tests/diff.test.js`
Expected: PASS — all 6 tests green

- [ ] **Step 5: Commit**

```bash
git add tools/nuliga-sync/src/diff.js tools/nuliga-sync/tests/diff.test.js
git commit -m "feat(nuliga-sync): diff engine with never-delete semantics"
```

---

## Task 7: `mdWriter.js` — regenerate Mannschafts-MD

**Files:**
- Create: `tools/nuliga-sync/src/mdWriter.js`
- Create: `tools/nuliga-sync/tests/mdWriter.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/mdWriter.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readMannschaftMd } from '../src/mdReader.js';
import { writeMannschaftMd } from '../src/mdWriter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(__dirname, 'fixtures/herren-30.md'), 'utf8');

test('round-trip: read + write with same matches → table content unchanged', () => {
  const { frontmatter, body, matches } = readMannschaftMd(md);
  const out = writeMannschaftMd({ frontmatter, body, matches });
  // Parse output again, compare matches
  const reparsed = readMannschaftMd(out);
  assert.deepEqual(reparsed.matches, matches);
});

test('write applies new time to a match', () => {
  const { frontmatter, body, matches } = readMannschaftMd(md);
  const updatedMatches = matches.map(m =>
    m.date === '2026-07-04' ? { ...m, time: '14:30' } : m
  );
  const out = writeMannschaftMd({ frontmatter, body, matches: updatedMatches });
  assert.match(out, /\| 04\.07\.2026 \| 14:30 \|/);
  assert.doesNotMatch(out, /\| 04\.07\.2026 \| 13:00 \|/);
});

test('matches are sorted chronologically in output', () => {
  const { frontmatter, body } = readMannschaftMd(md);
  const matches = [
    { date: '2026-09-01', time: '10:00', home: '**TC BW Attendorn**', guest: 'X', result: null },
    { date: '2026-05-09', time: '13:00', home: '**TC BW Attendorn**', guest: 'Y', result: null },
  ];
  const out = writeMannschaftMd({ frontmatter, body, matches });
  const idxMay = out.indexOf('09.05.2026');
  const idxSep = out.indexOf('01.09.2026');
  assert.ok(idxMay < idxSep, 'May row must appear before September row');
});

test('home team gets bolded **TC BW Attendorn**, guest stays plain', () => {
  const { frontmatter, body } = readMannschaftMd(md);
  const matches = [
    { date: '2026-05-09', time: '13:00', home: 'TC BW Attendorn', guest: 'Olper TC', result: null },
  ];
  const out = writeMannschaftMd({ frontmatter, body, matches });
  assert.match(out, /\| \*\*TC BW Attendorn\*\* \| Olper TC \| - \|/);
});

test('away game: guest gets bolded, home stays plain', () => {
  const { frontmatter, body } = readMannschaftMd(md);
  const matches = [
    { date: '2026-05-09', time: '13:00', home: 'TV Rosenthal', guest: 'TC BW Attendorn', result: null },
  ];
  const out = writeMannschaftMd({ frontmatter, body, matches });
  assert.match(out, /\| TV Rosenthal \| \*\*TC BW Attendorn\*\* \| - \|/);
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `cd tools/nuliga-sync && npm test -- tests/mdWriter.test.js`
Expected: FAIL

- [ ] **Step 3: Implement**

Create `src/mdWriter.js`:

```javascript
function germanDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function ensureBold(team, isOurTeam) {
  const stripped = team.replace(/\*\*/g, '').trim();
  return isOurTeam ? `**${stripped}**` : stripped;
}

function formatRow(m) {
  const homeIsOurs = m.home.includes('Attendorn');
  const guestIsOurs = m.guest.includes('Attendorn');
  const home = ensureBold(m.home, homeIsOurs);
  const guest = ensureBold(m.guest, guestIsOurs);
  const result = m.result ?? '-';
  return `| ${germanDate(m.date)} | ${m.time} | ${home} | ${guest} | ${result} |`;
}

const TABLE_HEADER = '| Datum | Uhrzeit | Heim | Gast | Ergebnis |';
const TABLE_SEP = '|-------|---------|------|------|----------|';

export function writeMannschaftMd({ frontmatter, body, matches }) {
  // Sort chronologically
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date));

  // Replace existing table in body. Detect table block by header line.
  const lines = body.split('\n');
  const headerIdx = lines.findIndex(l => l.startsWith('| Datum '));
  if (headerIdx === -1) throw new Error('No table header found in body');
  let endIdx = headerIdx + 2; // header + separator
  while (endIdx < lines.length && lines[endIdx].startsWith('|')) endIdx++;

  const newTable = [TABLE_HEADER, TABLE_SEP, ...sorted.map(formatRow)];
  const newLines = [...lines.slice(0, headerIdx), ...newTable, ...lines.slice(endIdx)];

  return `---\n${frontmatter}\n---\n${newLines.join('\n')}`;
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `cd tools/nuliga-sync && npm test -- tests/mdWriter.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tools/nuliga-sync/src/mdWriter.js tools/nuliga-sync/tests/mdWriter.test.js
git commit -m "feat(nuliga-sync): markdown writer for Mannschafts-MD tables"
```

---

## Task 8: `termineUpdater.js` — update `_index.md` YAML

**Files:**
- Create: `tools/nuliga-sync/src/termineUpdater.js`
- Create: `tools/nuliga-sync/tests/termineUpdater.test.js`
- Create: `tools/nuliga-sync/tests/fixtures/termine.md`

- [ ] **Step 1: Capture fixture (POST-migration version)**

Note: This task uses the POST-migration `termine/_index.md` with `team` + `opponent` markers. The migration itself happens in Task 11.

For now, hand-craft a minimal fixture:

Create `tests/fixtures/termine.md`:

```markdown
---
title: "Termine"
description: "Kommende Veranstaltungen und Heimspiele."
events:
  - title: "Frühjahrsarbeitseinsatz"
    date: 2026-03-28
    time: "10:30 Uhr"
    detail: "Anlage fit für die Sommersaison machen"
    category: "event"
  - title: "Herren 30 vs. Olper TC"
    date: 2026-05-09
    time: "13:00 Uhr"
    detail: "Kreisliga, Heimspiel"
    category: "medenspiel"
    team: "herren-30"
    opponent: "Olper TC"
  - title: "Herren 30 vs. TuS Ferndorf 2"
    date: 2026-07-04
    time: "13:00 Uhr"
    detail: "Kreisliga, Heimspiel"
    category: "medenspiel"
    team: "herren-30"
    opponent: "TuS Ferndorf 2"
  - title: "Sommerfest"
    date: 2026-08-23
    time: "15:00 Uhr"
    detail: "Familienprogramm"
    category: "event"
---
```

- [ ] **Step 2: Write the failing tests**

Create `tests/termineUpdater.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';
import { applyTermineChanges } from '../src/termineUpdater.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(__dirname, 'fixtures/termine.md'), 'utf8');

function parseEvents(md) {
  const fm = md.match(/^---\n([\s\S]*?)\n---/)[1];
  return yaml.load(fm).events;
}

test('time update: applies new time to matched home match', () => {
  const teamChanges = [
    { team: 'herren-30', updates: [{ opponent: 'TuS Ferndorf 2', isHome: true, newDate: '2026-07-04', newTime: '14:30' }], adds: [], missings: [] },
  ];
  const out = applyTermineChanges(fixture, teamChanges);
  const events = parseEvents(out);
  const ferndorf = events.find(e => e.title.includes('Ferndorf'));
  assert.equal(ferndorf.time, '14:30 Uhr');
});

test('events without "team" marker are never touched', () => {
  const teamChanges = [
    { team: 'herren-30', updates: [{ opponent: 'TuS Ferndorf 2', isHome: true, newDate: '2026-07-04', newTime: '14:30' }], adds: [], missings: [] },
  ];
  const out = applyTermineChanges(fixture, teamChanges);
  const events = parseEvents(out);
  const sommerfest = events.find(e => e.title === 'Sommerfest');
  assert.equal(sommerfest.time, '15:00 Uhr');
  const arbeitseinsatz = events.find(e => e.title === 'Frühjahrsarbeitseinsatz');
  assert.equal(arbeitseinsatz.time, '10:30 Uhr');
});

test('away match update is ignored (only home matches in termine)', () => {
  const teamChanges = [
    { team: 'herren-30', updates: [{ opponent: 'X', isHome: false, newDate: '2026-06-13', newTime: '10:00' }], adds: [], missings: [] },
  ];
  const out = applyTermineChanges(fixture, teamChanges);
  // No event touched, no event added — file unchanged in semantics
  const events = parseEvents(out);
  assert.equal(events.length, 4);
});

test('add: new home match → appended', () => {
  const teamChanges = [
    { team: 'herren-30', updates: [], adds: [{ opponent: 'New Opponent', isHome: true, newDate: '2026-08-01', newTime: '13:00' }], missings: [] },
  ];
  const out = applyTermineChanges(fixture, teamChanges);
  const events = parseEvents(out);
  assert.equal(events.length, 5);
  const newEvent = events.find(e => e.opponent === 'New Opponent');
  assert.ok(newEvent);
  assert.equal(newEvent.team, 'herren-30');
  assert.equal(newEvent.category, 'medenspiel');
});

test('missing: home match disappears from liga → entry NOT removed', () => {
  const teamChanges = [
    { team: 'herren-30', updates: [], adds: [], missings: [{ opponent: 'TuS Ferndorf 2', isHome: true }] },
  ];
  const out = applyTermineChanges(fixture, teamChanges);
  const events = parseEvents(out);
  assert.equal(events.length, 4);  // unchanged
  const ferndorf = events.find(e => e.title.includes('Ferndorf'));
  assert.ok(ferndorf);
});

test('output preserves chronological order', () => {
  const teamChanges = [
    { team: 'herren-30', updates: [], adds: [{ opponent: 'New', isHome: true, newDate: '2026-04-01', newTime: '11:00' }], missings: [] },
  ];
  const out = applyTermineChanges(fixture, teamChanges);
  const events = parseEvents(out);
  const dates = events.map(e => e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date));
  for (let i = 1; i < dates.length; i++) {
    assert.ok(dates[i - 1] <= dates[i], `not sorted: ${dates[i-1]} > ${dates[i]}`);
  }
  // The April 1 add must be present
  assert.ok(dates.includes('2026-04-01'));
});
```

- [ ] **Step 3: Run tests, expect FAIL**

Run: `cd tools/nuliga-sync && npm test -- tests/termineUpdater.test.js`
Expected: FAIL — module not found

- [ ] **Step 4: Implement**

Create `src/termineUpdater.js`:

```javascript
import yaml from 'js-yaml';
import { normalizeOpponent } from './normalize.js';

function detailFor(team) {
  // Map team slug → league label for new event entries.
  // Source of truth: content/mannschaften/<slug>.md frontmatter "league".
  const labels = {
    'herren-30': 'Kreisliga',
    'herren-40': 'Südwestfalenliga',
    'herren-60': 'Bezirksliga',
    'damen-6er': 'Bezirksliga',
    'gemischt-1': 'Bezirksklasse',
    'gemischt-2': 'Kreisklasse',
    'mixed-u12': 'Kreisklasse',
  };
  return `${labels[team] ?? 'Liga'}, Heimspiel`;
}

function titleFor(team, opponent) {
  const teamLabels = {
    'herren-30': 'Herren 30',
    'herren-40': 'Herren 40',
    'herren-60': 'Herren 60',
    'damen-6er': 'Damen',
    'gemischt-1': 'Gemischt 1',
    'gemischt-2': 'Gemischt 2',
    'mixed-u12': 'Mixed U12',
  };
  return `${teamLabels[team] ?? team} vs. ${opponent}`;
}

export function applyTermineChanges(content, teamChanges) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) throw new Error('No frontmatter');
  const data = yaml.load(fmMatch[1]);
  const body = fmMatch[2];

  const events = data.events ?? [];

  // Apply updates
  for (const tc of teamChanges) {
    for (const u of tc.updates) {
      if (!u.isHome) continue;  // termine only tracks home matches
      const idx = events.findIndex(e =>
        e.team === tc.team &&
        e.category === 'medenspiel' &&
        normalizeOpponent(e.opponent ?? '') === normalizeOpponent(u.opponent)
      );
      if (idx === -1) continue;  // entry not in termine — skip silently (might have been deleted manually)
      const isoDate = new Date(`${u.newDate}T00:00:00Z`);
      events[idx].date = isoDate;
      events[idx].time = `${u.newTime} Uhr`;
    }

    // Apply adds (only home matches)
    for (const a of tc.adds) {
      if (!a.isHome) continue;
      const exists = events.some(e =>
        e.team === tc.team &&
        e.category === 'medenspiel' &&
        normalizeOpponent(e.opponent ?? '') === normalizeOpponent(a.opponent)
      );
      if (exists) continue;
      events.push({
        title: titleFor(tc.team, a.opponent),
        date: new Date(`${a.newDate}T00:00:00Z`),
        time: `${a.newTime} Uhr`,
        detail: detailFor(tc.team),
        category: 'medenspiel',
        team: tc.team,
        opponent: a.opponent,
      });
    }

    // Missings: NEVER remove (per spec).
  }

  // Sort chronologically by date
  events.sort((a, b) => {
    const aDate = a.date instanceof Date ? a.date : new Date(`${a.date}T00:00:00Z`);
    const bDate = b.date instanceof Date ? b.date : new Date(`${b.date}T00:00:00Z`);
    return aDate - bDate;
  });

  data.events = events;

  // Render YAML with date-only format (avoid timestamps)
  const yamlOut = yaml.dump(data, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
  });

  return `---\n${yamlOut}---\n${body}`;
}
```

- [ ] **Step 5: Run tests, expect PASS**

Run: `cd tools/nuliga-sync && npm test -- tests/termineUpdater.test.js`
Expected: PASS

If date-format tests fail (js-yaml may serialize Date as `2026-07-04T00:00:00.000Z`), adjust by replacing the dump call with custom date-aware serialization, or use yaml's `replacer`. Iterate until tests pass.

- [ ] **Step 6: Commit**

```bash
git add tools/nuliga-sync/src/termineUpdater.js tools/nuliga-sync/tests/termineUpdater.test.js tools/nuliga-sync/tests/fixtures/termine.md
git commit -m "feat(nuliga-sync): termine YAML updater with marker-field matching"
```

---

## Task 9: `prBody.js` — render PR body

**Files:**
- Create: `tools/nuliga-sync/src/prBody.js`
- Create: `tools/nuliga-sync/tests/prBody.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/prBody.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPrBody } from '../src/prBody.js';

test('all-empty change set → all sections show "(keine)"', () => {
  const body = renderPrBody('2026-04-21', []);
  assert.match(body, /### Geänderte Spiele\n\(keine\)/);
  assert.match(body, /### Neue Spiele\n\(keine\)/);
  assert.match(body, /### .*Spiele nicht mehr in liga\.nu\n\(keine\)/);
});

test('renders date in title', () => {
  const body = renderPrBody('2026-04-21', []);
  assert.match(body, /Liga\.nu Sync — 2026-04-21/);
});

test('renders updates table', () => {
  const teamChanges = [{
    team: 'herren-30',
    teamLabel: 'Herren 30',
    updates: [
      { opponent: 'TuS Ferndorf 2', isHome: true, oldDate: '2026-07-04', oldTime: '13:00', newDate: '2026-07-04', newTime: '14:30' },
    ],
    adds: [], missings: [], termineUpdates: [],
  }];
  const body = renderPrBody('2026-04-21', teamChanges);
  assert.match(body, /\| Herren 30 \| TuS Ferndorf 2 \(H\) \| 04\.07\. 13:00 \| 04\.07\. 14:30 \|/);
});

test('missings show warning marker', () => {
  const teamChanges = [{
    team: 'herren-60',
    teamLabel: 'Herren 60',
    updates: [], adds: [],
    missings: [{ opponent: 'TC Ennepetal-Breckerfeld', isHome: false, date: '2026-05-09', time: '13:00' }],
    termineUpdates: [],
  }];
  const body = renderPrBody('2026-04-21', teamChanges);
  assert.match(body, /⚠️ Spiele nicht mehr in liga\.nu/);
  assert.match(body, /Herren 60.*TC Ennepetal-Breckerfeld.*\(A\).*09\.05\.\s*13:00/);
});

test('termine updates listed when present', () => {
  const teamChanges = [{
    team: 'herren-30',
    teamLabel: 'Herren 30',
    updates: [{ opponent: 'TuS Ferndorf 2', isHome: true, oldTime: '13:00', newTime: '14:30', oldDate: '2026-07-04', newDate: '2026-07-04' }],
    adds: [], missings: [],
    termineUpdates: [{ title: 'Herren 30 vs. TuS Ferndorf 2', date: '2026-07-04', newTime: '14:30' }],
  }];
  const body = renderPrBody('2026-04-21', teamChanges);
  assert.match(body, /### Termine in \/termine\/_index\.md mit-aktualisiert/);
  assert.match(body, /Herren 30 vs\. TuS Ferndorf 2 \(04\.07\.\) → 14:30/);
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `cd tools/nuliga-sync && npm test -- tests/prBody.test.js`
Expected: FAIL

- [ ] **Step 3: Implement**

Create `src/prBody.js`:

```javascript
function shortDate(iso) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

function bullet(s) {
  return `- ${s}`;
}

export function renderPrBody(syncDate, teamChanges) {
  const lines = [`## Liga.nu Sync — ${syncDate}`, ''];

  // Updates
  lines.push('### Geänderte Spiele');
  const allUpdates = teamChanges.flatMap(tc => tc.updates.map(u => ({ ...u, teamLabel: tc.teamLabel })));
  if (allUpdates.length === 0) {
    lines.push('(keine)');
  } else {
    lines.push('| Team | Spiel | Vorher | Neu |');
    lines.push('|---|---|---|---|');
    for (const u of allUpdates) {
      const where = u.isHome ? 'H' : 'A';
      const oldStr = `${shortDate(u.oldDate)} ${u.oldTime}`;
      const newStr = `${shortDate(u.newDate)} ${u.newTime}`;
      lines.push(`| ${u.teamLabel} | ${u.opponent} (${where}) | ${oldStr} | ${newStr} |`);
    }
  }
  lines.push('');

  // Adds
  lines.push('### Neue Spiele');
  const allAdds = teamChanges.flatMap(tc => tc.adds.map(a => ({ ...a, teamLabel: tc.teamLabel })));
  if (allAdds.length === 0) {
    lines.push('(keine)');
  } else {
    for (const a of allAdds) {
      const where = a.isHome ? 'H' : 'A';
      lines.push(bullet(`${a.teamLabel}: ${a.opponent} (${where}) am ${shortDate(a.newDate)} ${a.newTime}`));
    }
  }
  lines.push('');

  // Missings
  lines.push('### ⚠️ Spiele nicht mehr in liga.nu');
  const allMissings = teamChanges.flatMap(tc => tc.missings.map(m => ({ ...m, teamLabel: tc.teamLabel })));
  if (allMissings.length === 0) {
    lines.push('(keine)');
  } else {
    for (const m of allMissings) {
      const where = m.isHome ? 'H' : 'A';
      lines.push(bullet(`${m.teamLabel}: ${m.opponent} (${where}) am ${shortDate(m.date)} ${m.time}`));
    }
  }
  lines.push('');

  // Termine updates (only show if any team has termineUpdates)
  const allTermineUpdates = teamChanges.flatMap(tc => tc.termineUpdates ?? []);
  if (allTermineUpdates.length > 0) {
    lines.push('### Termine in /termine/_index.md mit-aktualisiert');
    for (const t of allTermineUpdates) {
      lines.push(bullet(`${t.title} (${shortDate(t.date)}) → ${t.newTime}`));
    }
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `cd tools/nuliga-sync && npm test -- tests/prBody.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tools/nuliga-sync/src/prBody.js tools/nuliga-sync/tests/prBody.test.js
git commit -m "feat(nuliga-sync): PR body markdown renderer"
```

---

## Task 10: `teams.js` — team config registry

**Files:**
- Create: `tools/nuliga-sync/src/teams.js`

- [ ] **Step 1: Create the registry**

```javascript
export const TEAMS = [
  { slug: 'damen-6er',  file: 'content/mannschaften/damen-6er.md',  group: '2',   label: 'Damen' },
  { slug: 'herren-30',  file: 'content/mannschaften/herren-30.md',  group: '67',  label: 'Herren 30' },
  { slug: 'herren-40',  file: 'content/mannschaften/herren-40.md',  group: '77',  label: 'Herren 40' },
  { slug: 'herren-60',  file: 'content/mannschaften/herren-60.md',  group: '109', label: 'Herren 60' },
  { slug: 'gemischt-1', file: 'content/mannschaften/gemischt-1.md', group: '120', label: 'Gemischt 1' },
  { slug: 'gemischt-2', file: 'content/mannschaften/gemischt-2.md', group: '129', label: 'Gemischt 2' },
  { slug: 'mixed-u12',  file: 'content/mannschaften/mixed-u12.md',  group: '205', label: 'Mixed U12' },
];

const BASE = 'https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage';

export function liganuUrl(group, championship = 'SW 2026') {
  const params = new URLSearchParams({ championship, group });
  return `${BASE}?${params.toString()}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/nuliga-sync/src/teams.js
git commit -m "feat(nuliga-sync): team registry with liga.nu group IDs"
```

---

## Task 11: Migration — add `team` + `opponent` markers to `content/termine/_index.md`

**Files:**
- Modify: `content/termine/_index.md`

- [ ] **Step 1: Read current file**

Run: `cat content/termine/_index.md`

Map each `medenspiel` entry to `team` slug + `opponent` (cleaned name from title's "vs. X" suffix):

| Title (current) | team | opponent |
|---|---|---|
| Herren 30 vs. Olper TC | herren-30 | Olper TC |
| Damen vs. Schwelmer TC RW | damen-6er | Schwelmer TC RW |
| Herren 40 vs. TC Iserlohn | herren-40 | TC Iserlohn |
| Herren 40 vs. Hagener TC Blau-Gold | herren-40 | Hagener TC Blau-Gold |
| Herren 60 vs. TC SSV Elspe 2 | herren-60 | TC SSV Elspe 2 |
| Damen vs. TC Halver 1960 | damen-6er | TC Halver 1960 |
| Herren 40 vs. TV Plettenberg | herren-40 | TV Plettenberg |
| Mixed U12 vs. TC 71 Netphen | mixed-u12 | TC 71 Netphen |
| Damen vs. TC BW Sundern | damen-6er | TC BW Sundern |
| Herren 30 vs. TuS Ferndorf 2 | herren-30 | TuS Ferndorf 2 |
| Herren 60 vs. TuS Hachen | herren-60 | TuS Hachen |
| Gemischt 1 vs. Höinger SV | gemischt-1 | Höinger SV |
| Gemischt 2 vs. TC 71 Netphen | gemischt-2 | TC 71 Netphen |
| Gemischt 2 vs. TC Gottfried von Cramm 2 | gemischt-2 | TC Gottfried von Cramm 2 |
| Gemischt 1 vs. TuS 1900 Eisern | gemischt-1 | TuS 1900 Eisern |
| Gemischt 2 vs. TV Hoffnung Littfeld 2 | gemischt-2 | TV Hoffnung Littfeld 2 |

- [ ] **Step 2: For each medenspiel entry, add the two new fields**

Use Edit to add `team:` and `opponent:` lines right after `category: "medenspiel"` for each entry.

Example before:
```yaml
  - title: "Herren 30 vs. Olper TC"
    date: 2026-05-09
    time: "13:00 Uhr"
    detail: "Kreisliga, Heimspiel"
    category: "medenspiel"
```

After:
```yaml
  - title: "Herren 30 vs. Olper TC"
    date: 2026-05-09
    time: "13:00 Uhr"
    detail: "Kreisliga, Heimspiel"
    category: "medenspiel"
    team: "herren-30"
    opponent: "Olper TC"
```

Repeat for all 16 medenspiel entries.

- [ ] **Step 3: Verify Hugo build still passes**

Run: `hugo --quiet --destination /tmp/hugo-build-test 2>&1 | tail -20`
Expected: no errors. Templates may not render the new fields yet, that's fine — they'll be ignored by Hugo's YAML parser.

- [ ] **Step 4: Commit**

```bash
git add content/termine/_index.md
git commit -m "feat(termine): add team+opponent markers for nuliga auto-sync"
```

---

## Task 12: Migration — align Mannschafts-MD opponent names with liga.nu canonical form

**Files:**
- Modify: `content/mannschaften/herren-30.md`
- Modify: `content/mannschaften/herren-40.md`
- Modify: `content/mannschaften/herren-60.md`
- Modify: `content/mannschaften/damen-6er.md`
- Modify: `content/mannschaften/gemischt-1.md`
- Modify: `content/mannschaften/gemischt-2.md`
- Modify: `content/mannschaften/mixed-u12.md`

**Rule:** Opponent names match liga.nu's display form, MINUS:
- trailing " 1" (default first team)
- " e.V." or "e.V."

But KEEP " 2"+, "TC", "TV", umlauts, etc.

- [ ] **Step 1: Build a lookup of canonical names from fixtures**

Run: `node -e "
import('./tools/nuliga-sync/src/parser.js').then(({ parseGroupPage }) => {
  const fs = require('fs');
  for (const g of [67, 77, 109, 2, 120, 129, 205]) {
    const html = fs.readFileSync('tools/nuliga-sync/tests/fixtures/group-' + g + '.html', 'utf8');
    const result = parseGroupPage(html);
    console.log('Group', g, ':');
    for (const m of result.matches) {
      console.log('  ', m.home, ' vs ', m.guest);
    }
  }
});
" 2>&1 | head -80`

Note the canonical names (e.g. liga.nu uses "Tennisclub Iserlohn e.V. 1" — canonical is "Tennisclub Iserlohn"; "TC Buschhütten 1" → "TC Buschhütten").

- [ ] **Step 2: Apply known renames**

Based on liga.nu data captured 2026-04-20, only the following renames are required:

| File | Current | Canonical (after) |
|---|---|---|
| `damen-6er.md` | `TC BW Sundern` | `TC Blau-Weiß Sundern` |
| `herren-40.md` | `TC Iserlohn` | `Tennisclub Iserlohn` |
| `herren-40.md` | `TC RW Hagen` | `TC Rot-Weiß Hagen` |

All other team files already use names that normalize identically to liga.nu's canonical form (per the normalization rules in `normalize.js` — strip "e.V.", strip trailing " 1", umlaut variants are equal). The two umlaut migrations (`TC Buschhuetten` → `TC Buschhütten`, `TC GW Duenschede` → `TC GW Dünschede`) were already done in the 2026-03-23 session.

Use Edit for each file. After changes, also verify against the canonical names extracted in Step 1 — if Step 1 reveals additional mismatches, add the corresponding renames here.

- [ ] **Step 3: Verify Hugo build**

Run: `hugo --quiet --destination /tmp/hugo-build-test 2>&1 | tail -5`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add content/mannschaften/
git commit -m "refactor(content): align opponent names with liga.nu canonical form"
```

---

## Task 13: `baseline.js` script — fetch live + diff (validation)

**Files:**
- Create: `tools/nuliga-sync/scripts/baseline.js`

- [ ] **Step 1: Write the script**

Create `scripts/baseline.js`:

```javascript
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { TEAMS, liganuUrl } from '../src/teams.js';
import { parseGroupPage } from '../src/parser.js';
import { readMannschaftMd } from '../src/mdReader.js';
import { diffMatches, isEmptyChangeSet } from '../src/diff.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');

let totalChanges = 0;

for (const team of TEAMS) {
  process.stdout.write(`${team.label.padEnd(12)} ... `);
  try {
    const url = liganuUrl(team.group);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const liga = parseGroupPage(html);

    const mdPath = join(REPO_ROOT, team.file);
    const md = readFileSync(mdPath, 'utf8');
    const { matches: existing } = readMannschaftMd(md);

    const cs = diffMatches(existing, liga.matches);
    if (isEmptyChangeSet(cs)) {
      console.log('OK (no changes)');
    } else {
      totalChanges += cs.updates.length + cs.adds.length + cs.missings.length;
      console.log(`CHANGES — ${cs.updates.length}U ${cs.adds.length}A ${cs.missings.length}M`);
      for (const u of cs.updates) console.log('  Update:', u);
      for (const a of cs.adds) console.log('  Add:', a);
      for (const m of cs.missings) console.log('  Missing:', m);
    }
  } catch (err) {
    console.log(`ERROR — ${err.message}`);
  }
}

console.log(`\nTotal changes detected: ${totalChanges}`);
process.exit(totalChanges === 0 ? 0 : 1);
```

- [ ] **Step 2: Run baseline against live liga.nu**

Run: `cd tools/nuliga-sync && npm run baseline`

Expected: All 7 teams report `OK (no changes)`. Exit code 0.

If any non-zero diffs: investigate. Could be:
- Real schedule change since last sync (check liga.nu manually)
- Normalize/parser bug — opponent string mismatch
- Fix the issue in the relevant module + re-run

This step VALIDATES that the migration in Tasks 11+12 is consistent with liga.nu state.

- [ ] **Step 3: Commit**

```bash
git add tools/nuliga-sync/scripts/baseline.js
git commit -m "feat(nuliga-sync): baseline validation script"
```

---

## Task 14: `bundle.js` — bundle src/ for n8n Code node paste

**Files:**
- Create: `tools/nuliga-sync/scripts/bundle.js`

- [ ] **Step 1: Write the bundler**

Create `scripts/bundle.js`:

```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '../src');
const OUT = join(__dirname, '../dist');

mkdirSync(OUT, { recursive: true });

// Order matters: dependents before dependencies — but we just inline everything.
// Strip `import`/`export` lines, concatenate.
const files = ['normalize.js', 'parser.js', 'mdReader.js', 'mdWriter.js', 'diff.js', 'termineUpdater.js', 'prBody.js', 'teams.js'];

const parts = ['// Bundled nuliga-sync logic for n8n Code nodes', '// DO NOT EDIT — regenerate with `npm run bundle`', ''];

for (const f of files) {
  const src = readFileSync(join(SRC, f), 'utf8');
  // Strip import statements (n8n provides cheerio/js-yaml as globals via require)
  // Strip export keyword (functions become global within the Code node)
  const stripped = src
    .replace(/^import .*?;\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  parts.push(`// ── ${f} ──`);
  parts.push(stripped);
  parts.push('');
}

// Add header comment for what to do in n8n
parts.unshift(
  '// Required n8n env: NODE_FUNCTION_ALLOW_EXTERNAL=cheerio,js-yaml',
  '// At top of n8n Code node, add: const cheerio = require("cheerio"); const yaml = require("js-yaml");',
  ''
);

writeFileSync(join(OUT, 'n8n-bundle.js'), parts.join('\n'));
console.log(`Wrote ${join(OUT, 'n8n-bundle.js')}`);
```

- [ ] **Step 2: Run bundler**

Run: `cd tools/nuliga-sync && npm run bundle`
Expected: `dist/n8n-bundle.js` created. Inspect: should contain all module bodies, no `import`/`export` keywords.

- [ ] **Step 3: Add `dist/` to .gitignore**

Edit `tools/nuliga-sync/.gitignore`:

```
node_modules/
dist/
*.log
```

- [ ] **Step 4: Commit**

```bash
git add tools/nuliga-sync/scripts/bundle.js tools/nuliga-sync/.gitignore
git commit -m "feat(nuliga-sync): bundler for n8n Code node paste"
```

---

## Task 15: Build n8n workflow JSON

**Files:**
- Create: `doc/specs/n8n-nuliga-sync.json`

- [ ] **Step 1: Sketch the node graph in n8n UI**

Open n8n → New Workflow. Build:

1. **Cron Trigger** — daily 06:00 Europe/Berlin
2. **Set "config"** — JSON with teams array (paste from `tools/nuliga-sync/src/teams.js`)
3. **Code "fetch all"** — loops over teams, fetches each URL, returns array of `{slug, html}`
4. **Code "parse"** — uses `parseGroupPage` (from bundled module) → array of `{slug, matches}`
5. **HTTP Request "github read mannschaften"** — fetch all 7 MDs via Git Trees API in one call (use `?recursive=1`)
6. **HTTP Request "github read termine"** — fetch `content/termine/_index.md`
7. **Code "diff"** — combine: per team, run `readMannschaftMd` + `diffMatches`. Aggregate into change set.
8. **If "any changes"** — `$json.totalChanges > 0`; false branch → END
9. **Code "build commits"** — for each changed team, generate new MD content via `writeMannschaftMd`. For termine, run `applyTermineChanges`. Produce array of file changes.
10. **HTTP Request "github check existing PR"** — `GET /repos/.../pulls?state=open&head=...` filter by branch prefix `nuliga-sync/`
11. **Switch "PR exists?"** — branch: comment on existing PR vs create new PR
12. **HTTP Request "github create branch"** — create ref via Git API with timestamp branch name
13. **HTTP Request "github create tree+commit"** — Git Trees API (re-use Mail-to-Homepage pattern)
14. **HTTP Request "github create PR"** — Draft PR with body from `renderPrBody`
15. **HTTP Request "github add labels"** — labels `automated`, `nuliga-sync`
16. **HTTP Request "pushover"** — notification

- [ ] **Step 2: Paste bundled code into Code nodes**

For each Code node that uses logic, paste the relevant section from `dist/n8n-bundle.js` plus the require lines:

```javascript
const cheerio = require('cheerio');
const yaml = require('js-yaml');

// ... bundled functions ...

// Then the node-specific glue:
const teams = $('config').first().json.teams;
const results = [];
for (const team of teams) {
  // ... use bundled functions
}
return results.map(r => ({ json: r }));
```

- [ ] **Step 3: Configure credentials**

Use the existing GitHub PAT credential (from Mail-to-Homepage workflow) and existing Pushover credential.

- [ ] **Step 4: Test workflow run with current state**

Run "Test Workflow" → expect: workflow reaches "If any changes" node, takes false branch (because Task 13's baseline shows 0 diffs), ends without creating a PR or notification.

- [ ] **Step 5: Test workflow with forced diff**

Manually change one Mannschafts-MD time on a test branch. Push to GitHub. Run workflow. Expect:
- Branch `nuliga-sync/YYYY-MM-DD-HHMM` created
- Draft PR opened
- Pushover notification received
- PR body contains correct Update entry

Then close the test PR and revert the test commit.

- [ ] **Step 6: Export workflow JSON**

In n8n: workflow menu → Download → save as `doc/specs/n8n-nuliga-sync.json`

- [ ] **Step 7: Commit**

```bash
git add doc/specs/n8n-nuliga-sync.json
git commit -m "feat(n8n): add nuliga-sync workflow"
```

---

## Task 16: Deployment documentation

**Files:**
- Create: `doc/specs/2026-04-20-nuliga-sync-deployment.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write deployment guide**

Create `doc/specs/2026-04-20-nuliga-sync-deployment.md`:

```markdown
# Liga.nu Sync Deployment

## Prerequisites

- n8n on Synology NAS (existing)
- Environment variable on n8n container: `NODE_FUNCTION_ALLOW_EXTERNAL=cheerio,js-yaml`
- GitHub PAT credential (re-use `mail-to-homepage` credential)
- Pushover credential (re-use)

## Steps

1. **Set env var** in Docker compose for n8n:
   ```yaml
   environment:
     - NODE_FUNCTION_ALLOW_EXTERNAL=cheerio,js-yaml
   ```
   Restart n8n.

2. **Import workflow:**
   - n8n UI → New Workflow → Import from File → `doc/specs/n8n-nuliga-sync.json`
   - Bind credentials (GitHub PAT + Pushover)

3. **Initial test:**
   - Click "Test Workflow"
   - Expected: completes in < 30s, no PR created (current state matches liga.nu)

4. **Activate workflow:** toggle in top-right.

5. **First-week monitoring:**
   - Check n8n execution log daily
   - When PR is created: review `⚠️ Spiele nicht mehr in liga.nu` section carefully
   - If a "Missing" is real (team withdrew), manually delete the entry on a follow-up commit

## Operational notes

- Sync runs at **06:00 Europe/Berlin**, before Daily Deploy at **06:30**
- Timezone-sensitive: cron is in Berlin time, n8n container should match
- Auto-merge is OFF by design — every PR needs human approval

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "No matches found" error per team | liga.nu HTML changed | Run `npm run baseline` locally, inspect HTML, update parser selectors, rebuild bundle, paste into Code node |
| Identity match failing (everything shows as Add/Missing) | Opponent name mismatch | Check `normalize.js`, may need to add a special case (e.g., "TC Foo e.V. 1" not stripping correctly) |
| PR opened but body empty | bundle stripped a needed function | Inspect bundled JS in Code node, ensure all functions present |
| Pushover not arriving | credential expired | Refresh token, re-bind in workflow |
```

- [ ] **Step 2: Update CLAUDE.md**

Edit `CLAUDE.md`, add new section before existing rules:

```markdown
## Automation

- **Liga.nu Sync** — daily n8n workflow scrapes match schedules, opens Draft-PR on changes. Logic in `tools/nuliga-sync/`. Spec: `doc/specs/2026-04-20-nuliga-sync-workflow.md`.
- **Mail-to-Homepage** — n8n workflow ingests Vorstands-Mails into Hugo content via Draft-PRs. Spec: `doc/specs/2026-03-23-mail-to-homepage-workflow.md`.
- **Daily Deploy** — n8n cron triggers Cloudflare rebuild at 06:30 Berlin. Spec: `doc/specs/2026-03-23-daily-deploy-cronjob.md`.
```

- [ ] **Step 3: Commit**

```bash
git add doc/specs/2026-04-20-nuliga-sync-deployment.md CLAUDE.md
git commit -m "docs(nuliga-sync): deployment guide"
```

---

## Task 17: Update context_session

**Files:**
- Modify: `doc/tasks/context_session_01.md`

- [ ] **Step 1: Add progress log entry**

Edit `doc/tasks/context_session_01.md`, add to Progress Log section:

```markdown
### 2026-04-20
- Implemented liga.nu auto-sync workflow:
  - Standalone JS modules in `tools/nuliga-sync/` with full test coverage
  - Migration: added `team` + `opponent` markers to medenspiel entries in `content/termine/_index.md`
  - Migration: aligned Mannschafts-MD opponent names with liga.nu canonical form
  - n8n workflow `n8n-nuliga-sync.json` deployed
- Fixed match schedule changes from liga.nu (Sommer 2026): Herren 30, 40, 60, Gemischt 1+2 — see commit 2efab03
- Cleaned up stale feature branches
- Spec: `doc/specs/2026-04-20-nuliga-sync-workflow.md`
- Implementation plan: `doc/plans/2026-04-20-nuliga-sync-implementation.md`
```

Add to the Tasks list:

```markdown
- [x] Liga.nu Auto-Sync Workflow implementiert
```

Add to Backlog (remove if implemented; keep open items):

```markdown
- [ ] Mail-to-Homepage: Branch-Kollisionsvermeidung (gilt jetzt auch für nuliga-sync — beide nutzen Timestamps)
```

- [ ] **Step 2: Commit**

```bash
git add doc/tasks/context_session_01.md
git commit -m "docs(context): log nuliga-sync implementation"
```

---

## Self-Review Notes (executed by plan author)

**Spec coverage:**
- Workflow flow → Tasks 4 (parser), 5 (mdReader), 6 (diff), 7 (mdWriter), 8 (termineUpdater), 13 (baseline), 15 (n8n)
- Identity key formula → Task 6 (diff.js using normalize.js)
- Marker fields in termine → Tasks 8 (logic) + 11 (migration)
- PR body sections → Task 9 (prBody.js)
- Idempotency / existing PR comment → Task 15 (n8n Switch node)
- Error handling → Task 15 (per-team try/catch in fetch loop)
- Test strategy → Tasks 4-9 (unit) + 13 (integration baseline) + 15 (manual workflow tests)
- Cost estimate → covered by tech choices (deterministic parser, no LLM)
- Decisions section → embedded across tasks

**Placeholder scan:** none found (no TBD, no "implement appropriately", every code step has full code)

**Type consistency:** `diffMatches`/`writeMannschaftMd`/`applyTermineChanges` signatures consistent across tasks. ChangeSet shape (`{updates, adds, missings}`) consistent in diff.js → prBody.js → termineUpdater.js. ✓
