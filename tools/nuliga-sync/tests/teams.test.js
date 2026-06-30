import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEAMS, POKAL_TEAMS, liganuUrl } from '../src/teams.js';

test('TEAMS contains only the 7 medenspiel teams', () => {
  assert.equal(TEAMS.length, 7);
  assert.ok(TEAMS.every(t => t.kind === 'medenspiel'));
  assert.ok(TEAMS.every(t => typeof t.file === 'string'));
});

test('medenspiel teams have file path', () => {
  for (const t of TEAMS.filter(t => t.kind === 'medenspiel')) {
    assert.ok(t.file?.startsWith('content/mannschaften/'), `team ${t.slug} missing file`);
  }
});

test('POKAL_TEAMS is empty between seasons (2026 archived to data/pokal_archive.yaml)', () => {
  // Season over: cup teams are cleared so the sync stops regenerating
  // data/pokal.yaml. Next season re-adds them with the new liga.nu groups.
  assert.deepEqual(POKAL_TEAMS, []);
});

test('liganuUrl builds a WTV VP group url', () => {
  const url = liganuUrl('2229674', 'WTV VP 2026');
  assert.ok(url.includes('group=2229674'));
  assert.ok(url.includes('championship=WTV+VP+2026'));
});
