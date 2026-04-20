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

function isoDateString(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
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

test('away match update is ignored (termine only tracks home matches)', () => {
  const teamChanges = [
    { team: 'herren-30', updates: [{ opponent: 'X', isHome: false, newDate: '2026-06-13', newTime: '10:00' }], adds: [], missings: [] },
  ];
  const out = applyTermineChanges(fixture, teamChanges);
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
  assert.equal(events.length, 4);
  const ferndorf = events.find(e => e.title.includes('Ferndorf'));
  assert.ok(ferndorf);
});

test('output preserves chronological order', () => {
  const teamChanges = [
    { team: 'herren-30', updates: [], adds: [{ opponent: 'New', isHome: true, newDate: '2026-04-01', newTime: '11:00' }], missings: [] },
  ];
  const out = applyTermineChanges(fixture, teamChanges);
  const events = parseEvents(out);
  const dates = events.map(e => isoDateString(e.date));
  for (let i = 1; i < dates.length; i++) {
    assert.ok(dates[i - 1] <= dates[i], `not sorted: ${dates[i-1]} > ${dates[i]}`);
  }
  assert.ok(dates.includes('2026-04-01'));
});
