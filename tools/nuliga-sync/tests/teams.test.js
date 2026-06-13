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

test('POKAL_TEAMS has both cup teams with haupt+neben branches', () => {
  assert.equal(POKAL_TEAMS.length, 2);
  for (const t of POKAL_TEAMS) {
    assert.equal(t.kind, 'pokal');
    assert.ok(t.branches.haupt, `${t.slug} missing haupt`);
    assert.ok(t.branches.neben, `${t.slug} missing neben`);
    assert.equal(t.championship, 'WTV VP 2026');
    assert.ok(t.label && t.detail);
  }
  const byid = Object.fromEntries(POKAL_TEAMS.map(t => [t.slug, t.branches]));
  assert.deepEqual(byid['herren-lk18-25'], { haupt: '2229674', neben: '2236574' });
  assert.deepEqual(byid['herren-40'], { haupt: '2229754', neben: '2236634' });
});

test('liganuUrl builds a WTV VP group url', () => {
  const url = liganuUrl('2229674', 'WTV VP 2026');
  assert.ok(url.includes('group=2229674'));
  assert.ok(url.includes('championship=WTV+VP+2026'));
});
