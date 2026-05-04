# nuliga-sync Phase 2 (WTV Pokal) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing `tools/nuliga-sync` to also auto-sync WTV Pokal home matches into `content/termine/_index.md`, while keeping the Medenspiel sync flow untouched.

**Architecture:** Minimal-invasive extension of the existing pipeline. Add a `kind: 'medenspiel' | 'pokal'` discriminator to `TEAMS`, branch the runner loop on kind, reuse parser + diff for both kinds. Pokal-existing-matches come from `_index.md` (filtered by `liga_group`) instead of a Mannschafts-MD. No new modules, no n8n-workflow changes — just code, tests, fixtures, and a regenerated bundle.

**Tech Stack:** Node 20+ (ESM), `node --test`, `cheerio`, `js-yaml`. Bundled into a single n8n Code-node file via `npm run bundle`.

**Reference Spec:** `doc/specs/2026-05-04-nuliga-sync-pokal.md`

**Working directory:** `tools/nuliga-sync/` (npm scripts assume CWD)

---

## File Map

| File | Change |
|---|---|
| `tools/nuliga-sync/tests/fixtures/group-2229674.html` | Create — live HTML snapshot |
| `tools/nuliga-sync/tests/fixtures/group-2229754.html` | Create — live HTML snapshot |
| `tools/nuliga-sync/tests/fixtures/termine.md` | Modify — add 2 Pokal entries |
| `tools/nuliga-sync/tests/termineUpdater.test.js` | Modify — adjust 3 length assertions, add 4 Pokal cases |
| `tools/nuliga-sync/tests/teams.test.js` | Create — verify TEAMS shape |
| `tools/nuliga-sync/tests/syncRunner.test.js` | Modify — add Pokal flow assertions |
| `tools/nuliga-sync/src/teams.js` | Modify — explicit `kind`, 2 new pokal entries |
| `tools/nuliga-sync/src/termineUpdater.js` | Modify — `findPokalIdx`, `buildEventEntry`, kind-branch |
| `tools/nuliga-sync/src/syncRunner.js` | Modify — kind-branch + `pokalExistingFromTermine` helper |
| `tools/nuliga-sync/scripts/baseline.js` | Modify — kind-branch (pokal reads from `_index.md`) |
| `tools/nuliga-sync/dist/n8n-bundle.js` | Regenerate via `npm run bundle` |
| `doc/specs/2026-04-20-nuliga-sync-deployment.md` | Modify — add Pokal note |

No changes: `parser.js`, `diff.js`, `prBody.js`, `mdReader.js`, `mdWriter.js`, `normalize.js`, `doc/specs/n8n-nuliga-sync.json`.

---

## Task 1: Test Fixtures + Assertion Adjustments

Goal: Get all new fixtures in place and update existing test assertions so `npm test` stays green throughout the rest of the plan, *before* any production code changes.

**Files:**
- Create: `tools/nuliga-sync/tests/fixtures/group-2229674.html`
- Create: `tools/nuliga-sync/tests/fixtures/group-2229754.html`
- Modify: `tools/nuliga-sync/tests/fixtures/termine.md`
- Modify: `tools/nuliga-sync/tests/termineUpdater.test.js` (assertions on lines 50, 59, 72)

- [ ] **Step 1: Download Pokal liga.nu HTML snapshots**

```bash
cd tools/nuliga-sync
curl -s 'https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage?championship=WTV+VP+2026&group=2229674' > tests/fixtures/group-2229674.html
curl -s 'https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage?championship=WTV+VP+2026&group=2229754' > tests/fixtures/group-2229754.html
```

Expected: Two files, each several KB. Sanity check:

```bash
grep -c 'Attendorn' tests/fixtures/group-2229674.html
grep -c 'Attendorn' tests/fixtures/group-2229754.html
```

Both should be ≥ 1 (Attendorn appears in the schedule table).

- [ ] **Step 2: Extend `tests/fixtures/termine.md` with 2 Pokal entries**

Replace the existing fixture content with this expanded version:

