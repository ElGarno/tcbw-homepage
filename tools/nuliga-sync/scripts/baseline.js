#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { TEAMS, liganuUrl } from '../src/teams.js';
import { parseGroupPage } from '../src/parser.js';
import { readMannschaftMd } from '../src/mdReader.js';
import { diffMatches, isEmptyChangeSet } from '../src/diff.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const ATTENDORN_HOME_NAME = 'TC Blau-Weiß Attendorn 1';

function pokalExistingFromTermine(termineMd, ligaGroup) {
  const fm = termineMd.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return [];
  const events = yaml.load(fm[1]).events ?? [];
  return events
    .filter(e => e.category === 'pokal' && e.liga_group === ligaGroup)
    .map(e => ({
      date: e.date instanceof Date
        ? e.date.toISOString().slice(0, 10)
        : String(e.date),
      time: String(e.time).replace(/\s*Uhr\s*$/, ''),
      home: ATTENDORN_HOME_NAME,
      guest: e.opponent,
    }));
}

const termineMd = readFileSync(join(REPO_ROOT, 'content/termine/_index.md'), 'utf8');
let totalChanges = 0;

for (const team of TEAMS) {
  process.stdout.write(`${team.label.padEnd(16)} ... `);
  try {
    const url = liganuUrl(team.group, team.championship ?? 'SW 2026');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const liga = parseGroupPage(html);

    let existing;
    let ligaMatches = liga.matches;
    if (team.kind === 'pokal') {
      ligaMatches = liga.matches.filter(m => m.home.includes('Attendorn'));
      existing = pokalExistingFromTermine(termineMd, team.group);
    } else {
      const md = readFileSync(join(REPO_ROOT, team.file), 'utf8');
      ({ matches: existing } = readMannschaftMd(md));
    }

    const cs = diffMatches(existing, ligaMatches);
    if (isEmptyChangeSet(cs)) {
      console.log('OK (no changes)');
    } else {
      totalChanges += cs.updates.length + cs.adds.length + cs.missings.length;
      console.log(`CHANGES — ${cs.updates.length}U ${cs.adds.length}A ${cs.missings.length}M`);
      for (const u of cs.updates) console.log('  Update:', u);
      for (const a of cs.adds) console.log('  Add:', a);
      for (const m of cs.missings) console.log('  Missing:', m);
    }
  } catch (err) {
    console.log(`ERROR — ${err.message}`);
  }
}

console.log(`\nTotal changes detected: ${totalChanges}`);
process.exit(totalChanges === 0 ? 0 : 1);
