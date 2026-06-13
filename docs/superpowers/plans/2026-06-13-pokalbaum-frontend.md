# Pokalbaum-Frontend + Pokal-Ergebnis-Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render both WTV-cup teams' paths as a vertical timeline on a new `/pokal/` page (fed by `data/pokal.yaml`), and make cup results — home *and* away — flow into the existing Feli social-media notification.

**Architecture:** `nuliga-sync` becomes the single source of truth: it scrapes all four cup group pages (Haupt + Neben per team), builds each team's path, writes `data/pokal.yaml`, and emits cup results into `newResults`. Hugo renders `/pokal/` statically from that data file. `content/termine/_index.md` keeps showing home announcements only.

**Tech Stack:** Node.js ESM (`node:test`/`node:assert`), cheerio + js-yaml (already deps), Hugo static templates, plain CSS.

**Spec:** `docs/superpowers/specs/2026-06-13-pokalbaum-frontend-design.md`

---

## Critical context for the implementer

- **Tests use Node's built-in runner**, not Jest: `npm test` → `node --test 'tests/**/*.test.js'`. Use `import { test } from 'node:test'` and `import assert from 'node:assert/strict'`. Mirror `tools/nuliga-sync/tests/diff.test.js` for style.
- **Never use `yaml.dump`** anywhere that runs inside the n8n Code node (`src/**`). The n8n 2.x runner sandbox makes `Error.name` read-only and `yaml.dump` crashes. `yaml.load` (reading) is fine and already used in `syncRunner.js`. New YAML *output* uses the narrow custom serializer in this plan.
- All `src/**` files are concatenated into `dist/n8n-bundle.js` by `npm run bundle`; the bundler strips `import`/`export`. So: keep modules import-only-from-siblings, no Node built-ins in `src/**` (built-ins are fine in `scripts/**`).
- Repo root paths in `fileChanges`/`data` are repo-relative (e.g. `data/pokal.yaml`).
- `liganuUrl(group, championship)` is exported from `src/teams.js`.
- Attendorn's liga.nu home string contains `"Attendorn"`; that substring test is the canonical "is this our match / is it home" check used throughout the codebase.

**Verified live data (2026-06-13), used as fixtures and for the initial `data/pokal.yaml`:**

- Herren LK 18–25, Hauptrunde group `2229674`: R1 05.05 H vs TV Rönkhausen 1892 e.V. TA 1 → 2:1 win; R2 19.05 H vs TC Letmathe 1 → 2:1 win; R3 09.06 **A** vs TV Rosenthal 1899 1 → 2:1 win; R4 23.06 H vs TuS Elch Holzwickede 1 → open. Nebenrunde `2236574`: no Attendorn games.
- Herren Ü40, Hauptrunde group `2229754`: R1 06.05 H vs TV Rosenthal 1899 1 → 1:2 loss. Nebenrunde `2236634`: 17.06 H vs TC GW Meinerzhagen 1 → open.

---

# PART A — Backend (nuliga-sync)

Work in `tools/nuliga-sync/`. Run all commands from that directory.

## Task A1: Restructure pokal teams into branch groups

**Files:**
- Modify: `tools/nuliga-sync/src/teams.js`
- Test: `tools/nuliga-sync/tests/teams.test.js`

- [ ] **Step 1: Read the current test** to see existing expectations.

Run: `sed -n '1,60p' tests/teams.test.js`

- [ ] **Step 2: Write the failing test** — replace the pokal-related assertions in `tests/teams.test.js` with:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEAMS, POKAL_TEAMS, liganuUrl } from '../src/teams.js';

test('TEAMS contains only the 7 medenspiel teams', () => {
  assert.equal(TEAMS.length, 7);
  assert.ok(TEAMS.every(t => t.kind === 'medenspiel'));
  assert.ok(TEAMS.every(t => typeof t.file === 'string'));
});

test('POKAL_TEAMS has both cup teams with haupt+neben branches', () => {
  assert.equal(POKAL_TEAMS.length, 2);
  for (const t of POKAL_TEAMS) {
    assert.equal(t.kind, 'pokal');
    assert.ok(t.branches.haupt, `${t.slug} missing haupt`);
    assert.ok(t.branches.neben, `${t.slug} missing neben`);
    assert.equal(t.championship, 'WTV VP 2026');
    assert.ok(t.label && t.detail);
  }
  const byid = Object.fromEntries(POKAL_TEAMS.map(t => [t.slug, t.branches]));
  assert.deepEqual(byid['herren-lk18-25'], { haupt: '2229674', neben: '2236574' });
  assert.deepEqual(byid['herren-40'], { haupt: '2229754', neben: '2236634' });
});