```yaml
---
title: "Termine"
description: "Kommende Veranstaltungen und Heimspiele."
events:
  - title: "Frühjahrsarbeitseinsatz"
    date: 2026-03-28
    time: "10:30 Uhr"
    detail: "Anlage fit für die Sommersaison machen"
    category: "event"
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

The fixture now has 6 events (was 4): Frühjahrsarbeitseinsatz, 2× Pokal, Herren 30 vs. Olper TC, Herren 30 vs. Ferndorf, Sommerfest.

- [ ] **Step 3: Adjust 3 existing length assertions in termineUpdater.test.js**

Change the magic numbers in 3 tests (length 4 → 6, length 5 → 7):

In `tests/termineUpdater.test.js`:

```diff
 test('away match update is ignored (termine only tracks home matches)', () => {
   const teamChanges = [
     { team: 'herren-30', updates: [{ opponent: 'X', isHome: false, newDate: '2026-06-13', newTime: '10:00' }], adds: [], missings: [] },
   ];
   const out = applyTermineChanges(fixture, teamChanges);
   const events = parseEvents(out);
-  assert.equal(events.length, 4);
+  assert.equal(events.length, 6);
 });

 test('add: new home match → appended', () => {
   const teamChanges = [
     { team: 'herren-30', updates: [], adds: [{ opponent: 'New Opponent', isHome: true, newDate: '2026-08-01', newTime: '13:00' }], missings: [] },
   ];
   const out = applyTermineChanges(fixture, teamChanges);
   const events = parseEvents(out);
-  assert.equal(events.length, 5);
+  assert.equal(events.length, 7);
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
-  assert.equal(events.length, 4);
+  assert.equal(events.length, 6);
   const ferndorf = events.find(e => e.title.includes('Ferndorf'));
   assert.ok(ferndorf);
 });
```

- [ ] **Step 4: Run tests — must stay green**

```bash
cd tools/nuliga-sync
npm test
```

Expected: All tests pass. The fixture extension didn't break anything; we just bumped the length assertions to match the larger fixture.

- [ ] **Step 5: Commit**

```bash
git add tools/nuliga-sync/tests/fixtures/group-2229674.html \
        tools/nuliga-sync/tests/fixtures/group-2229754.html \
        tools/nuliga-sync/tests/fixtures/termine.md \
        tools/nuliga-sync/tests/termineUpdater.test.js
git commit -m "$(cat <<'EOF'
test(nuliga-sync): add Pokal fixtures, extend termine.md, adjust length assertions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: TEAMS Registry — `kind` field + Pokal Entries

**Files:**
- Modify: `tools/nuliga-sync/src/teams.js`
- Create: `tools/nuliga-sync/tests/teams.test.js`

- [ ] **Step 1: Write failing test `tests/teams.test.js`**

Create `tools/nuliga-sync/tests/teams.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEAMS, liganuUrl } from '../src/teams.js';

test('TEAMS contains 7 medenspiel + 2 pokal entries', () => {
  assert.equal(TEAMS.length, 9);
  const byKind = TEAMS.reduce((acc, t) => {
    acc[t.kind] = (acc[t.kind] ?? 0) + 1;
    return acc;
  }, {});
  assert.deepEqual(byKind, { medenspiel: 7, pokal: 2 });
});

test('every team has a kind field', () => {
  for (const t of TEAMS) {
    assert.ok(t.kind, `team ${t.slug} missing kind`);
    assert.match(t.kind, /^(medenspiel|pokal)$/);
  }
});

test('medenspiel teams have file path', () => {
  for (const t of TEAMS.filter(t => t.kind === 'medenspiel')) {
    assert.ok(t.file?.startsWith('content/mannschaften/'), `team ${t.slug} missing file`);
  }
});

test('pokal teams have championship + pokalDetail and no file', () => {
  for (const t of TEAMS.filter(t => t.kind === 'pokal')) {
    assert.ok(t.championship, `pokal team ${t.slug} missing championship`);
    assert.ok(t.pokalDetail, `pokal team ${t.slug} missing pokalDetail`);
    assert.equal(t.file, undefined);
  }
});

test('liganuUrl uses SW 2026 default for medenspiel', () => {
  const url = liganuUrl('67');
  assert.match(url, /championship=SW\+2026/);
  assert.match(url, /group=67/);
});

test('liganuUrl accepts pokal championship', () => {
  const url = liganuUrl('2229674', 'WTV VP 2026');
  assert.match(url, /championship=WTV\+VP\+2026/);
  assert.match(url, /group=2229674/);
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd tools/nuliga-sync
npm test -- tests/teams.test.js 2>&1 | tail -30
```

Expected: Tests fail because `TEAMS.length === 7` (not 9) and no team has `kind` set.

- [ ] **Step 3: Update `src/teams.js` to make tests pass**

Replace the contents of `tools/nuliga-sync/src/teams.js`:

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

- [ ] **Step 4: Run all tests — full suite still green**

```bash
cd tools/nuliga-sync
npm test
```

Expected: All tests pass, including `teams.test.js`. The existing `syncRunner.test.js` may now fail because the loop iterates 9 teams and the fixture mock only has 7 group HTML files — *expected*, we'll fix that in Task 4. **For this commit, the `teams.test.js` and `termineUpdater.test.js` tests must pass; `syncRunner.test.js` failures are acceptable here.**

If `syncRunner.test.js` fails with "ENOENT group-2229674.html", note this is expected and proceed.

