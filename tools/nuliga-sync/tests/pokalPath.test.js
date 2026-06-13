import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchOutcome, buildPokalPath } from '../src/pokalPath.js';

const H = (date, time, opp, result, home = true) => ({
  date, time,
  home: home ? 'TC Blau-Weiß Attendorn 1' : `${opp} 1`,
  guest: home ? `${opp} 1` : 'TC Blau-Weiß Attendorn 1',
  result,
});

test('matchOutcome: home win/loss/open', () => {
  assert.equal(matchOutcome(H('2026-05-05', '18:00', 'X', '2:1')), 'win');
  assert.equal(matchOutcome(H('2026-05-05', '18:00', 'X', '1:2')), 'loss');
  assert.equal(matchOutcome(H('2026-05-05', '18:00', 'X', null)), 'open');
});

test('matchOutcome: away result is read from Attendorn side', () => {
  // Attendorn is guest; liga.nu prints home:guest = "1:2" => Attendorn won
  assert.equal(matchOutcome(H('2026-06-09', '18:00', 'Rosenthal', '1:2', false)), 'win');
  assert.equal(matchOutcome(H('2026-06-09', '18:00', 'Rosenthal', '2:1', false)), 'loss');
});

test('buildPokalPath: winner branch only, chronological rounds', () => {
  const team = { slug: 'herren-lk18-25', label: 'L', detail: 'D', championship: 'WTV VP 2026', branches: { haupt: '2229674', neben: '2236574' } };
  const haupt = [
    H('2026-05-19', '18:00', 'TC Letmathe', '2:1'),
    H('2026-05-05', '18:00', 'TV Rönkhausen 1892 e.V. TA', '2:1'),
    H('2026-06-09', '18:00', 'TV Rosenthal 1899', '1:2', false),
    H('2026-06-23', '18:00', 'TuS Elch Holzwickede', null),
  ];
  const path = buildPokalPath(team, haupt, []);
  assert.deepEqual(path.rounds.map(r => [r.branch, r.round, r.outcome]), [
    ['haupt', 1, 'win'], ['haupt', 2, 'win'], ['haupt', 3, 'win'], ['haupt', 4, 'open'],
  ]);
  assert.equal(path.rounds[0].opponent, 'TV Rönkhausen 1892 TA'); // display-cleaned
  assert.equal(path.rounds[2].home, false);
  assert.ok(path.liga_url.includes('group=2229674')); // still in winner branch
});

test('buildPokalPath: appends neben branch only after a haupt loss', () => {
  const team = { slug: 'herren-40', label: 'L', detail: 'D', championship: 'WTV VP 2026', branches: { haupt: '2229754', neben: '2236634' } };
  const haupt = [H('2026-05-06', '18:00', 'TV Rosenthal 1899', '1:2')];
  const neben = [H('2026-06-17', '18:00', 'TC GW Meinerzhagen', null)];
  const path = buildPokalPath(team, haupt, neben);
  assert.deepEqual(path.rounds.map(r => [r.branch, r.round, r.outcome]), [
    ['haupt', 1, 'loss'], ['neben', 1, 'open'],
  ]);
  assert.ok(path.liga_url.includes('group=2236634')); // active group switched to neben
});

test('buildPokalPath: precautionary neben games are NOT appended without a loss', () => {
  const team = { slug: 'herren-lk18-25', label: 'L', detail: 'D', championship: 'WTV VP 2026', branches: { haupt: '2229674', neben: '2236574' } };
  const haupt = [H('2026-05-05', '18:00', 'X', '2:1')];
  const neben = [H('2026-05-05', '18:00', 'Y', '0:3')]; // stray, but we never lost
  const path = buildPokalPath(team, haupt, neben);
  assert.equal(path.rounds.length, 1);
  assert.equal(path.rounds[0].branch, 'haupt');
});