test('liganuUrl builds a WTV VP group url', () => {
  const url = liganuUrl('2229674', 'WTV VP 2026');
  assert.ok(url.includes('group=2229674'));
  assert.ok(url.includes('championship=WTV+VP+2026'));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/teams.test.js`
Expected: FAIL — `POKAL_TEAMS` is not exported.

- [ ] **Step 4: Edit `src/teams.js`** — remove the three pokal entries from `TEAMS` (keep the 7 medenspiel entries unchanged) and add a new export below the array. The file head becomes:

```js
export const TEAMS = [
  { kind: 'medenspiel', slug: 'damen-6er',  file: 'content/mannschaften/damen-6er.md',  group: '2',   label: 'Damen' },
  { kind: 'medenspiel', slug: 'herren-30',  file: 'content/mannschaften/herren-30.md',  group: '67',  label: 'Herren 30' },
  { kind: 'medenspiel', slug: 'herren-40',  file: 'content/mannschaften/herren-40.md',  group: '77',  label: 'Herren 40' },
  { kind: 'medenspiel', slug: 'herren-60',  file: 'content/mannschaften/herren-60.md',  group: '109', label: 'Herren 60' },
  { kind: 'medenspiel', slug: 'gemischt-1', file: 'content/mannschaften/gemischt-1.md', group: '120', label: 'Gemischt 1' },
  { kind: 'medenspiel', slug: 'gemischt-2', file: 'content/mannschaften/gemischt-2.md', group: '129', label: 'Gemischt 2' },
  { kind: 'medenspiel', slug: 'mixed-u12',  file: 'content/mannschaften/mixed-u12.md',  group: '205', label: 'Mixed U12' },
];

// Cup teams: each logical team plays a Hauptrunde (winner branch) and, after a
// Hauptrunde loss, a Nebenrunde (loser branch). Each branch is its own liga.nu group.
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

Leave the `BASE`, `encQuery`, and `liganuUrl` definitions below unchanged.

- [ ] **Step 5: Run tests**

Run: `node --test tests/teams.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/teams.js tests/teams.test.js
git commit -m "refactor(nuliga-sync): model cup teams as haupt+neben branch groups"
```

## Task A2: Cup path builder (`pokalPath.js`)

**Files:**
- Create: `tools/nuliga-sync/src/pokalPath.js`
- Test: `tools/nuliga-sync/tests/pokalPath.test.js`

- [ ] **Step 1: Write the failing test** `tests/pokalPath.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchOutcome, buildPokalPath } from '../src/pokalPath.js';

const H = (date, time, opp, result, home = true) => ({
  date, time,
  home: home ? 'TC Blau-Weiß Attendorn 1' : `${opp} 1`,
  guest: home ? `${opp} 1` : 'TC Blau-Weiß Attendorn 1',
  result,
});

test('matchOutcome: home win/loss/open', () => {
  assert.equal(matchOutcome(H('2026-05-05', '18:00', 'X', '2:1')), 'win');
  assert.equal(matchOutcome(H('2026-05-05', '18:00', 'X', '1:2')), 'loss');
  assert.equal(matchOutcome(H('2026-05-05', '18:00', 'X', null)), 'open');
});

test('matchOutcome: away result is read from Attendorn side', () => {
  // Attendorn is guest; liga.nu prints home:guest = "1:2" => Attendorn won
  assert.equal(matchOutcome(H('2026-06-09', '18:00', 'Rosenthal', '1:2', false)), 'win');
  assert.equal(matchOutcome(H('2026-06-09', '18:00', 'Rosenthal', '2:1', false)), 'loss');
});

test('buildPokalPath: winner branch only, chronological rounds', () => {
  const team = { slug: 'herren-lk18-25', label: 'L', detail: 'D', championship: 'WTV VP 2026', branches: { haupt: '2229674', neben: '2236574' } };
  const haupt = [
    H('2026-05-19', '18:00', 'TC Letmathe', '2:1'),
    H('2026-05-05', '18:00', 'TV Rönkhausen 1892 e.V. TA', '2:1'),
    H('2026-06-09', '18:00', 'TV Rosenthal 1899', '1:2', false),
    H('2026-06-23', '18:00', 'TuS Elch Holzwickede', null),
  ];
  const path = buildPokalPath(team, haupt, []);
  assert.deepEqual(path.rounds.map(r => [r.branch, r.round, r.outcome]), [
    ['haupt', 1, 'win'], ['haupt', 2, 'win'], ['haupt', 3, 'win'], ['haupt', 4, 'open'],
  ]);
  assert.equal(path.rounds[0].opponent, 'TV Rönkhausen 1892 TA'); // display-cleaned
  assert.equal(path.rounds[2].home, false);
  assert.ok(path.liga_url.includes('group=2229674')); // still in winner branch
});

test('buildPokalPath: appends neben branch only after a haupt loss', () => {
  const team = { slug: 'herren-40', label: 'L', detail: 'D', championship: 'WTV VP 2026', branches: { haupt: '2229754', neben: '2236634' } };
  const haupt = [H('2026-05-06', '18:00', 'TV Rosenthal 1899', '1:2')];
  const neben = [H('2026-06-17', '18:00', 'TC GW Meinerzhagen', null)];
  const path = buildPokalPath(team, haupt, neben);
  assert.deepEqual(path.rounds.map(r => [r.branch, r.round, r.outcome]), [
    ['haupt', 1, 'loss'], ['neben', 1, 'open'],
  ]);
  assert.ok(path.liga_url.includes('group=2236634')); // active group switched to neben
});

test('buildPokalPath: precautionary neben games are NOT appended without a loss', () => {
  const team = { slug: 'herren-lk18-25', label: 'L', detail: 'D', championship: 'WTV VP 2026', branches: { haupt: '2229674', neben: '2236574' } };
  const haupt = [H('2026-05-05', '18:00', 'X', '2:1')];
  const neben = [H('2026-05-05', '18:00', 'Y', '0:3')]; // stray, but we never lost
  const path = buildPokalPath(team, haupt, neben);
  assert.equal(path.rounds.length, 1);
  assert.equal(path.rounds[0].branch, 'haupt');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/pokalPath.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/pokalPath.js`:**

```js
import { liganuUrl } from './teams.js';

// "TV Rönkhausen 1892 e.V. TA 1" -> "TV Rönkhausen 1892 TA"
function displayName(raw) {
  return String(raw)
    .replace(/\s+e\.V\.?/gi, '')
    .replace(/\s+1$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchOutcome(match) {
  if (!match.result) return 'open';
  const m = match.result.match(/(\d+):(\d+)/);
  if (!m) return 'open';
  const homeScore = Number(m[1]);
  const guestScore = Number(m[2]);
  const isHome = match.home.includes('Attendorn');
  const ours = isHome ? homeScore : guestScore;
  const theirs = isHome ? guestScore : homeScore;
  if (ours > theirs) return 'win';
  if (ours < theirs) return 'loss';
  return 'open'; // no draws in a cup; defensive
}

function attendornMatches(matches) {
  return matches
    .filter(m => m.home.includes('Attendorn') || m.guest.includes('Attendorn'))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function toRound(m, branch, round) {
  const isHome = m.home.includes('Attendorn');
  const opponent = isHome ? m.guest : m.home;
  return {
    branch,
    round,
    date: m.date,
    time: m.time,
    home: isHome,
    opponent: displayName(opponent),
    result: m.result ?? null,
    outcome: matchOutcome(m),
  };
}

/**
 * Build one cup team's path. hauptRaw/nebenRaw are the *full* parsed match lists
 * of each branch group (Attendorn filtering happens here).
 */
export function buildPokalPath(team, hauptRaw, nebenRaw) {
  const haupt = attendornMatches(hauptRaw);
  const neben = attendornMatches(nebenRaw);

  const rounds = haupt.map((m, i) => toRound(m, 'haupt', i + 1));
  const lostHaupt = rounds.some(r => r.outcome === 'loss');
  if (lostHaupt && neben.length) {
    neben.forEach((m, i) => rounds.push(toRound(m, 'neben', i + 1)));
  }

  const activeGroup = (lostHaupt && neben.length) ? team.branches.neben : team.branches.haupt;
  return {
    slug: team.slug,
    label: team.label,
    detail: team.detail,
    liga_url: liganuUrl(activeGroup, team.championship),
    rounds,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/pokalPath.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pokalPath.js tests/pokalPath.test.js
git commit -m "feat(nuliga-sync): add cup path builder with win/loss/open outcomes"
```

## Task A3: Pokal data file serializer + result diff (`pokalData.js`)

**Files:**
- Create: `tools/nuliga-sync/src/pokalData.js`
- Test: `tools/nuliga-sync/tests/pokalData.test.js`

- [ ] **Step 1: Write the failing test** `tests/pokalData.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { renderPokalYaml, parsePokalYaml, collectNewResults } from '../src/pokalData.js';

const path = (slug, rounds) => ({ slug, label: 'L', detail: 'D', liga_url: 'http://x?group=1', rounds });
const round = (branch, round, opponent, result, outcome, home = true) =>
  ({ branch, round, date: '2026-05-05', time: '18:00', home, opponent, result, outcome });

test('renderPokalYaml round-trips through a YAML parser', () => {
  const paths = [path('herren-40', [round('haupt', 1, 'TV Rosenthal', '1:2', 'loss')])];
  const txt = renderPokalYaml(paths);
  const loaded = yaml.load(txt);
  assert.equal(loaded.teams.length, 1);
  assert.equal(loaded.teams[0].slug, 'herren-40');
  assert.equal(loaded.teams[0].rounds[0].opponent, 'TV Rosenthal');
  assert.equal(loaded.teams[0].rounds[0].result, '1:2');
  assert.equal(loaded.teams[0].rounds[0].home, true);
});

test('renderPokalYaml writes open results as null (~)', () => {
  const txt = renderPokalYaml([path('x', [round('haupt', 1, 'Y', null, 'open')])]);
  assert.equal(yaml.load(txt).teams[0].rounds[0].result, null);
});

test('parsePokalYaml returns [] for empty/missing content', () => {
  assert.deepEqual(parsePokalYaml(''), []);
  assert.deepEqual(parsePokalYaml('teams:\n'), []);
});

test('collectNewResults: open->scored produces a result event', () => {
  const oldPaths = [path('herren-40', [round('haupt', 1, 'TV Rosenthal', null, 'open')])];
  const newPaths = [path('herren-40', [round('haupt', 1, 'TV Rosenthal', '1:2', 'loss')])];
  const events = collectNewResults(oldPaths, newPaths, { 'herren-40': 'Herren-40-Pokal' });
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    team: 'Herren-40-Pokal', opponent: 'TV Rosenthal',
    date: '05.05.2026', time: '18:00', result: '1:2', isHome: true,
  });
});

test('collectNewResults: away result is captured', () => {
  const oldPaths = [path('lk', [round('haupt', 3, 'TV Rosenthal', null, 'open', false)])];
  const newPaths = [path('lk', [round('haupt', 3, 'TV Rosenthal', '1:2', 'win', false)])];
  const events = collectNewResults(oldPaths, newPaths, { lk: 'Herren-Pokal' });
  assert.equal(events.length, 1);
  assert.equal(events[0].isHome, false);
  assert.equal(events[0].result, '1:2');
});

test('collectNewResults: unchanged result produces nothing', () => {
  const same = [path('x', [round('haupt', 1, 'Y', '2:1', 'win')])];
  assert.deepEqual(collectNewResults(same, same, { x: 'X' }), []);
});

test('collectNewResults: a brand-new round that already has a result counts', () => {
  const oldPaths = [path('x', [round('haupt', 1, 'A', '2:1', 'win')])];
  const newPaths = [path('x', [
    round('haupt', 1, 'A', '2:1', 'win'),
    round('haupt', 2, 'B', '3:0', 'win'),
  ])];
  const events = collectNewResults(oldPaths, newPaths, { x: 'X' });
  assert.equal(events.length, 1);
  assert.equal(events[0].opponent, 'B');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/pokalData.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/pokalData.js`:**

```js
import yaml from 'js-yaml';

function q(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Narrow serializer for the data/pokal.yaml shape. Avoids yaml.dump (crashes in
// the n8n runner sandbox — see termineUpdater.js for the same reason).
export function renderPokalYaml(paths) {
  const lines = ['teams:'];
  for (const t of paths) {
    lines.push(`  - slug: ${q(t.slug)}`);
    lines.push(`    label: ${q(t.label)}`);
    lines.push(`    detail: ${q(t.detail)}`);
    lines.push(`    liga_url: ${q(t.liga_url)}`);
    lines.push('    rounds:');
    for (const r of t.rounds) {
      lines.push(`      - branch: ${r.branch}`);
      lines.push(`        round: ${r.round}`);
      lines.push(`        date: ${r.date}`);
      lines.push(`        time: ${q(r.time)}`);
      lines.push(`        home: ${r.home}`);
      lines.push(`        opponent: ${q(r.opponent)}`);
      lines.push(`        result: ${r.result == null ? '~' : q(r.result)}`);
      lines.push(`        outcome: ${r.outcome}`);
    }
  }
  return lines.join('\n') + '\n';
}

export function parsePokalYaml(text) {
  if (!text || !text.trim()) return [];
  const data = yaml.load(text);
  return (data && data.teams) ? data.teams : [];
}

function isoToGerman(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Emit a result event for every round in newPaths that has a score which was
 * absent before (open->scored, or a brand-new already-scored round).
 * labelBySlug maps a team slug to its display label.
 */
export function collectNewResults(oldPaths, newPaths, labelBySlug) {
  const oldByKey = new Map();
  for (const t of oldPaths) {
    for (const r of t.rounds ?? []) {
      oldByKey.set(`${t.slug}|${r.branch}|${r.round}`, r.result ?? null);
    }
  }
  const events = [];
  for (const t of newPaths) {
    for (const r of t.rounds ?? []) {
      if (r.result == null) continue;
      const prev = oldByKey.get(`${t.slug}|${r.branch}|${r.round}`);
      if (prev == null || prev !== r.result) {
        events.push({
          team: labelBySlug[t.slug] ?? t.label,
          opponent: r.opponent,
          date: isoToGerman(r.date),
          time: r.time,
          result: r.result,
          isHome: r.home,
        });
      }
    }
  }
  return events;
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/pokalData.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pokalData.js tests/pokalData.test.js
git commit -m "feat(nuliga-sync): add pokal.yaml serializer and new-result diff"
```

## Task A4: Wire cup teams into `runSync`

**Files:**
- Modify: `tools/nuliga-sync/src/syncRunner.js`
- Test: `tools/nuliga-sync/tests/syncRunner.test.js`

This replaces the old per-group pokal branch. New behaviour:
1. Medenspiel loop unchanged (now iterates only the 7 medenspiel `TEAMS`).
2. For each `POKAL_TEAM`: fetch both branch groups; build the path; collect home matches per branch for the *Termine* announcements (result-only updates dropped from the Termine file, but the match still feeds the path/results).
3. `data/pokal.yaml` is (re)written when its content changes.
4. Cup results (home + away) flow into `newResults` via `collectNewResults`.

- [ ] **Step 1: Write the failing test** — append to `tests/syncRunner.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runSync } from '../src/syncRunner.js';

// Live fixtures captured 2026-06-13. Add these four files under tests/fixtures/:
//   pokal-lk1825-haupt.html  (group 2229674)
//   pokal-lk1825-neben.html  (group 2236574)
//   pokal-h40-haupt.html     (group 2229754)
//   pokal-h40-neben.html     (group 2236634)
const FIX = new URL('./fixtures/', import.meta.url);
const fx = (name) => readFileSync(new URL(name, FIX), 'utf8');

const GROUP_FIXTURE = {
  '2229674': 'pokal-lk1825-haupt.html',
  '2236574': 'pokal-lk1825-neben.html',
  '2229754': 'pokal-h40-haupt.html',
  '2236634': 'pokal-h40-neben.html',
};

// Termine with the two already-known LK18-25 home announcements, no results.
const TERMINE_MD = `---
title: "Termine"
events:
  - title: "Herren-Pokal vs. TV Rönkhausen 1892"
    date: 2026-05-05
    time: "18:00 Uhr"
    detail: "WTV Vereinspokal · Herren LK 18,0–25,0, Heimspiel"
    category: "pokal"
    opponent: "TV Rönkhausen 1892 TA"
    liga_championship: "WTV VP 2026"
    liga_group: "2229674"
---
Body text.
`;

function makeFetch() {
  return async (url) => {
    const group = new URL(url).searchParams.get('group');
    const file = GROUP_FIXTURE[group];
    // Medenspiel groups: return an empty-but-valid schedule page is hard; instead
    // this test only exercises pokal by stubbing medenspiel fetches to throw,
    // which runSync records as errors (acceptable for this assertion).
    if (!file) return { ok: false, status: 404 };
    return { ok: true, text: async () => fx(file) };
  };
}

test('cup results (home AND away) reach newResults; data/pokal.yaml is written', async () => {
  const repo = {
    'content/termine/_index.md': TERMINE_MD,
    'data/pokal.yaml': '', // no prior snapshot => every score is "new"
  };
  const readRepoFile = async (p) => {
    if (p in repo) return repo[p];
    throw new Error(`404 ${p}`);
  };
  const out = await runSync({ fetchImpl: makeFetch(), readRepoFile });

  assert.equal(out.changed, true);
  const pokalFile = out.fileChanges.find(f => f.path === 'data/pokal.yaml');
  assert.ok(pokalFile, 'data/pokal.yaml not in fileChanges');
  assert.ok(pokalFile.content.includes('Herren-40-Pokal') || pokalFile.content.includes('herren-40'));

  // away win vs Rosenthal must be among the new results
  const away = out.newResults.find(r => r.isHome === false && r.result === '1:2');
  assert.ok(away, 'away cup result missing from newResults');

  // Termine gains only UPCOMING HOME announcements: the open home game vs
  // Holzwickede (LK18-25 R4) and vs Meinerzhagen (H40 Nebenrunde). It must NOT
  // contain Rosenthal — that name appears only as an LK18-25 *away* game and as
  // an *already-played* H40 home game, both excluded from announcements.
  const termineFile = out.fileChanges.find(f => f.path === 'content/termine/_index.md');
  assert.ok(termineFile, 'termine file should change (new upcoming home games)');
  assert.ok(termineFile.content.includes('Holzwickede'), 'upcoming home game missing from termine');
  assert.ok(!termineFile.content.includes('Rosenthal'), 'away/played game leaked into termine');
});
```

- [ ] **Step 2: Capture the four fixtures.** Run from `tools/nuliga-sync/`:

```bash
for g in 2229674 2236574 2229754 2236634; do
  case $g in
    2229674) f=pokal-lk1825-haupt;; 2236574) f=pokal-lk1825-neben;;
    2229754) f=pokal-h40-haupt;;   2236634) f=pokal-h40-neben;;
  esac
  curl -s "https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage?championship=WTV+VP+2026&group=$g" -o "tests/fixtures/$f.html"
done
ls -la tests/fixtures/pokal-*.html
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/syncRunner.test.js`
Expected: FAIL — current `runSync` neither writes `data/pokal.yaml` nor emits cup results.

- [ ] **Step 4: Replace `src/syncRunner.js`** with the version below (full file — the pokal handling is substantially rewritten; medenspiel paths are byte-for-byte as before):

```js
import yaml from 'js-yaml';
import { TEAMS, POKAL_TEAMS, liganuUrl } from './teams.js';
import { parseGroupPage } from './parser.js';
import { readMannschaftMd } from './mdReader.js';
import { writeMannschaftMd } from './mdWriter.js';
import { diffMatches, isEmptyChangeSet } from './diff.js';
import { applyTermineChanges } from './termineUpdater.js';
import { renderPrBody } from './prBody.js';
import { normalizeOpponent } from './normalize.js';
import { buildPokalPath } from './pokalPath.js';
import { renderPokalYaml, parsePokalYaml, collectNewResults } from './pokalData.js';

const TERMINE_PATH = 'content/termine/_index.md';
const POKAL_DATA_PATH = 'data/pokal.yaml';

function pad(n) {
  return String(n).padStart(2, '0');
}

function timestampBranchName(d = new Date()) {
  return `nuliga-sync/${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

function isoToday(d = new Date()) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function isDateLike(v) {
  return v != null && typeof v.toISOString === 'function';
}

function pokalExistingFromTermine(events, ligaGroup) {
  return events
    .filter(e => e.category === 'pokal' && e.liga_group === ligaGroup)
    .map(e => ({
      date: isDateLike(e.date) ? e.date.toISOString().slice(0, 10) : String(e.date),
      time: String(e.time).replace(/\s*Uhr\s*$/, ''),
      home: 'TC Blau-Weiß Attendorn 1',
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

async function readRepoFileSafe(readRepoFile, path) {
  try {
    return await readRepoFile(path);
  } catch {
    return '';
  }
}

export async function runSync({ fetchImpl, readRepoFile, today = new Date() }) {
  const teamReports = [];
  const errors = [];

  const termineMd = await readRepoFile(TERMINE_PATH);
  const termineFmMatch = termineMd.match(/^---\n([\s\S]*?)\n---/);
  const termineEvents = termineFmMatch
    ? yaml.load(termineFmMatch[1]).events ?? []
    : [];

  // --- Medenspiel teams (one group each) ---
  for (const team of TEAMS) {
    try {
      const url = liganuUrl(team.group, team.championship ?? 'SW 2026');
      const res = await fetchImpl(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const liga = parseGroupPage(await res.text());

      const existingMd = await readRepoFile(team.file);
      const { matches: existing, frontmatter, body } = readMannschaftMd(existingMd);
      const cs = diffMatches(existing, liga.matches);
      teamReports.push({ team, cs, existingMd, frontmatter, body, existingMatches: existing, ligaMatches: liga.matches });
    } catch (err) {
      errors.push({ team: team.slug, error: err.message });
    }
  }

  // --- Cup teams (haupt + neben group each) ---
  const pokalPaths = [];
  const labelBySlug = {};
  for (const pt of POKAL_TEAMS) {
    try {
      const branchMatches = {};
      for (const [branchName, groupId] of Object.entries(pt.branches)) {
        const res = await fetchImpl(liganuUrl(groupId, pt.championship));
        if (!res.ok) throw new Error(`HTTP ${res.status} (${branchName})`);
        branchMatches[branchName] = parseGroupPage(await res.text()).matches;

        // Termine home announcements for this branch: only UPCOMING (unplayed)
        // home games. A played home game (has a result) belongs to the bracket,
        // not the announcements list. Termine has no result field anyway.
        const home = branchMatches[branchName].filter(m => m.home.includes('Attendorn') && !m.result);
        if (home.length) {
          const existing = pokalExistingFromTermine(termineEvents, groupId);
          const cs = diffMatches(existing, home);
          cs.updates = cs.updates.filter(u => u.oldDate !== u.newDate || u.oldTime !== u.newTime);
          cs.missings = []; // played games drop out of `home`; don't churn termine — display filters past dates
          const termineTeam = {
            kind: 'pokal',
            slug: `${pt.slug}-${branchName}`,
            label: pt.label,
            group: groupId,
            championship: pt.championship,
            pokalDetail: pt.detail,
          };
          teamReports.push({ team: termineTeam, cs, existingMatches: existing, ligaMatches: home });
        }
      }

      pokalPaths.push(buildPokalPath(pt, branchMatches.haupt ?? [], branchMatches.neben ?? []));
      labelBySlug[pt.slug] = pt.label;
    } catch (err) {
      errors.push({ team: pt.slug, error: err.message });
    }
  }

  const decorated = teamReports.map(r => decorateTeamChange(r.cs, r.team, termineEvents));
  const termineHasChanges = decorated.some(d => d.updates.length || d.adds.length || d.missings.length);

  // data/pokal.yaml diff + new cup results
  const oldPokalRaw = await readRepoFileSafe(readRepoFile, POKAL_DATA_PATH);
  const newPokalRaw = pokalPaths.length ? renderPokalYaml(pokalPaths) : oldPokalRaw;
  const pokalChanged = pokalPaths.length > 0 && newPokalRaw !== oldPokalRaw;
  const pokalNewResults = pokalPaths.length
    ? collectNewResults(parsePokalYaml(oldPokalRaw), pokalPaths, labelBySlug)
    : [];

  const hasChanges = termineHasChanges || pokalChanged;
  if (!hasChanges) {
    return { changed: false, errors, fileChanges: [], prBody: null, newResults: pokalNewResults };
  }

  const fileChanges = [];

  for (const report of teamReports) {
    if (isEmptyChangeSet(report.cs)) continue;
    if (report.team.kind === 'pokal') continue; // pokal touches only termine + data/pokal.yaml

    const nextMatches = [...report.existingMatches];
    for (const u of report.cs.updates) {
      const identity = getIdentityLocal(u);
      const idx = nextMatches.findIndex(m => getIdentityLocal(m) === identity);
      if (idx !== -1) {
        nextMatches[idx] = { ...nextMatches[idx], date: u.newDate, time: u.newTime, result: u.newResult ?? nextMatches[idx].result };
      }
    }
    for (const a of report.cs.adds) {
      nextMatches.push({ date: a.date, time: a.time, home: a.home, guest: a.guest, result: a.result ?? null });
    }

    const newMdContent = writeMannschaftMd({ frontmatter: report.frontmatter, body: report.body, matches: nextMatches });
    fileChanges.push({ path: report.team.file, content: newMdContent });
  }

  const newTermineMd = applyTermineChanges(termineMd, decorated);
  if (newTermineMd !== termineMd) {
    fileChanges.push({ path: TERMINE_PATH, content: newTermineMd });
  }

  if (pokalChanged) {
    fileChanges.push({ path: POKAL_DATA_PATH, content: newPokalRaw });
  }

  const prBody = renderPrBody(isoToday(today), decorated);
  const branch = timestampBranchName(today);
  const commitMessage = `chore(termine): liga.nu sync ${isoToday(today)}`;
  const prTitle = `[nuliga] Sync ${isoToday(today)}: ${sumChanges(decorated)}`;
  const newResults = [...extractNewResults(decorated), ...pokalNewResults];

  return { changed: true, errors, fileChanges, branch, commitMessage, prTitle, prBody, newResults };
}

function extractNewResults(decorated) {
  const items = [];
  for (const d of decorated) {
    for (const u of d.updates) {
      if (!u.oldResult && u.newResult) {
        items.push({ team: d.teamLabel, opponent: u.opponent, date: u.newDate ?? u.date, time: u.newTime ?? u.time, result: u.newResult, isHome: u.isHome });
      }
    }
    for (const a of d.adds) {
      if (a.result) {
        items.push({ team: d.teamLabel, opponent: a.opponent, date: a.newDate ?? a.date, time: a.newTime ?? a.time, result: a.result, isHome: a.isHome });
      }
    }
  }
  return items;
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

> Note on `extractNewResults` for medenspiel: cup results deliberately bypass it (cup updates never enter `decorated` as result-only rows because the termine branch drops them). Cup results come solely from `pokalNewResults`, so there is no double counting.

- [ ] **Step 5: Run the full suite**

Run: `node --test 'tests/**/*.test.js'`
Expected: PASS — including the new syncRunner cup test and all pre-existing tests.

- [ ] **Step 6: Commit**

```bash
git add src/syncRunner.js tests/syncRunner.test.js tests/fixtures/pokal-*.html
git commit -m "feat(nuliga-sync): sync cup paths to data/pokal.yaml + forward results"
```

## Task A5: Generate the initial `data/pokal.yaml` snapshot

**Files:**
- Create: `tools/nuliga-sync/scripts/pokal-snapshot.js`
- Create: `data/pokal.yaml` (generated output, repo root)

- [ ] **Step 1: Create `scripts/pokal-snapshot.js`:**

```js
#!/usr/bin/env node
// Fetches live cup pages and (re)writes data/pokal.yaml. Dev/seed convenience;
// the production path is the n8n sync. Run: node scripts/pokal-snapshot.js
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { POKAL_TEAMS, liganuUrl } from '../src/teams.js';
import { parseGroupPage } from '../src/parser.js';
import { buildPokalPath } from '../src/pokalPath.js';
import { renderPokalYaml } from '../src/pokalData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');

const paths = [];
for (const pt of POKAL_TEAMS) {
  const branchMatches = {};
  for (const [branch, group] of Object.entries(pt.branches)) {
    const res = await fetch(liganuUrl(group, pt.championship));
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${pt.slug}/${branch}`);
    branchMatches[branch] = parseGroupPage(await res.text()).matches;
  }
  paths.push(buildPokalPath(pt, branchMatches.haupt ?? [], branchMatches.neben ?? []));
}

const out = join(REPO_ROOT, 'data/pokal.yaml');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, renderPokalYaml(paths));
console.log(`Wrote ${out}\n`);
console.log(renderPokalYaml(paths));
```

- [ ] **Step 2: Run it**

Run: `node scripts/pokal-snapshot.js`
Expected: prints YAML; `data/pokal.yaml` now exists at repo root with both teams (LK18-25: 4 haupt rounds, last one open; Herren-40: 1 haupt loss + 1 neben open).

- [ ] **Step 3: Sanity-check the output**

Run: `sed -n '1,40p' ../../data/pokal.yaml`
Expected: `teams:` with `slug: "herren-lk18-25"` and `slug: "herren-40"`, `outcome:` values matching the verified data.

- [ ] **Step 4: Commit**

```bash
git add scripts/pokal-snapshot.js ../../data/pokal.yaml
git commit -m "feat(nuliga-sync): add pokal snapshot script + seed data/pokal.yaml"
```

## Task A6: Add new modules to the n8n bundle

**Files:**
- Modify: `tools/nuliga-sync/scripts/bundle.js`

- [ ] **Step 1: Edit the `FILES` array** in `scripts/bundle.js` so `pokalPath.js` and `pokalData.js` are included. The new array (order matters — dependencies first; `pokalPath.js` imports from `teams.js`, `pokalData.js` imports `js-yaml`):

```js
const FILES = [
  'normalize.js',
  'parser.js',
  'mdReader.js',
  'mdWriter.js',
  'diff.js',
  'termineUpdater.js',
  'prBody.js',
  'teams.js',
  'pokalPath.js',
  'pokalData.js',
  'syncRunner.js',
];
```

- [ ] **Step 2: Rebuild the bundle**

Run: `npm run bundle`
Expected: `Wrote .../dist/n8n-bundle.js (NNNN bytes)` with no error.

- [ ] **Step 3: Verify the bundle references the new code**

Run: `grep -c "buildPokalPath\|renderPokalYaml" dist/n8n-bundle.js`
Expected: a number ≥ 3 (definitions + call sites).

- [ ] **Step 4: Baseline check.** `baseline.js` iterates `TEAMS`, which now holds only the 7 medenspiel teams — no code change needed there, and the removed pokal entries simply no longer appear.

Run: `npm run baseline`
Expected: each medenspiel team prints `OK (no changes)` (or a known pending diff); the script does not crash. The cup "baseline" is the snapshot script: re-running `node scripts/pokal-snapshot.js` and then `git diff --quiet ../../data/pokal.yaml` must show no diff (data matches liga.nu).

- [ ] **Step 5: Commit**

```bash
git add scripts/bundle.js dist/n8n-bundle.js
git commit -m "chore(nuliga-sync): bundle pokal modules for n8n"
```

---

# PART B — Frontend (Hugo)

Work from the repo root.

## Task B1: Create the `/pokal/` content page

**Files:**
- Create: `content/pokal/_index.md`

- [ ] **Step 1: Create `content/pokal/_index.md`:**

```markdown
---
title: "Pokal"
description: "Der Weg unserer Teams durch den WTV Vereinspokal 2026."
---

Unsere beiden Pokalteams im WTV Vereinspokal 2026 — Runde für Runde.
```

- [ ] **Step 2: Commit**

```bash
git add content/pokal/_index.md
git commit -m "feat(pokal): add /pokal/ content page"
```

## Task B2: Pokalbaum partial + section layout

**Files:**
- Create: `layouts/partials/pokalbaum.html`
- Create: `layouts/pokal/list.html`

- [ ] **Step 1: Create `layouts/partials/pokalbaum.html`** (renders one team; receives the team map as `.`). Note: inside `range $r := $rounds` we bind each round to `$r` and reference fields as `$r.outcome` etc. — this avoids any dot-rebinding confusion with `with`:

```go-html-template
{{- $months := slice "" "Jan." "Feb." "März" "Apr." "Mai" "Juni" "Juli" "Aug." "Sep." "Okt." "Nov." "Dez." -}}
<div class="pokal-team">
  <h3 class="pokal-team-name">{{ .label }}</h3>
  <p class="pokal-team-detail">{{ .detail }}</p>

  {{- $branches := slice "haupt" "neben" -}}
  {{- $branchTitles := dict "haupt" "Hauptrunde" "neben" "Nebenrunde" -}}
  {{- range $branch := $branches -}}
    {{- $rounds := where $.rounds "branch" $branch -}}
    {{- if $rounds -}}
      {{- if eq $branch "neben" }}<div class="pokal-fork">↳ ausgeschieden — weiter in der Nebenrunde</div>{{ end -}}
      <p class="pokal-stage">{{ index $branchTitles $branch }}</p>
      <div class="pokal-timeline">
        {{- range $r := $rounds -}}
        {{- $d := time $r.date -}}
        <div class="pokal-round pokal-{{ $r.outcome }}">
          <div class="pokal-round-head">
            <span class="pokal-round-no">Runde {{ $r.round }}</span>
            <span class="pokal-badge">{{ if $r.home }}Heim{{ else }}Auswärts{{ end }}</span>
          </div>
          <p class="pokal-round-date">{{ $d.Day }}. {{ index $months (int $d.Month) }} {{ $d.Year }}</p>
          <p class="pokal-round-opp">{{ $r.opponent }}</p>
          {{- if $r.result }}
          <p class="pokal-round-score">{{ $r.result }}{{ if eq $r.outcome "win" }} · gewonnen{{ else if eq $r.outcome "loss" }} · verloren{{ end }}</p>
          {{- else }}
          <p class="pokal-round-score pokal-open">noch offen</p>
          {{- end }}
        </div>
        {{- end -}}
      </div>
    {{- end -}}
  {{- end -}}

  {{- with .liga_url }}
  <a href="{{ . }}" target="_blank" rel="noopener" class="btn btn-primary" style="background: var(--blue-600); color: var(--white); margin-top: 16px;">
    Ergebnisse &amp; Tabelle auf liga.nu &#8599;
  </a>
  {{- end }}
</div>
```

- [ ] **Step 2: Create `layouts/pokal/list.html`:**

```go-html-template
{{ define "main" }}
<section class="section" style="padding-top: 120px;">
  <div class="container" style="max-width: 820px;">
    <div class="section-header">
      <p class="label-upper section-eyebrow">Pokal</p>
      <h2 class="heading-display section-title">{{ .Title }}</h2>
      <p class="section-subtitle">{{ .Description }}</p>
    </div>

    {{ with site.Data.pokal }}
      {{ range .teams }}
        {{ partial "pokalbaum.html" . }}
      {{ end }}
    {{ else }}
      <p>Aktuell keine Pokaldaten verfügbar.</p>
    {{ end }}
  </div>
</section>
{{ end }}
```

- [ ] **Step 3: Build to verify templates compile**

Run: `hugo --gc --quiet && echo BUILD_OK`
Expected: `BUILD_OK`, no template errors. Confirm the page exists:
Run: `test -f public/pokal/index.html && echo PAGE_OK`
Expected: `PAGE_OK`.

- [ ] **Step 4: Eyeball the rendered content**

Run: `grep -o "Herren-Pokal LK 18–25\|Herren-40-Pokal\|gewonnen\|noch offen\|Nebenrunde" public/pokal/index.html | sort | uniq -c`
Expected: both team names present, at least one `gewonnen`, at least one `noch offen`, and `Nebenrunde` once (Herren-40).

- [ ] **Step 5: Commit**

```bash
git add layouts/partials/pokalbaum.html layouts/pokal/list.html
git commit -m "feat(pokal): render cup paths as vertical timeline"
```

## Task B3: Pokalbaum styles

**Files:**
- Modify: `static/css/main.css`

- [ ] **Step 1: Append to `static/css/main.css`** (reuses existing tokens `--blue-600`, `--white`, `--radius-lg`, grays; defines local colors for win/loss/open):

```css
/* ── Pokalbaum ───────────────────────────────────────────── */
.pokal-team { margin: 0 0 56px; }
.pokal-team-name { font-size: 1.5rem; font-weight: 700; color: var(--gray-900, #111827); margin: 0 0 4px; }
.pokal-team-detail { color: var(--gray-600, #4b5563); margin: 0 0 20px; }
.pokal-stage {
  font-size: 0.75rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--blue-600, #1d4ed8); margin: 18px 0 10px;
}
.pokal-fork { color: #dc2626; font-weight: 700; font-size: 0.85rem; margin: 6px 0 6px 8px; }
.pokal-timeline { display: flex; flex-direction: column; gap: 12px; }
.pokal-round {
  border: 1px solid #e5e7eb; border-left-width: 5px; border-radius: var(--radius-lg, 12px);
  padding: 14px 16px; background: var(--white, #fff); box-shadow: 0 1px 3px rgba(0,0,0,.06);
}
.pokal-round-head { display: flex; align-items: center; justify-content: space-between; }
.pokal-round-no { font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 700; color: #6b7280; }
.pokal-badge { font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #eef2ff; color: #3949ab; }
.pokal-round-date { font-size: 0.8rem; color: #6b7280; margin: 4px 0 2px; }
.pokal-round-opp { font-weight: 600; color: #1f2937; font-size: 1.05rem; margin: 0; }
.pokal-round-score { margin: 8px 0 0; font-size: 1.15rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.pokal-win  { border-left-color: #16a34a; } .pokal-win  .pokal-round-score { color: #16a34a; }
.pokal-loss { border-left-color: #dc2626; } .pokal-loss .pokal-round-score { color: #dc2626; }
.pokal-open { border-left-color: #94a3b8; }
.pokal-round.pokal-open { background: #f8fafc; }
.pokal-round-score.pokal-open { color: #64748b; font-weight: 600; font-size: 0.95rem; }
```

- [ ] **Step 2: Rebuild and confirm CSS ships**

Run: `hugo --gc --quiet && grep -c "pokal-timeline" public/css/main.css`
Expected: ≥ 1.

- [ ] **Step 3: Commit**

```bash
git add static/css/main.css
git commit -m "style(pokal): vertical timeline card styling"
```

## Task B4: Add the "Pokal" nav entry

**Files:**
- Modify: `hugo.toml`

- [ ] **Step 1: Insert a menu block** in `hugo.toml` between the `Termine` (weight 40) and `Galerie` (weight 50) entries:

```toml
  [[menus.main]]
    name = "Pokal"
    url = "/pokal/"
    weight = 45
```

- [ ] **Step 2: Rebuild and confirm the nav link**

Run: `hugo --gc --quiet && grep -o 'href="/pokal/"' public/index.html | head -1`
Expected: `href="/pokal/"`.

- [ ] **Step 3: Commit**

```bash
git add hugo.toml
git commit -m "feat(pokal): add Pokal nav entry"
```

## Task B5: Visual verification

- [ ] **Step 1: Serve locally and inspect both viewports**

Run: `hugo server --port 1313` (then open http://localhost:1313/pokal/)
Verify manually:
- Both teams render; LK 18–25 shows 4 winner-branch rounds (3 green "gewonnen", last grey "noch offen"); the 09.06 round shows the "Auswärts" badge.
- Herren-40 shows 1 red "verloren" Hauptrunde round, the red fork line, then a grey "noch offen" Nebenrunde round.
- Nav shows "Pokal" between "Termine" and "Galerie".
- Resize to mobile width: cards stack cleanly, no overflow.

- [ ] **Step 2:** Stop the server (Ctrl-C). No commit (verification only).

---

## Final verification

- [ ] Run the full backend suite: `cd tools/nuliga-sync && node --test 'tests/**/*.test.js'` → all PASS.
- [ ] `npm run bundle` → no error; `dist/n8n-bundle.js` regenerated.
- [ ] `cd ../.. && hugo --gc` → clean build.
- [ ] `git status` → clean working tree (everything committed).

## Deployment note (out of plan scope, do not execute)

After merge, the n8n `nuliga-sync` Code node must be updated with the new
`dist/n8n-bundle.js`, and the Feli-mail node (`2026-05-28-feli-result-notification.md`)
already consumes `newResults` — cup results now flow through it automatically.
The daily Cloudflare rebuild publishes the `/pokal/` page. Flag this for the user;
it is a manual n8n touch, not a code task.
```
