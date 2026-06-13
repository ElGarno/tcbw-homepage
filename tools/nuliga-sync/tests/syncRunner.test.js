import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { runSync } from '../src/syncRunner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const FIXTURES = join(__dirname, 'fixtures');

const FIX = new URL('./fixtures/', import.meta.url);
const fx = (name) => readFileSync(new URL(name, FIX), 'utf8');

// Only the 7 medenspiel groups. Cup groups (2229674 etc.) are handled by makeCupFetch().
const MEDENSPIEL_GROUPS = new Set(['2', '67', '77', '109', '120', '129', '205']);

function fixtureHtml(group) {
  return readFileSync(join(FIXTURES, `group-${group}.html`), 'utf8');
}

function repoFileReader(overrides = {}) {
  return async (path) => {
    if (overrides[path] !== undefined) return overrides[path];
    return readFileSync(join(REPO_ROOT, path), 'utf8');
  };
}

function fetchFromFixtures() {
  return async (url) => {
    const m = url.match(/group=(\d+)/);
    if (!m || !MEDENSPIEL_GROUPS.has(m[1])) return { ok: false, status: 404 };
    const html = fixtureHtml(m[1]);
    return { ok: true, status: 200, text: async () => html };
  };
}

// Content of mixed-u12.md that matches the group-205.html fixture (rescheduled date).
// The fixture reflects the current schedule; without this override the "no changes" test
// would detect a spurious Mixed U12 date update caused by the fixture being newer than the repo MD.
const MIXED_U12_SYNCED = readFileSync(join(REPO_ROOT, 'content/mannschaften/mixed-u12.md'), 'utf8')
  .replace('| 15.06.2026 | 17:00 | TC 71 Netphen |', '| 12.06.2026 | 15:30 | TC 71 Netphen |');

test('no changes when fixtures match repo state', async () => {
  const result = await runSync({
    fetchImpl: fetchFromFixtures(),
    readRepoFile: repoFileReader({
      'content/mannschaften/mixed-u12.md': MIXED_U12_SYNCED,
    }),
    today: new Date('2026-04-20T05:00:00Z'),
  });
  assert.equal(result.changed, false);
  // Cup team fetches return 404 so they land in errors; medenspiel loop must be clean.
  const medenErrors = result.errors.filter(e => !['herren-lk18-25', 'herren-40'].includes(e.team));
  assert.deepEqual(medenErrors, []);
  assert.equal(result.fileChanges.length, 0);
});

test('detects time change in one team', async () => {
  const modifiedHerren30 = readFileSync(join(REPO_ROOT, 'content/mannschaften/herren-30.md'), 'utf8')
    .replace('| 04.07.2026 | 14:30 |', '| 04.07.2026 | 13:00 |');

  const result = await runSync({
    fetchImpl: fetchFromFixtures(),
    readRepoFile: repoFileReader({
      'content/mannschaften/herren-30.md': modifiedHerren30,
      'content/mannschaften/mixed-u12.md': MIXED_U12_SYNCED,
    }),
    today: new Date('2026-04-20T05:00:00Z'),
  });

  assert.equal(result.changed, true);
  assert.match(result.prTitle, /1 Updates/);
  assert.match(result.prBody, /Herren 30.*TuS Ferndorf 2.*13:00.*14:30/);
  assert.ok(result.fileChanges.find(f => f.path === 'content/mannschaften/herren-30.md'));
});

test('branch name uses timestamp', async () => {
  const modifiedHerren30 = readFileSync(join(REPO_ROOT, 'content/mannschaften/herren-30.md'), 'utf8')
    .replace('| 04.07.2026 | 14:30 |', '| 04.07.2026 | 13:00 |');

  const result = await runSync({
    fetchImpl: fetchFromFixtures(),
    readRepoFile: repoFileReader({
      'content/mannschaften/herren-30.md': modifiedHerren30,
    }),
    today: new Date('2026-04-20T05:30:00Z'),
  });
  assert.match(result.branch, /^nuliga-sync\/2026-04-20-\d{4}$/);
});


test('newly entered result on liga.nu propagates into mannschaften MD', async () => {
  // Simulate the typical case: MD has '-' for the match, liga.nu now shows a score.
  // Use the real MD but force the Olper result back to '-' so the sync sees a true add.
  const mdWithoutResult = readFileSync(join(REPO_ROOT, 'content/mannschaften/herren-30.md'), 'utf8')
    .replace('| **TC BW Attendorn** | Olper TC | 3:6 |', '| **TC BW Attendorn** | Olper TC | - |');
  const patchedHtml = readFileSync(join(FIXTURES, 'group-67.html'), 'utf8').replace(
    /(Olper TC 1[\s\S]*?<\/td>\s*<td class="center">\s*)&nbsp;/,
    '$13:6',
  );
  const fetchImpl = async (url) => {
    const m = url.match(/group=(\d+)/);
    if (!m) throw new Error(`bad url: ${url}`);
    if (!MEDENSPIEL_GROUPS.has(m[1])) return { ok: false, status: 404 };
    if (m[1] === '67') return { ok: true, status: 200, text: async () => patchedHtml };
    return { ok: true, status: 200, text: async () => fixtureHtml(m[1]) };
  };

  const result = await runSync({
    fetchImpl,
    readRepoFile: repoFileReader({
      'content/mannschaften/herren-30.md': mdWithoutResult,
      'content/mannschaften/mixed-u12.md': MIXED_U12_SYNCED,
    }),
    today: new Date('2026-04-20T05:00:00Z'),
  });

  assert.equal(result.changed, true);
  const herren30Change = result.fileChanges.find(f => f.path === 'content/mannschaften/herren-30.md');
  assert.ok(herren30Change, 'herren-30.md must be in fileChanges');
  assert.match(
    herren30Change.content,
    /\| 09\.05\.2026 \| 13:00 \| \*\*TC BW Attendorn\*\* \| Olper TC \| 3:6 \|/,
    'Olper row should carry the 3:6 result after sync',
  );
});

