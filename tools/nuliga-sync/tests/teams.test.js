import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEAMS, liganuUrl } from '../src/teams.js';

test('TEAMS contains 7 medenspiel + 2 pokal entries', () => {
  assert.equal(TEAMS.length, 9);
  const byKind = TEAMS.reduce((acc, t) => {
    acc[t.kind] = (acc[t.kind] ?? 0) + 1;
    return acc;
  }, {});
  assert.deepEqual(byKind, { medenspiel: 7, pokal: 2 });
});

test('every team has a kind field', () => {
  for (const t of TEAMS) {
    assert.ok(t.kind, `team ${t.slug} missing kind`);
    assert.match(t.kind, /^(medenspiel|pokal)$/);
  }
});

test('medenspiel teams have file path', () => {
  for (const t of TEAMS.filter(t => t.kind === 'medenspiel')) {
    assert.ok(t.file?.startsWith('content/mannschaften/'), `team ${t.slug} missing file`);
  }
});

test('pokal teams have championship + pokalDetail and no file', () => {
  for (const t of TEAMS.filter(t => t.kind === 'pokal')) {
    assert.ok(t.championship, `pokal team ${t.slug} missing championship`);
    assert.ok(t.pokalDetail, `pokal team ${t.slug} missing pokalDetail`);
    assert.equal(t.file, undefined);
  }
});

test('liganuUrl uses SW 2026 default for medenspiel', () => {
  const url = liganuUrl('67');
  assert.match(url, /championship=SW\+2026/);
  assert.match(url, /group=67/);
});

test('liganuUrl accepts pokal championship', () => {
  const url = liganuUrl('2229674', 'WTV VP 2026');
  assert.match(url, /championship=WTV\+VP\+2026/);
  assert.match(url, /group=2229674/);
});
