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
