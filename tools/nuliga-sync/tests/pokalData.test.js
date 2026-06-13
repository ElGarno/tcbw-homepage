import { test } from 'node:test';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { renderPokalYaml, parsePokalYaml, collectNewResults } from '../src/pokalData.js';

const path = (slug, rounds) => ({ slug, label: 'L', detail: 'D', liga_url: 'http://x?group=1', rounds });
const round = (branch, round, opponent, result, outcome, home = true) =>
  ({ branch, round, date: '2026-05-05', time: '18:00', home, opponent, result, outcome });

test('renderPokalYaml round-trips through a YAML parser', () => {
  const paths = [path('herren-40', [round('haupt', 1, 'TV Rosenthal', '1:2', 'loss')])];
  const txt = renderPokalYaml(paths);
  const loaded = yaml.load(txt);
  assert.equal(loaded.teams.length, 1);
  assert.equal(loaded.teams[0].slug, 'herren-40');
  assert.equal(loaded.teams[0].rounds[0].opponent, 'TV Rosenthal');
  assert.equal(loaded.teams[0].rounds[0].result, '1:2');
  assert.equal(loaded.teams[0].rounds[0].home, true);
});

test('renderPokalYaml writes open results as null (~)', () => {
  const txt = renderPokalYaml([path('x', [round('haupt', 1, 'Y', null, 'open')])]);
  assert.equal(yaml.load(txt).teams[0].rounds[0].result, null);
});

test('parsePokalYaml returns [] for empty/missing content', () => {
  assert.deepEqual(parsePokalYaml(''), []);
  assert.deepEqual(parsePokalYaml('teams:\n'), []);
});

test('collectNewResults: open->scored produces a result event', () => {
  const oldPaths = [path('herren-40', [round('haupt', 1, 'TV Rosenthal', null, 'open')])];
  const newPaths = [path('herren-40', [round('haupt', 1, 'TV Rosenthal', '1:2', 'loss')])];
  const events = collectNewResults(oldPaths, newPaths, { 'herren-40': 'Herren-40-Pokal' });
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    team: 'Herren-40-Pokal', opponent: 'TV Rosenthal',
    date: '05.05.2026', time: '18:00', result: '1:2', isHome: true,
  });
});

test('collectNewResults: away result is captured', () => {
  const oldPaths = [path('lk', [round('haupt', 3, 'TV Rosenthal', null, 'open', false)])];
  const newPaths = [path('lk', [round('haupt', 3, 'TV Rosenthal', '1:2', 'win', false)])];
  const events = collectNewResults(oldPaths, newPaths, { lk: 'Herren-Pokal' });
  assert.equal(events.length, 1);
  assert.equal(events[0].isHome, false);
  assert.equal(events[0].result, '1:2');
});

test('collectNewResults: unchanged result produces nothing', () => {
  const same = [path('x', [round('haupt', 1, 'Y', '2:1', 'win')])];
  assert.deepEqual(collectNewResults(same, same, { x: 'X' }), []);
});

test('collectNewResults: a brand-new round that already has a result counts', () => {
  const oldPaths = [path('x', [round('haupt', 1, 'A', '2:1', 'win')])];
  const newPaths = [path('x', [
    round('haupt', 1, 'A', '2:1', 'win'),
    round('haupt', 2, 'B', '3:0', 'win'),
  ])];
  const events = collectNewResults(oldPaths, newPaths, { x: 'X' });
  assert.equal(events.length, 1);
  assert.equal(events[0].opponent, 'B');
});
