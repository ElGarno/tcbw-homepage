import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { runSync } from '../src/syncRunner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const FIXTURES = join(__dirname, 'fixtures');

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
    if (!m) throw new Error(`bad url: ${url}`);
    const html = fixtureHtml(m[1]);
    return { ok: true, status: 200, text: async () => html };
  };
}

test('no changes when fixtures match repo state', async () => {
  const result = await runSync({
    fetchImpl: fetchFromFixtures(),
    readRepoFile: repoFileReader(),
    today: new Date('2026-04-20T05:00:00Z'),
  });
  assert.equal(result.changed, false);
  assert.deepEqual(result.errors, []);
  assert.equal(result.fileChanges.length, 0);
});

test('detects time change in one team', async () => {
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

test('pokal team: syncs without writing mannschaften MD', async () => {
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
  // All medenspiel MDs are read for diff computation, but pokal-only diffs must not produce mannschaft writes.
  const fileChangePaths = result.fileChanges.map(f => f.path);
  assert.ok(fileChangePaths.includes('content/termine/_index.md'),
    'fileChanges should include termine update');
  assert.ok(!fileChangePaths.some(p => p.startsWith('content/mannschaften/')),
    `pokal-only run should not write mannschaft MDs, but wrote: ${fileChangePaths.filter(p => p.startsWith('content/mannschaften/')).join(', ')}`);
});

test('pokal: result-only update does not appear in PR body Neue Ergebnisse', async () => {
  // Liga.nu shows a result for the Herren-Pokal vs TV Rönkhausen match;
  // termine entry has no `result:` field, so we filter pokal result-only updates
  // out of the sync until termine schema + frontend support results.
  // Note: this fixture also produces a "Missing" warning for TC Letmathe (fixture predates
  // the actual schedule entry) — that's a separate, expected diff and not what we're testing here.
  const pokalHtml = readFileSync(join(FIXTURES, 'group-2229674.html'), 'utf8');
  const patchedPokalHtml = pokalHtml.replace(
    /(R[öo]nkhausen[\s\S]*?<\/td>\s*<td class="center">\s*)&nbsp;/,
    '$12:1',
  );
  assert.notEqual(patchedPokalHtml, pokalHtml, 'fixture patch failed for Rönkhausen row');

  const fetchImpl = async (url) => {
    const m = url.match(/group=(\d+)/);
    if (m[1] === '2229674') return { ok: true, status: 200, text: async () => patchedPokalHtml };
    return { ok: true, status: 200, text: async () => fixtureHtml(m[1]) };
  };
  const result = await runSync({
    fetchImpl,
    readRepoFile: repoFileReader(),
    today: new Date('2026-04-20T05:00:00Z'),
  });

  // Filter must drop the Rönkhausen result-only update → not present in PR body
  assert.doesNotMatch(result.prBody, /Neue Ergebnisse[\s\S]*?R[öo]nkhausen/);
  assert.doesNotMatch(result.prBody, /R[öo]nkhausen.*2:1/);
  // PR Title's update count must NOT include the filtered pokal result update
  assert.doesNotMatch(result.prTitle ?? '', /[1-9]\d* Updates/);
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
    if (m[1] === '67') return { ok: true, status: 200, text: async () => patchedHtml };
    return { ok: true, status: 200, text: async () => fixtureHtml(m[1]) };
  };

  const result = await runSync({
    fetchImpl,
    readRepoFile: repoFileReader({
      'content/mannschaften/herren-30.md': mdWithoutResult,
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
    if (m[1] === '67') return { ok: true, status: 200, text: async () => patchedHtml };
    return { ok: true, status: 200, text: async () => fixtureHtml(m[1]) };
  };

  const result = await runSync({
    fetchImpl,
    readRepoFile: repoFileReader({
      'content/mannschaften/herren-30.md': mdWithoutResult,
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
