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
  assert.throws(() => parseGroupPage('<html></html>'), /layout may have changed/i);
});

test('detects the Attendorn-side team_name', () => {
  const result = parseGroupPage(html67);
  assert.match(result.team_name, /Attendorn/);
});

const GROUPS = [
  { id: 67, expectedCount: 4 },   // Herren 30
  { id: 77, expectedCount: 5 },   // Herren 40
  { id: 109, expectedCount: 5 },  // Herren 60
  { id: 2, expectedCount: 6 },    // Damen
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

test('parses date+time from liga.nu combined cell format', () => {
  const result = parseGroupPage(html67);
  const firstMatch = result.matches[0];
  assert.equal(firstMatch.date, '2026-05-09');
  assert.equal(firstMatch.time, '13:00');
  assert.match(firstMatch.home, /Attendorn/);
  assert.match(firstMatch.guest, /Olper/);
});
