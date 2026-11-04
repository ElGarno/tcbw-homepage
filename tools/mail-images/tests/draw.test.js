const test = require('node:test');
const assert = require('node:assert/strict');
const d = require('../src/draw.js');

test('extractMotif strips prose and code fences', () => {
  const text = 'Here you go:\n```svg\n<g><circle r="5"/></g>\n```\nEnjoy';
  assert.equal(d.extractMotif(text), '<g><circle r="5"/></g>');
});

test('extractMotif returns the outermost group', () => {
  const g = '<g id="a"><g id="b"><rect width="1" height="1"/></g><circle r="1"/></g>';
  assert.equal(d.extractMotif('x ' + g + ' y'), g);
});

test('extractMotif returns null without a group', () => {
  assert.equal(d.extractMotif('no svg here'), null);
});

test('sanitize removes script', () => {
  const out = d.sanitizeMotif('<g><script>alert(1)</script><circle r="3"/></g>', 'p');
  assert.ok(!/script|alert/.test(out));
  assert.ok(out.includes('<circle r="3"/>'));
});

test('sanitize removes event handlers', () => {
  const out = d.sanitizeMotif('<g onload="x()"><rect width="2" height="2"/></g>', 'p');
  assert.ok(!out.includes('onload'));
  assert.ok(out.includes('<rect width="2" height="2"/>'));
});

test('sanitize removes foreignObject, image and href', () => {
  const out = d.sanitizeMotif('<g><foreignObject><div/></foreignObject><image href="http://e/x.png"/><circle r="1"/></g>', 'p');
  assert.ok(!/foreignObject|image|href|div/.test(out));
  assert.ok(out.includes('<circle r="1"/>'));
});

test('sanitize removes style', () => {
  const out = d.sanitizeMotif('<g><path d="M0 0" style="fill:url(http://e)"/></g>', 'p');
  assert.ok(!out.includes('style'));
  assert.ok(out.includes('<path d="M0 0"/>'));
});

test('sanitize drops external url() and prefixes local ones', () => {
  const bad = d.sanitizeMotif('<g><rect fill="url(http://evil/#a)" width="1"/></g>', 'p');
  assert.ok(!bad.includes('url('));
  const good = d.sanitizeMotif('<g><defs><linearGradient id="a"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect fill="url(#a)" width="1"/></g>', 'p');
  assert.ok(good.includes('id="p-a"'));
  assert.ok(good.includes('fill="url(#p-a)"'));
});

test('sanitize rejects unbalanced markup', () => {
  assert.equal(d.sanitizeMotif('<g><circle r="3">', 'p'), null);
});

test('sanitize rejects empty input', () => {
  assert.equal(d.sanitizeMotif('', 'p'), null);
  assert.equal(d.sanitizeMotif('   ', 'p'), null);
});

test('sanitize removes comments and CDATA', () => {
  const out = d.sanitizeMotif('<!-- c --><g><![CDATA[x]]><circle r="1"/></g>', 'p');
  assert.ok(!out.includes('<!--'));
  assert.ok(!out.includes('CDATA'));
  assert.ok(out.includes('<circle r="1"/>'));
});

test('wrapSvg adds the house-style template', () => {
  const svg = d.wrapSvg('<g/>');
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510 200"'));
  for (const s of ['#153266', '#0a1628', 'id="tpl-bg"', 'id="tpl-glow"']) assert.ok(svg.includes(s), s);
  assert.ok(svg.endsWith('</svg>\n'));
});

test('renderSvg rejects output of 8192 bytes or more', () => {
  const big = '<g>' + '<circle cx="100" cy="100" r="5" fill="#fff"/>'.repeat(400) + '</g>';
  assert.equal(d.renderSvg(big, 'p'), null);
  assert.ok(d.renderSvg('<g><circle r="5"/></g>', 'p').includes('<circle r="5"/>'));
});

test('imagePaths derives file and url from the post path', () => {
  assert.deepEqual(d.imagePaths('content/aktuelles/2026-11-04-foo.md'), {
    file: 'static/images/news/gezeichnet/2026-11-04-foo.svg',
    url: '/images/news/gezeichnet/2026-11-04-foo.svg',
  });
});

test('addImageToFrontMatter inserts once', () => {
  const md = '---\ntitle: "A"\n---\n\nBody\n';
  const want = '---\ntitle: "A"\nimage: "/x.svg"\n---\n\nBody\n';
  assert.equal(d.addImageToFrontMatter(md, '/x.svg'), want);
  assert.equal(d.addImageToFrontMatter(want, '/x.svg'), want);
});

test('addPrRows inserts rows before the footer', () => {
  assert.equal(d.addPrRows('T\n| a |\n\n---\nfooter', ['| b |']), 'T\n| a |\n| b |\n\n---\nfooter');
});

test('buildDrawRequest targets Sonnet with prompt and examples', () => {
  const req = d.buildDrawRequest({ title: 'Sommerfest', description: 'Grillen am Platz', body: 'Text' },
    'SYSTEM', ['<g>a</g>', '<g>b</g>']);
  assert.equal(req.model, 'claude-sonnet-5-5');
  assert.equal(d.DRAW_MODEL, 'claude-sonnet-5-5');
  assert.ok(req.system.startsWith('SYSTEM'));
  assert.equal(req.system.match(/<example>/g).length, 2);
  assert.ok(req.messages[0].content.includes('Sommerfest'));
  assert.ok(req.messages[0].content.includes('Grillen am Platz'));
});

test('buildDrawRequest truncates long bodies', () => {
  const req = d.buildDrawRequest({ title: 'T', description: 'D', body: 'x'.repeat(10000) }, 'S', []);
  assert.ok(req.messages[0].content.split('x').length - 1 <= 3000);
  assert.ok(!req.system.includes('<example>'));
});

test('sanitize drops duplicate attributes', () => {
  const out = d.sanitizeMotif('<g><rect fill="#fff" fill="#000" width="1"/></g>', 'p');
  assert.equal(out.match(/fill=/g).length, 1);
});

test('sanitize drops values containing <', () => {
  const out = d.sanitizeMotif('<g><path d="M0 0 < 1" fill="#fff"/></g>', 'p');
  assert.ok(!out.includes('<  1') && !out.includes('M0 0 <'));
});

test('extractMotif keeps defs placed before the group', () => {
  const m = d.extractMotif('<defs><linearGradient id="a"/></defs><g><rect fill="url(#a)"/></g>');
  assert.ok(m.includes('linearGradient') && m.includes('<rect'));
  assert.ok(d.sanitizeMotif(m, 'p').includes('id="p-a"'));
});

test('extractMotif skips a <g> mentioned in prose', () => {
  assert.equal(d.extractMotif('Here is the <g> element:\n<g><circle r="2"/></g>'), '<g><circle r="2"/></g>');
});
