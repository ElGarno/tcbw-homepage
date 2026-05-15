import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffMatches, isEmptyChangeSet } from '../src/diff.js';

const baseExisting = [
  { date: '2026-05-09', time: '13:00', home: 'TC BW Attendorn', guest: 'Olper TC' },
  { date: '2026-06-13', time: '13:00', home: 'TV Rosenthal 1899 2', guest: 'TC BW Attendorn' },
];

const baseLiga = [
  { date: '2026-05-09', time: '13:00', home: 'TC Blau-Weiß Attendorn 1', guest: 'Olper TC 1' },
  { date: '2026-06-13', time: '13:00', home: 'TV Rosenthal 1899 2', guest: 'TC Blau-Weiß Attendorn 1' },
];

test('identical (after normalization) → no changes', () => {
  const result = diffMatches(baseExisting, baseLiga);
  assert.deepEqual(result.updates, []);
  assert.deepEqual(result.adds, []);
  assert.deepEqual(result.missings, []);
  assert.equal(isEmptyChangeSet(result), true);
});

test('time changed → 1 Update, 0 Adds, 0 Missings', () => {
  const liga = [
    { ...baseLiga[0] },
    { ...baseLiga[1], time: '10:00' },
  ];
  const result = diffMatches(baseExisting, liga);
  assert.equal(result.updates.length, 1);
  assert.equal(result.updates[0].newTime, '10:00');
  assert.equal(result.updates[0].oldTime, '13:00');
  assert.equal(result.adds.length, 0);
  assert.equal(result.missings.length, 0);
});

test('date shifted (same opponent, same H/A) → 1 Update (NOT delete+add)', () => {
  const liga = [
    { ...baseLiga[0] },
    { ...baseLiga[1], date: '2026-06-14' },
  ];
  const result = diffMatches(baseExisting, liga);
  assert.equal(result.updates.length, 1);
  assert.equal(result.updates[0].newDate, '2026-06-14');
  assert.equal(result.adds.length, 0);
  assert.equal(result.missings.length, 0);
});

test('match removed from liga.nu → 1 Missing (NOT deleted)', () => {
  const liga = [baseLiga[0]];
  const result = diffMatches(baseExisting, liga);
  assert.equal(result.missings.length, 1);
  assert.equal(result.updates.length, 0);
  assert.equal(result.adds.length, 0);
});

test('new match in liga.nu → 1 Add', () => {
  const liga = [
    ...baseLiga,
    { date: '2026-07-04', time: '13:00', home: 'TC Blau-Weiß Attendorn 1', guest: 'TuS Ferndorf 2' },
  ];
  const result = diffMatches(baseExisting, liga);
  assert.equal(result.adds.length, 1);
  assert.match(result.adds[0].guest, /Ferndorf/);
  assert.equal(result.updates.length, 0);
  assert.equal(result.missings.length, 0);
});

test('home/away swap (same opponent) → treated as different identity', () => {
  const liga = [
    baseLiga[0],
    { date: '2026-06-13', time: '13:00', home: 'TC Blau-Weiß Attendorn 1', guest: 'TV Rosenthal 1899 2' },
  ];
  const result = diffMatches(baseExisting, liga);
  assert.equal(result.missings.length, 1);
  assert.equal(result.adds.length, 1);
});

test('result newly filled in (existing null, liga has score) → 1 Update', () => {
  const existing = [
    { date: '2026-05-09', time: '13:00', home: 'TC BW Attendorn', guest: 'Olper TC', result: null },
  ];
  const liga = [
    { date: '2026-05-09', time: '13:00', home: 'TC Blau-Weiß Attendorn 1', guest: 'Olper TC 1', result: '3:6' },
  ];
  const result = diffMatches(existing, liga);
  assert.equal(result.updates.length, 1);
  assert.equal(result.updates[0].newResult, '3:6');
  assert.equal(result.updates[0].oldResult, null);
});

test('result unchanged (both null) → no Update', () => {
  const existing = [
    { date: '2026-05-09', time: '13:00', home: 'TC BW Attendorn', guest: 'Olper TC', result: null },
  ];
  const liga = [
    { date: '2026-05-09', time: '13:00', home: 'TC Blau-Weiß Attendorn 1', guest: 'Olper TC 1', result: null },
  ];
  const result = diffMatches(existing, liga);
  assert.equal(result.updates.length, 0);
});

test('result disappears from liga.nu (existing has score, liga is null) → no Update (preserve manual entry)', () => {
  const existing = [
    { date: '2026-05-09', time: '13:00', home: 'TC BW Attendorn', guest: 'Olper TC', result: '3:6' },
  ];
  const liga = [
    { date: '2026-05-09', time: '13:00', home: 'TC Blau-Weiß Attendorn 1', guest: 'Olper TC 1', result: null },
  ];
  const result = diffMatches(existing, liga);
  assert.equal(result.updates.length, 0,
    'liga.nu null must never overwrite a manually entered result');
});

test('result corrected (existing 3:6, liga 6:3) → 1 Update', () => {
  const existing = [
    { date: '2026-05-09', time: '13:00', home: 'TC BW Attendorn', guest: 'Olper TC', result: '3:6' },
  ];
  const liga = [
    { date: '2026-05-09', time: '13:00', home: 'TC Blau-Weiß Attendorn 1', guest: 'Olper TC 1', result: '6:3' },
  ];
  const result = diffMatches(existing, liga);
  assert.equal(result.updates.length, 1);
  assert.equal(result.updates[0].newResult, '6:3');
  assert.equal(result.updates[0].oldResult, '3:6');
});

test('time AND result both changed → still 1 Update (carries both)', () => {
  const existing = [
    { date: '2026-05-09', time: '13:00', home: 'TC BW Attendorn', guest: 'Olper TC', result: null },
  ];
  const liga = [
    { date: '2026-05-09', time: '14:00', home: 'TC Blau-Weiß Attendorn 1', guest: 'Olper TC 1', result: '6:3' },
  ];
  const result = diffMatches(existing, liga);
  assert.equal(result.updates.length, 1);
  assert.equal(result.updates[0].newTime, '14:00');
  assert.equal(result.updates[0].newResult, '6:3');
});
