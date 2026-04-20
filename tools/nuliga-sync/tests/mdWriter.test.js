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

test('home team gets bolded when Attendorn, guest stays plain', () => {
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
