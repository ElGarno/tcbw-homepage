import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOpponent } from '../src/normalize.js';

test('lowercases and trims whitespace', () => {
  assert.equal(normalizeOpponent('  Olper TC  '), 'olper tc');
});

test('strips trailing " 1" (default first team)', () => {
  assert.equal(normalizeOpponent('Olper TC 1'), 'olper tc');
});

test('keeps " 2"+ trailing number (second team is a different team)', () => {
  assert.equal(normalizeOpponent('TuS Ferndorf 2'), 'tus ferndorf 2');
  assert.equal(normalizeOpponent('TC SSV Elspe 2'), 'tc ssv elspe 2');
});

test('strips e.V. suffix', () => {
  assert.equal(normalizeOpponent('Tennisclub Iserlohn e.V. 1'), 'tennisclub iserlohn');
  assert.equal(normalizeOpponent('TC Esseltal e.V.'), 'tc esseltal');
});

test('normalizes German umlauts (both directions)', () => {
  assert.equal(normalizeOpponent('Höinger SV'), normalizeOpponent('Hoeinger SV'));
  assert.equal(normalizeOpponent('TC Blau-Weiß Attendorn'), normalizeOpponent('TC Blau-Weiss Attendorn'));
  assert.equal(normalizeOpponent('TC Buschhütten 1'), normalizeOpponent('TC Buschhuetten'));
});

test('collapses internal whitespace', () => {
  assert.equal(normalizeOpponent('TC   Blau-Weiss   Attendorn'), 'tc blau-weiss attendorn');
});
