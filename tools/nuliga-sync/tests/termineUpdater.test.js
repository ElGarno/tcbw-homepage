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
  assert.equal(events.length, 6);
});

test('add: new home match → appended', () => {
  const teamChanges = [
    { team: 'herren-30', updates: [], adds: [{ opponent: 'New Opponent', isHome: true, newDate: '2026-08-01', newTime: '13:00' }], missings: [] },
  ];
  const out = applyTermineChanges(fixture, teamChanges);
  const events = parseEvents(out);
  assert.equal(events.length, 7);
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
  assert.equal(events.length, 6);
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

test('frontmatter without trailing newline after closing --- is accepted', () => {
  // Files edited by the mail-to-homepage automation can lose the final newline.
  const teamChanges = [
    { kind: 'medenspiel', team: 'herren-30', updates: [{ opponent: 'TuS Ferndorf 2', isHome: true, newDate: '2026-07-04', newTime: '14:30' }], adds: [], missings: [] },
  ];
  const out = applyTermineChanges(fixture.trimEnd(), teamChanges);
  const events = parseEvents(out);
  const ferndorf = events.find(e => e.title.includes('Ferndorf'));
  assert.equal(ferndorf.time, '14:30 Uhr');
});