```bash
npm test -- tests/teams.test.js tests/termineUpdater.test.js tests/parser.test.js tests/diff.test.js tests/normalize.test.js tests/mdReader.test.js tests/mdWriter.test.js tests/prBody.test.js
```

Expected: All listed test files pass.

- [ ] **Step 5: Commit**

```bash
git add tools/nuliga-sync/src/teams.js tools/nuliga-sync/tests/teams.test.js
git commit -m "$(cat <<'EOF'
feat(nuliga-sync): add kind field to TEAMS and 2 Pokal pseudo-teams

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: termineUpdater.js — Pokal Branch

**Files:**
- Modify: `tools/nuliga-sync/src/termineUpdater.js`
- Modify: `tools/nuliga-sync/tests/termineUpdater.test.js`

- [ ] **Step 1: Write 4 failing test cases**

Append to `tools/nuliga-sync/tests/termineUpdater.test.js` (after the last existing test):

```js
test('pokal update: existing pokal entry → date/time updated', () => {
  const teamChanges = [
    {
      kind: 'pokal',
      teamLabel: 'Herren-Pokal',
      ligaGroup: '2229674',
      championship: 'WTV VP 2026',
      pokalDetail: 'WTV Vereinspokal · Herren LK 18,0–25,0, Heimspiel',
      updates: [{ opponent: 'TV Rönkhausen 1892 TA', isHome: true, newDate: '2026-05-05', newTime: '19:30' }],
      adds: [],
      missings: [],
    },
  ];
  const out = applyTermineChanges(fixture, teamChanges);
  const events = parseEvents(out);
  const pokal = events.find(e => e.category === 'pokal' && e.liga_group === '2229674');
  assert.ok(pokal);
  assert.equal(pokal.time, '19:30 Uhr');
  assert.equal(isoDateString(pokal.date), '2026-05-05');
});

test('pokal add: new pokal match appended with all marker fields', () => {
  const teamChanges = [
    {
      kind: 'pokal',
      teamLabel: 'Herren 40-Pokal',
      ligaGroup: '2229754',
      championship: 'WTV VP 2026',
      pokalDetail: 'WTV Vereinspokal · Herren Ü40 LK 1,0–25,0, Heimspiel',
      updates: [],
      adds: [{ opponent: 'New Pokal Opponent', isHome: true, newDate: '2026-06-01', newTime: '18:30' }],
      missings: [],
    },
  ];
  const out = applyTermineChanges(fixture, teamChanges);
  const events = parseEvents(out);
  const added = events.find(e => e.opponent === 'New Pokal Opponent');
  assert.ok(added);
  assert.equal(added.category, 'pokal');
  assert.equal(added.liga_group, '2229754');
  assert.equal(added.liga_championship, 'WTV VP 2026');
  assert.equal(added.detail, 'WTV Vereinspokal · Herren Ü40 LK 1,0–25,0, Heimspiel');
  assert.equal(added.title, 'Herren 40-Pokal vs. New Pokal Opponent');
  assert.equal(added.time, '18:30 Uhr');
  assert.equal(added.team, undefined);
});

test('cross-contamination: pokal sync does NOT update medenspiel entry with same opponent', () => {
  // Construct a fixture where a medenspiel and a pokal entry share the same opponent string.
  // We use an inline modified fixture to avoid touching the shared fixture file.
  const customFixture = fixture.replace(
    'opponent: "TV Rönkhausen 1892 TA"',
    'opponent: "Olper TC"',  // pokal opponent now equals an existing medenspiel opponent
  );
  const teamChanges = [
    {
      kind: 'pokal',
      teamLabel: 'Herren-Pokal',
      ligaGroup: '2229674',
      championship: 'WTV VP 2026',
      pokalDetail: 'WTV Vereinspokal · Herren LK 18,0–25,0, Heimspiel',
      updates: [{ opponent: 'Olper TC', isHome: true, newDate: '2026-05-05', newTime: '20:00' }],
      adds: [],
      missings: [],
    },
  ];
  const out = applyTermineChanges(customFixture, teamChanges);
  const events = parseEvents(out);
  const medenspiel = events.find(e => e.category === 'medenspiel' && e.opponent === 'Olper TC');
  // Medenspiel time must be unchanged
  assert.equal(medenspiel.time, '13:00 Uhr');
  // Pokal time must be updated
  const pokal = events.find(e => e.category === 'pokal' && e.opponent === 'Olper TC');
  assert.equal(pokal.time, '20:00 Uhr');
});

