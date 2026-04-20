import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPrBody } from '../src/prBody.js';

test('all-empty change set → all sections show "(keine)"', () => {
  const body = renderPrBody('2026-04-21', []);
  assert.match(body, /### Geänderte Spiele\n\(keine\)/);
  assert.match(body, /### Neue Spiele\n\(keine\)/);
  assert.match(body, /### .*Spiele nicht mehr in liga\.nu\n\(keine\)/);
});

test('renders date in title', () => {
  const body = renderPrBody('2026-04-21', []);
  assert.match(body, /Liga\.nu Sync — 2026-04-21/);
});

test('renders updates table', () => {
  const teamChanges = [{
    team: 'herren-30',
    teamLabel: 'Herren 30',
    updates: [
      { opponent: 'TuS Ferndorf 2', isHome: true, oldDate: '2026-07-04', oldTime: '13:00', newDate: '2026-07-04', newTime: '14:30' },
    ],
    adds: [], missings: [], termineUpdates: [],
  }];
  const body = renderPrBody('2026-04-21', teamChanges);
  assert.match(body, /\| Herren 30 \| TuS Ferndorf 2 \(H\) \| 04\.07\. 13:00 \| 04\.07\. 14:30 \|/);
});

test('missings show warning marker', () => {
  const teamChanges = [{
    team: 'herren-60',
    teamLabel: 'Herren 60',
    updates: [], adds: [],
    missings: [{ opponent: 'TC Ennepetal-Breckerfeld', isHome: false, date: '2026-05-09', time: '13:00' }],
    termineUpdates: [],
  }];
  const body = renderPrBody('2026-04-21', teamChanges);
  assert.match(body, /⚠️ Spiele nicht mehr in liga\.nu/);
  assert.match(body, /Herren 60.*TC Ennepetal-Breckerfeld.*\(A\).*09\.05\.\s*13:00/);
});

test('termine updates section only present when any termineUpdates exist', () => {
  const noTermine = renderPrBody('2026-04-21', [{
    team: 'herren-30', teamLabel: 'Herren 30',
    updates: [], adds: [], missings: [], termineUpdates: [],
  }]);
  assert.doesNotMatch(noTermine, /### Termine in \/termine/);

  const withTermine = renderPrBody('2026-04-21', [{
    team: 'herren-30', teamLabel: 'Herren 30',
    updates: [], adds: [], missings: [],
    termineUpdates: [{ title: 'Herren 30 vs. TuS Ferndorf 2', date: '2026-07-04', newTime: '14:30' }],
  }]);
  assert.match(withTermine, /### Termine in \/termine\/_index\.md mit-aktualisiert/);
  assert.match(withTermine, /Herren 30 vs\. TuS Ferndorf 2 \(04\.07\.\) → 14:30/);
});
