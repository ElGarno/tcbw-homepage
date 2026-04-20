#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '../src');
const OUT = join(__dirname, '../dist');

mkdirSync(OUT, { recursive: true });

const FILES = [
  'normalize.js',
  'parser.js',
  'mdReader.js',
  'mdWriter.js',
  'diff.js',
  'termineUpdater.js',
  'prBody.js',
  'teams.js',
];

const parts = [
  '// Bundled nuliga-sync logic for n8n Code nodes.',
  '// DO NOT EDIT — regenerate with `npm run bundle`.',
  '//',
  '// Required n8n env: NODE_FUNCTION_ALLOW_EXTERNAL=cheerio,js-yaml',
  '// At top of your n8n Code node, add:',
  '//   const cheerio = require("cheerio");',
  '//   const yaml = require("js-yaml");',
  '',
];

for (const f of FILES) {
  const src = readFileSync(join(SRC, f), 'utf8');
  const stripped = src
    .replace(/^import\s+.*?;\s*$/gm, '')
    .replace(/^export\s+(default\s+)?/gm, '');
  parts.push(`// ── ${f} ──`);
  parts.push(stripped.trim());
  parts.push('');
}

const outPath = join(OUT, 'n8n-bundle.js');
writeFileSync(outPath, parts.join('\n'));
console.log(`Wrote ${outPath} (${parts.join('\n').length} bytes)`);
