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
  assert.equal(m.guest, 'Olper TC');
});

test('preserves frontmatter and body', () => {
  const { frontmatter, body } = readMannschaftMd(md);
  assert.match(frontmatter, /title: "Herren 30"/);
  assert.match(body, /## Spielplan/);
});

test('result column captured as null when "-"', () => {
  const { matches } = readMannschaftMd(md);
  for (const m of matches) {
    assert.equal(m.result, null);
  }
});
