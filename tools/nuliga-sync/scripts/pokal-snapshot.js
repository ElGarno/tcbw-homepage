#!/usr/bin/env node
// Fetches live cup pages and (re)writes data/pokal.yaml. Dev/seed convenience;
// the production path is the n8n sync. Run: node scripts/pokal-snapshot.js
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { POKAL_TEAMS, liganuUrl } from '../src/teams.js';
import { parseGroupPage } from '../src/parser.js';
import { buildPokalPath } from '../src/pokalPath.js';
import { renderPokalYaml } from '../src/pokalData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');

const paths = [];
for (const pt of POKAL_TEAMS) {
  const branchMatches = {};
  for (const [branch, group] of Object.entries(pt.branches)) {
    const res = await fetch(liganuUrl(group, pt.championship));
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${pt.slug}/${branch}`);
    branchMatches[branch] = parseGroupPage(await res.text()).matches;
  }
  paths.push(buildPokalPath(pt, branchMatches.haupt ?? [], branchMatches.neben ?? []));
}

const out = join(REPO_ROOT, 'data/pokal.yaml');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, renderPokalYaml(paths));
console.log(`Wrote ${out}\n`);
console.log(renderPokalYaml(paths));
