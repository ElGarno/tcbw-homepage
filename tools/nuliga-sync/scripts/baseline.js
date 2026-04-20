#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { TEAMS, liganuUrl } from '../src/teams.js';
import { parseGroupPage } from '../src/parser.js';
import { readMannschaftMd } from '../src/mdReader.js';
import { diffMatches, isEmptyChangeSet } from '../src/diff.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');

let totalChanges = 0;

for (const team of TEAMS) {
  process.stdout.write(`${team.label.padEnd(12)} ... `);
  try {
    const url = liganuUrl(team.group);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const liga = parseGroupPage(html);

    const mdPath = join(REPO_ROOT, team.file);
    const md = readFileSync(mdPath, 'utf8');
    const { matches: existing } = readMannschaftMd(md);

    const cs = diffMatches(existing, liga.matches);
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
