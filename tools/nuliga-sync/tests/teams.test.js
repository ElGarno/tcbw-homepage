import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEAMS, POKAL_TEAMS, liganuUrl } from '../src/teams.js';

test('TEAMS contains the 9 medenspiel teams (7 summer + 2 winter)', () => {
  assert.equal(TEAMS.length, 9);
  assert.ok(TEAMS.every(t => t.kind === 'medenspiel'));
  assert.ok(TEAMS.every(t => typeof t.file === 'string'));
});

test('medenspiel teams have file path', () => {
  for (const t of TEAMS.filter(t => t.kind === 'medenspiel')) {
    assert.ok(t.file?.startsWith('content/mannschaften/'), `team ${t.slug} missing file`);
  }
});

test('winter teams use the winter championship', () => {
  const winter = TEAMS.filter(t => t.slug.endsWith('-winter'));
  assert.equal(winter.length, 2);
  assert.ok(winter.every(t => t.championship === 'SW Winter 26/27'));
  assert.ok(liganuUrl(winter[0].group, winter[0].championship).includes('championship=SW+Winter+26%2F27'));
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
