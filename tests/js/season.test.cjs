const test = require('node:test');
const assert = require('node:assert/strict');
const { seasonFor, yearsSince } = require('../../static/js/season.js');

const d = (s) => new Date(`${s}T12:00:00`);

test('winter window', () => {
  assert.equal(seasonFor(d('2026-10-31')), null);
  assert.equal(seasonFor(d('2026-11-01')), 'winter');
  assert.equal(seasonFor(d('2026-12-31')), 'winter');
  assert.equal(seasonFor(d('2027-01-01')), 'winter');
  assert.equal(seasonFor(d('2027-03-31')), 'winter');
});

test('april fool only on 1 Apr', () => {
  assert.equal(seasonFor(d('2027-04-01')), 'april');
  assert.equal(seasonFor(d('2027-04-02')), null);
  assert.equal(seasonFor(d('2027-07-15')), null);
});

test('override', () => {
  assert.equal(seasonFor(d('2027-07-15'), 'winter'), 'winter');
  assert.equal(seasonFor(d('2027-07-15'), 'april'), 'april');
  assert.equal(seasonFor(d('2026-12-01'), 'off'), null);
  assert.equal(seasonFor(d('2026-12-01'), 'foo'), 'winter');
  assert.equal(seasonFor(d('2026-12-01'), ''), 'winter');
});

test('yearsSince', () => {
  assert.equal(yearsSince(1931, d('2026-04-01')), 95);
  assert.equal(yearsSince(1931, d('2027-04-01')), 96);
});