test('cross-contamination: medenspiel sync does NOT update pokal entry with same opponent', () => {
  // Reverse direction: a medenspiel update with an opponent that also appears in a pokal entry must not touch the pokal entry.
  const customFixture = fixture.replace(
    'opponent: "Olper TC"',
    'opponent: "TV Rönkhausen 1892 TA"',  // medenspiel opponent now equals the pokal opponent
  );
  const teamChanges = [
    {
      kind: 'medenspiel',
      team: 'herren-30',
      teamLabel: 'Herren 30',
      updates: [{ opponent: 'TV Rönkhausen 1892 TA', isHome: true, newDate: '2026-05-09', newTime: '15:00' }],
      adds: [],
      missings: [],
    },
  ];
  const out = applyTermineChanges(customFixture, teamChanges);
  const events = parseEvents(out);
  const pokal = events.find(e => e.category === 'pokal' && e.liga_group === '2229674');
  // Pokal time must be unchanged
  assert.equal(pokal.time, '18:00 Uhr');
  const medenspiel = events.find(e => e.category === 'medenspiel' && e.team === 'herren-30' && e.opponent === 'TV Rönkhausen 1892 TA');
  assert.equal(medenspiel.time, '15:00 Uhr');
});
```

- [ ] **Step 2: Run new tests — must fail**

```bash
cd tools/nuliga-sync
npm test -- tests/termineUpdater.test.js 2>&1 | tail -40
```

Expected: 4 new tests fail with various errors (e.g. "Cannot read properties of undefined", or pokal entry not updated, or pokal entry updated but medenspiel also updated).

- [ ] **Step 3: Update `src/termineUpdater.js`**

Replace the entire contents of `tools/nuliga-sync/src/termineUpdater.js` with:

```js
import yaml from 'js-yaml';
import { normalizeOpponent } from './normalize.js';

const LEAGUE_LABELS = {
  'herren-30': 'Kreisliga',
  'herren-40': 'Südwestfalenliga',
  'herren-60': 'Bezirksliga',
  'damen-6er': 'Bezirksliga',
  'gemischt-1': 'Bezirksklasse',
  'gemischt-2': 'Kreisklasse',
  'mixed-u12': 'Kreisklasse',
};

const TEAM_TITLES = {
  'herren-30': 'Herren 30',
  'herren-40': 'Herren 40',
  'herren-60': 'Herren 60',
  'damen-6er': 'Damen',
  'gemischt-1': 'Gemischt 1',
  'gemischt-2': 'Gemischt 2',
  'mixed-u12': 'Mixed U12',
};

function detailFor(team) {
  return `${LEAGUE_LABELS[team] ?? 'Liga'}, Heimspiel`;
}

function titleFor(team, opponent) {
  return `${TEAM_TITLES[team] ?? team} vs. ${opponent}`;
}

function toDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`);
}

function sameOpponent(a, b) {
  return normalizeOpponent(a ?? '') === normalizeOpponent(b ?? '');
}

function findMedenspielIdx(events, team, opponent) {
  return events.findIndex(e =>
    e.category === 'medenspiel' &&
    e.team === team &&
    sameOpponent(e.opponent, opponent)
  );
}

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

export function applyTermineChanges(content, teamChanges) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) throw new Error('No frontmatter');
  const data = yaml.load(fmMatch[1]);
  const body = fmMatch[2];

  const events = data.events ?? [];

  for (const tc of teamChanges) {
    const findIdx = tc.kind === 'pokal'
      ? (evts, opp) => findPokalIdx(evts, tc.ligaGroup, opp)
      : (evts, opp) => findMedenspielIdx(evts, tc.team, opp);

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

  events.sort((a, b) => {
    const ad = a.date instanceof Date ? a.date : toDate(a.date);
    const bd = b.date instanceof Date ? b.date : toDate(b.date);
    return ad - bd;
  });

  data.events = events;

  const yamlOut = yaml.dump(data, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
  });

  return `---\n${yamlOut}---\n${body}`;
}
```

Note: existing `team` callers (medenspiel) pass `tc.team` only (no `kind`). The expression `tc.kind === 'pokal'` evaluates `false` for `kind: undefined`, so the existing medenspiel tests' team-changes (e.g. `{ team: 'herren-30', ... }` without `kind`) still take the medenspiel branch. **This is by design** — backwards-compatible default.

- [ ] **Step 4: Run all termineUpdater tests — must pass**

```bash
cd tools/nuliga-sync
npm test -- tests/termineUpdater.test.js
```

