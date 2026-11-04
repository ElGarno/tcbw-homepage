const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BASENAMES = [
  '2026-08-21-schleifchenturnier-details',
  '2026-09-13-rewe-scheine-fuer-vereine',
  '2026-09-13-saisonfazit-sommer-2026',
  '2026-03-23-mixed-teams-2026-aufruf',
  '2026-04-06-platzinstandhaltung-sommer-2026',
  '2026-04-14-korrektur-jahreshauptversammlung-2026',
  '2026-04-27-platzoeffnung-2026',
  'fruehling-2026-ausblick',
];
const PALETTE = ['#ffffff', '#dceafb', '#a8ccf5', '#6ba3eb', '#3a7bd5', '#1e56a0', '#0f2240', '#153266', '#0a1628'];
const DIR = path.join(__dirname, '../../../static/images/news/gezeichnet');

test('every backfill post has a rendered, clean SVG', () => {
  for (const b of BASENAMES) {
    const svg = fs.readFileSync(path.join(DIR, b + '.svg'), 'utf8');
    assert.ok(Buffer.byteLength(svg) < 8192, b + ' size');
    assert.ok(!/<text|script|href/.test(svg), b + ' forbidden content');
    assert.ok(svg.includes('id="tpl-bg"'), b + ' template');
    for (const c of svg.match(/#[0-9a-fA-F]{3,6}\b/g)) {
      const full = c.length === 4 ? '#' + [...c.slice(1)].map((x) => x + x).join('') : c;
      assert.ok(PALETTE.includes(full.toLowerCase()), b + ' colour ' + c);
    }
  }
});

module.exports = { BASENAMES };