test('newResults: filled-in scores are extracted for social-media notification', async () => {
  // Same fixture trick as above: liga.nu has just published the Olper score (3:6).
  const mdWithoutResult = readFileSync(join(REPO_ROOT, 'content/mannschaften/herren-30.md'), 'utf8')
    .replace('| **TC BW Attendorn** | Olper TC | 3:6 |', '| **TC BW Attendorn** | Olper TC | - |');
  const patchedHtml = readFileSync(join(FIXTURES, 'group-67.html'), 'utf8').replace(
    /(Olper TC 1[\s\S]*?<\/td>\s*<td class="center">\s*)&nbsp;/,
    '$13:6',
  );
  const fetchImpl = async (url) => {
    const m = url.match(/group=(\d+)/);
    if (!m) throw new Error(`bad url: ${url}`);
    if (!MEDENSPIEL_GROUPS.has(m[1])) return { ok: false, status: 404 };
    if (m[1] === '67') return { ok: true, status: 200, text: async () => patchedHtml };
    return { ok: true, status: 200, text: async () => fixtureHtml(m[1]) };
  };

  const result = await runSync({
    fetchImpl,
    readRepoFile: repoFileReader({
      'content/mannschaften/herren-30.md': mdWithoutResult,
      'content/mannschaften/mixed-u12.md': MIXED_U12_SYNCED,
    }),
    today: new Date('2026-04-20T05:00:00Z'),
  });

  assert.equal(result.newResults.length, 1);
  const r = result.newResults[0];
  assert.equal(r.team, 'Herren 30');
  assert.equal(r.opponent, 'Olper TC 1');
  assert.equal(r.result, '3:6');
  assert.equal(r.isHome, true);
});

test('newResults: time-only updates are NOT extracted as new results', async () => {
  // Time change without a score change should NOT produce a Feli-notification entry.
  const modifiedHerren30 = readFileSync(join(REPO_ROOT, 'content/mannschaften/herren-30.md'), 'utf8')
    .replace('| 04.07.2026 | 14:30 |', '| 04.07.2026 | 13:00 |');
  const result = await runSync({
    fetchImpl: fetchFromFixtures(),
    readRepoFile: repoFileReader({
      'content/mannschaften/herren-30.md': modifiedHerren30,
    }),
    today: new Date('2026-04-20T05:00:00Z'),
  });
  assert.equal(result.changed, true);
  assert.equal(result.newResults.length, 0);
});

test('newResults: returns empty array when no changes detected at all', async () => {
  const result = await runSync({
    fetchImpl: fetchFromFixtures(),
    readRepoFile: repoFileReader(),
    today: new Date('2026-04-20T05:00:00Z'),
  });
  assert.deepEqual(result.newResults, []);
});

const GROUP_FIXTURE = {
  '2229674': 'pokal-lk1825-haupt.html',
  '2236574': 'pokal-lk1825-neben.html',
  '2229754': 'pokal-h40-haupt.html',
  '2236634': 'pokal-h40-neben.html',
};

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

function makeCupFetch() {
  return async (url) => {
    const group = new URL(url).searchParams.get('group');
    const file = GROUP_FIXTURE[group];
    if (!file) return { ok: false, status: 404 }; // medenspiel groups -> recorded as errors, fine here
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
  const out = await runSync({ fetchImpl: makeCupFetch(), readRepoFile });

  assert.equal(out.changed, true);
  const pokalFile = out.fileChanges.find(f => f.path === 'data/pokal.yaml');
  assert.ok(pokalFile, 'data/pokal.yaml not in fileChanges');
  assert.ok(pokalFile.content.includes('Herren-40-Pokal') || pokalFile.content.includes('herren-40'));

  const away = out.newResults.find(r => r.isHome === false && r.result === '1:2');
  assert.ok(away, 'away cup result missing from newResults');

  const termineFile = out.fileChanges.find(f => f.path === 'content/termine/_index.md');
  assert.ok(termineFile, 'termine file should change (new upcoming home games)');
  assert.ok(termineFile.content.includes('Holzwickede'), 'upcoming home game missing from termine');
  assert.ok(!termineFile.content.includes('Rosenthal'), 'away/played game leaked into termine');
});