Expected: all 10 tests pass (6 existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add tools/nuliga-sync/src/termineUpdater.js tools/nuliga-sync/tests/termineUpdater.test.js
git commit -m "$(cat <<'EOF'
feat(nuliga-sync): termineUpdater handles pokal entries with kind branch

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: syncRunner.js — Pokal Branch + Helper

**Files:**
- Modify: `tools/nuliga-sync/src/syncRunner.js`
- Modify: `tools/nuliga-sync/tests/syncRunner.test.js`

- [ ] **Step 1: Write 2 failing test cases**

Append to `tools/nuliga-sync/tests/syncRunner.test.js`:

```js
test('pokal team: syncs without reading mannschaften MD', async () => {
  // Modify the live termine content to introduce a pokal time-diff vs liga.nu fixture
  const realTermine = readFileSync(join(REPO_ROOT, 'content/termine/_index.md'), 'utf8');
  const modifiedTermine = realTermine.replace(
    '  - title: "Herren-Pokal vs. TV Rönkhausen 1892"\n    date: 2026-05-05\n    time: "18:00 Uhr"',
    '  - title: "Herren-Pokal vs. TV Rönkhausen 1892"\n    date: 2026-05-05\n    time: "17:00 Uhr"',
  );

  // Track which paths were read; pokal teams must NOT trigger a mannschaften MD read.
  const pathsRead = [];
  const wrappedReader = async (path) => {
    pathsRead.push(path);
    if (path === 'content/termine/_index.md') return modifiedTermine;
    return readFileSync(join(REPO_ROOT, path), 'utf8');
  };

  const result = await runSync({
    fetchImpl: fetchFromFixtures(),
    readRepoFile: wrappedReader,
    today: new Date('2026-04-20T05:00:00Z'),
  });

  assert.equal(result.changed, true);
  // PR body shows the Herren-Pokal update (17:00 → 18:00)
  assert.match(result.prBody, /Herren-Pokal/);
  // fileChanges contains _index.md but NOT a pokal-specific mannschaft MD (none exists)
  const paths = result.fileChanges.map(f => f.path);
  assert.ok(paths.includes('content/termine/_index.md'));
  assert.ok(!paths.some(p => /pokal\.md$/.test(p)));
});

test('mixed run: medenspiel + pokal updates appear in same PR body', async () => {
  const modifiedHerren30 = readFileSync(join(REPO_ROOT, 'content/mannschaften/herren-30.md'), 'utf8')
    .replace('| 04.07.2026 | 14:30 |', '| 04.07.2026 | 13:00 |');
  const realTermine = readFileSync(join(REPO_ROOT, 'content/termine/_index.md'), 'utf8');
  const modifiedTermine = realTermine.replace(
    '  - title: "Herren 40-Pokal vs. TV Rosenthal 1899"\n    date: 2026-05-06\n    time: "18:00 Uhr"',
    '  - title: "Herren 40-Pokal vs. TV Rosenthal 1899"\n    date: 2026-05-06\n    time: "17:00 Uhr"',
  );

  const result = await runSync({
    fetchImpl: fetchFromFixtures(),
    readRepoFile: repoFileReader({
      'content/mannschaften/herren-30.md': modifiedHerren30,
      'content/termine/_index.md': modifiedTermine,
    }),
    today: new Date('2026-04-20T05:00:00Z'),
  });

  assert.equal(result.changed, true);
  // Both teams should appear in the same Geänderte-Spiele table
  assert.match(result.prBody, /Herren 30.*TuS Ferndorf/);
  assert.match(result.prBody, /Herren 40-Pokal.*TV Rosenthal/);
  assert.match(result.prTitle, /2 Updates/);
});
```

- [ ] **Step 2: Run tests — both new + the existing baseline test must currently fail**

```bash
cd tools/nuliga-sync
npm test -- tests/syncRunner.test.js 2>&1 | tail -30
```

Expected: failures because (a) the existing "no changes" test now hits `fetch` for groups 2229674/2229754 and gets fixture HTML, runs the parser, but Pokal teams aren't yet handled in syncRunner — so we'll get an error like "ENOENT" on a missing pokal MD path or a parsing/diff mismatch. Failures are expected and confirm the new code path is missing.

- [ ] **Step 3: Update `src/syncRunner.js`**

Replace the entire contents of `tools/nuliga-sync/src/syncRunner.js`:

```js
import yaml from 'js-yaml';
import { TEAMS, liganuUrl } from './teams.js';
import { parseGroupPage } from './parser.js';
import { readMannschaftMd } from './mdReader.js';
import { writeMannschaftMd } from './mdWriter.js';
import { diffMatches, isEmptyChangeSet } from './diff.js';
import { applyTermineChanges } from './termineUpdater.js';
import { renderPrBody } from './prBody.js';
import { normalizeOpponent } from './normalize.js';

const TERMINE_PATH = 'content/termine/_index.md';
const ATTENDORN_HOME_NAME = 'TC Blau-Weiß Attendorn 1';

function pad(n) {
  return String(n).padStart(2, '0');
}

function timestampBranchName(d = new Date()) {
  return `nuliga-sync/${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

function isoToday(d = new Date()) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function pokalExistingFromTermine(events, ligaGroup) {
  return events
    .filter(e => e.category === 'pokal' && e.liga_group === ligaGroup)
    .map(e => ({
      date: e.date instanceof Date
        ? e.date.toISOString().slice(0, 10)
        : String(e.date),
      time: String(e.time).replace(/\s*Uhr\s*$/, ''),
      home: ATTENDORN_HOME_NAME,
      guest: e.opponent,
    }));
}

function buildTermineUpdateEntries(tc, events) {
  const out = [];
  for (const u of tc.updates) {
    if (!u.isHome) continue;
    const match = events.find(e =>
      e.category === 'medenspiel' &&
      e.team === tc.team &&
      normalizeOpponent(e.opponent ?? '') === normalizeOpponent(u.opponent),
    );
    if (match) out.push({ title: match.title, date: u.newDate, newTime: u.newTime });
  }
  return out;
}

function decorateTeamChange(tc, team, events) {
  const updates = tc.updates.map(u => ({
    ...u,
    opponent: opponentFromMatch(u),
    isHome: u.home?.includes('Attendorn') ?? Boolean(u.isHome),
  }));
  const adds = tc.adds.map(a => ({
    ...a,
    opponent: opponentFromMatch(a),
    isHome: a.home?.includes('Attendorn') ?? Boolean(a.isHome),
    newDate: a.date,
    newTime: a.time,
  }));
  const missings = tc.missings.map(m => ({
    ...m,
    opponent: opponentFromMatch(m),
    isHome: m.home?.includes('Attendorn') ?? Boolean(m.isHome),
  }));
  // Termine cross-update only applies to medenspiel (pokal entries ARE the termine entry).
  const termineUpdates = team.kind === 'medenspiel'
    ? buildTermineUpdateEntries({ team: team.slug, updates }, events)
    : [];
  return {
    kind: team.kind,
    team: team.slug,
    teamLabel: team.label,
    ligaGroup: team.group,
    championship: team.championship,
    pokalDetail: team.pokalDetail,
    updates,
    adds,
    missings,
    termineUpdates,
  };
}

function opponentFromMatch(m) {
  if (m.opponent) return m.opponent;
  const isHome = m.home?.includes('Attendorn');
  return isHome ? m.guest : m.home;
}

export async function runSync({ fetchImpl, readRepoFile, today = new Date() }) {
  const teamReports = [];
  const errors = [];

  // Read termine MD once up-front; pokal teams need it to look up existing matches.
  const termineMd = await readRepoFile(TERMINE_PATH);
  const termineFmMatch = termineMd.match(/^---\n([\s\S]*?)\n---/);
  const termineEvents = termineFmMatch
    ? yaml.load(termineFmMatch[1]).events ?? []
    : [];

  for (const team of TEAMS) {
    try {
      const url = liganuUrl(team.group, team.championship ?? 'SW 2026');
      const res = await fetchImpl(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const liga = parseGroupPage(html);

      if (team.kind === 'pokal') {
        const ligaHome = liga.matches.filter(m => m.home.includes('Attendorn'));
        const existing = pokalExistingFromTermine(termineEvents, team.group);
        const cs = diffMatches(existing, ligaHome);
        teamReports.push({ team, cs, existingMatches: existing, ligaMatches: ligaHome });
      } else {
        const existingMd = await readRepoFile(team.file);
        const { matches: existing, frontmatter, body } = readMannschaftMd(existingMd);
        const cs = diffMatches(existing, liga.matches);
        teamReports.push({ team, cs, existingMd, frontmatter, body, existingMatches: existing, ligaMatches: liga.matches });
      }
    } catch (err) {
      errors.push({ team: team.slug, error: err.message });
    }
  }

  const decorated = teamReports.map(r => decorateTeamChange(r.cs, r.team, termineEvents));

  const hasChanges = decorated.some(d => d.updates.length || d.adds.length || d.missings.length);

  if (!hasChanges) {
    return { changed: false, errors, fileChanges: [], prBody: null };
  }

  const fileChanges = [];

  for (const report of teamReports) {
    if (isEmptyChangeSet(report.cs)) continue;
    if (report.team.kind === 'pokal') continue;  // pokal touches only _index.md

    const nextMatches = [...report.existingMatches];

    for (const u of report.cs.updates) {
      const identity = getIdentityLocal(u);
      const idx = nextMatches.findIndex(m => getIdentityLocal(m) === identity);
      if (idx !== -1) {
        nextMatches[idx] = { ...nextMatches[idx], date: u.newDate, time: u.newTime };
      }
    }
    for (const a of report.cs.adds) {
      nextMatches.push({ date: a.date, time: a.time, home: a.home, guest: a.guest, result: null });
    }

    const newMdContent = writeMannschaftMd({
      frontmatter: report.frontmatter,
      body: report.body,
      matches: nextMatches,
    });
    fileChanges.push({ path: report.team.file, content: newMdContent });
  }

  const newTermineMd = applyTermineChanges(termineMd, decorated);
  if (newTermineMd !== termineMd) {
    fileChanges.push({ path: TERMINE_PATH, content: newTermineMd });
  }

  const prBody = renderPrBody(isoToday(today), decorated);
  const branch = timestampBranchName(today);
  const commitMessage = `chore(termine): liga.nu sync ${isoToday(today)}`;
  const prTitle = `[nuliga] Sync ${isoToday(today)}: ${sumChanges(decorated)}`;

  return {
    changed: true,
    errors,
    fileChanges,
    branch,
    commitMessage,
    prTitle,
    prBody,
  };
}

function getIdentityLocal(m) {
  const isHome = m.home?.includes('Attendorn');
  const opponent = isHome ? m.guest : m.home;
  return `${normalizeOpponent(opponent ?? '')}|${isHome ? 'H' : 'A'}`;
}

function sumChanges(decorated) {
  const u = decorated.reduce((s, d) => s + d.updates.length, 0);
  const a = decorated.reduce((s, d) => s + d.adds.length, 0);
  const m = decorated.reduce((s, d) => s + d.missings.length, 0);
  return `${u} Updates, ${a} Adds, ${m} Missing`;
}
```

Key changes versus before:
- `termineMd` + `termineEvents` are read at the top (single read, used for both pokal-existing and decoration).
- Loop branches on `team.kind`. Pokal teams: filter parsed matches to home-only, build `existing` from termine events, run diff.
- `decorateTeamChange` now takes the full `team` object (not just slug+label) and exposes `kind`, `ligaGroup`, `championship`, `pokalDetail` to downstream consumers.
- `applyTermineChanges` is now called with the full `decorated` array (medenspiel + pokal). The medenspiel-specific shape `teamChangesForTermine` is gone — `applyTermineChanges` handles both kinds via the `kind` branch implemented in Task 3.
- File-changes loop skips pokal teams (no MD to write).

- [ ] **Step 4: Run all syncRunner tests**

```bash
cd tools/nuliga-sync
npm test -- tests/syncRunner.test.js
```

Expected: All tests pass — 3 existing (no-changes baseline, time change, branch name) + 2 new (pokal-only, mixed run).

- [ ] **Step 5: Run the full test suite**

```bash
cd tools/nuliga-sync
npm test
```

Expected: Every test file passes. Total tests should be the previous count + 6 (4 termineUpdater + 2 syncRunner) + the 6 from teams.test.js.

- [ ] **Step 6: Commit**

```bash
git add tools/nuliga-sync/src/syncRunner.js tools/nuliga-sync/tests/syncRunner.test.js
git commit -m "$(cat <<'EOF'
feat(nuliga-sync): syncRunner handles pokal teams via termine YAML

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: baseline.js — Pokal Support

**Files:**
- Modify: `tools/nuliga-sync/scripts/baseline.js`

The existing `baseline.js` reads `team.file` directly (which doesn't exist for pokal teams) and calls `liganuUrl(team.group)` without a championship. Both must be fixed so `npm run baseline` works against the live liga.nu.

- [ ] **Step 1: Update `scripts/baseline.js`**

Replace the contents of `tools/nuliga-sync/scripts/baseline.js`:

```js
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { TEAMS, liganuUrl } from '../src/teams.js';
import { parseGroupPage } from '../src/parser.js';
import { readMannschaftMd } from '../src/mdReader.js';
import { diffMatches, isEmptyChangeSet } from '../src/diff.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const ATTENDORN_HOME_NAME = 'TC Blau-Weiß Attendorn 1';

function pokalExistingFromTermine(termineMd, ligaGroup) {
  const fm = termineMd.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return [];
  const events = yaml.load(fm[1]).events ?? [];
  return events
    .filter(e => e.category === 'pokal' && e.liga_group === ligaGroup)
    .map(e => ({
      date: e.date instanceof Date
        ? e.date.toISOString().slice(0, 10)
        : String(e.date),
      time: String(e.time).replace(/\s*Uhr\s*$/, ''),
      home: ATTENDORN_HOME_NAME,
      guest: e.opponent,
    }));
}

const termineMd = readFileSync(join(REPO_ROOT, 'content/termine/_index.md'), 'utf8');
let totalChanges = 0;

for (const team of TEAMS) {
  process.stdout.write(`${team.label.padEnd(16)} ... `);
  try {
    const url = liganuUrl(team.group, team.championship ?? 'SW 2026');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const liga = parseGroupPage(html);

    let existing;
    let ligaMatches = liga.matches;
    if (team.kind === 'pokal') {
      ligaMatches = liga.matches.filter(m => m.home.includes('Attendorn'));
      existing = pokalExistingFromTermine(termineMd, team.group);
    } else {
      const md = readFileSync(join(REPO_ROOT, team.file), 'utf8');
      ({ matches: existing } = readMannschaftMd(md));
    }

    const cs = diffMatches(existing, ligaMatches);
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

```bash
cd tools/nuliga-sync
npm run baseline
```

Expected: All 9 teams report `OK (no changes)`. Exit code 0. Total: `Total changes detected: 0`.

If a team shows `CHANGES`: liga.nu has actual updates that occurred between Phase 1 fixture creation and now. Inspect the diff and decide:
- **liga.nu is right** → the existing repo state is stale; the *first* live cron run will produce a PR with these updates. That's expected behavior; do not fail the plan here.
- **Parser bug** → fix `parser.js` (out of plan scope; abort and ask).

For `CHANGES` due to genuine liga.nu updates, document the diff in your commit message but proceed.

- [ ] **Step 3: Commit**

```bash
git add tools/nuliga-sync/scripts/baseline.js
git commit -m "$(cat <<'EOF'
chore(nuliga-sync): baseline reads pokal existing matches from termine YAML

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Bundle + Deployment Doc

**Files:**
- Regenerate: `tools/nuliga-sync/dist/n8n-bundle.js`
- Modify: `doc/specs/2026-04-20-nuliga-sync-deployment.md`

- [ ] **Step 1: Regenerate the n8n bundle**

```bash
cd tools/nuliga-sync
npm run bundle
```

Expected: Output line confirming `dist/n8n-bundle.js` was written. The file should now contain the new pokal logic.

Smoke check: the bundle should reference the pokal teams.
```bash
grep -c 'WTV VP 2026' dist/n8n-bundle.js
```
Expected: ≥ 2 (one occurrence per pokal team championship literal).

- [ ] **Step 2: Add Pokal note to deployment doc**

Open `doc/specs/2026-04-20-nuliga-sync-deployment.md` and look for the section that describes what the workflow syncs (likely an early "Overview" or "Was wird gesynct?" section). Add this paragraph at the appropriate location (before any "Schritte"/"Activation" section):

```markdown
### WTV Pokal (seit 2026-05-04)

Zusätzlich zum Medenspiel-Spielplan synct der Workflow auch die WTV-Pokal-Heimspiele
(`championship=WTV VP 2026`). Pokal-Teams sind in `tools/nuliga-sync/src/teams.js` mit
`kind: 'pokal'` markiert, schreiben **nur** in `content/termine/_index.md` (kein
Mannschafts-MD) und tauchen im PR-Body unter den `teamLabel`-Einträgen `Herren-Pokal`
und `Herren 40-Pokal` auf. Spec: `doc/specs/2026-05-04-nuliga-sync-pokal.md`.
```

If you can't find a clear insertion point, add it as a new top-level section right before the closing of the document (or just before any "Open Points" section).

- [ ] **Step 3: Final full-test check**

```bash
cd tools/nuliga-sync
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Verify the bundle once more**

```bash
cd tools/nuliga-sync
node -e "import('./dist/n8n-bundle.js').then(m => console.log('bundle loads, exports:', Object.keys(m)))"
```

Expected: prints `bundle loads, exports: [ ... 'runSync' ... ]` (or similar — at minimum the bundle imports without errors).

- [ ] **Step 5: Commit**

```bash
git add tools/nuliga-sync/dist/n8n-bundle.js \
        doc/specs/2026-04-20-nuliga-sync-deployment.md
git commit -m "$(cat <<'EOF'
chore(nuliga-sync): regenerate bundle with pokal support, update deployment doc

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Done Criteria

- [ ] All 6 tasks committed.
- [ ] `npm test` reports all tests passing (existing 6 termineUpdater + 4 new = 10; 3 existing syncRunner + 2 new = 5; 6 new teams; plus parser/diff/normalize/mdReader/mdWriter/prBody unchanged).
- [ ] `npm run baseline` reports `Total changes detected: 0` (or only genuine liga.nu updates that should land in the first cron PR — in which case explicitly noted).
- [ ] `npm run bundle` produces a working `dist/n8n-bundle.js`.
- [ ] No changes to `parser.js`, `diff.js`, `prBody.js`, `mdReader.js`, `mdWriter.js`, `normalize.js`, or `doc/specs/n8n-nuliga-sync.json`.
- [ ] Deployment doc has a Pokal note.

After this plan is complete, the user activates the n8n workflow manually following the 8-step deployment checklist in the spec.
