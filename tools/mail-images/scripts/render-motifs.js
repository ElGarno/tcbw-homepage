// Renders hand-drawn motif fragments (motifs/<basename>.g.svg) into house-style SVGs
// under static/images/news/gezeichnet/, through the same sanitiser the automation uses.
const fs = require('node:fs');
const path = require('node:path');
const { renderSvg } = require('../src/draw.js');

const root = path.join(__dirname, '../../..');
const motifDir = path.join(__dirname, '../motifs');
const outDir = path.join(root, 'static/images/news/gezeichnet');
fs.mkdirSync(outDir, { recursive: true });

let written = 0;
for (const name of fs.readdirSync(motifDir).filter((f) => f.endsWith('.g.svg'))) {
  const base = name.replace(/\.g\.svg$/, '');
  const svg = renderSvg(fs.readFileSync(path.join(motifDir, name), 'utf8'), 'img-' + base);
  if (!svg) {
    console.error('render failed: ' + name);
    process.exit(1);
  }
  fs.writeFileSync(path.join(outDir, base + '.svg'), svg);
  written++;
}
console.log(written + ' written');
