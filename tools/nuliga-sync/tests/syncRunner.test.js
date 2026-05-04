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
  // The diff is pokal-only — no mannschaften MD should have been written.
  // (pathsRead will include all medenspiel MDs for diff check, but only pokal changes go to PR)
  const mannschaftWrites = pathsRead.filter(p => p.startsWith('content/mannschaften/') && p.endsWith('.md'));
  const fileChangePaths = result.fileChanges.map(f => f.path);
  assert.ok(fileChangePaths.includes('content/termine/_index.md'),
    'fileChanges should include termine update');
  assert.ok(!fileChangePaths.some(p => p.startsWith('content/mannschaften/')),
    `pokal-only run should not write mannschaft MDs, but wrote: ${fileChangePaths.filter(p => p.startsWith('content/mannschaften/')).join(', ')}`);
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
