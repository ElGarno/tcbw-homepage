const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildJsCode, syncWorkflow } = require('../scripts/sync-n8n.js');

const post = (slug, title, type) => ({
  path: 'content/aktuelles/2026-11-05-' + slug + '.md',
  content: '---\ntitle: "' + title + '"\ndate: 2026-11-05\ndescription: "Desc ' + title + '"\ntags: []\n---\n\nBody ' + title + '\n',
  type, title,
});
const PARSED = {
  files: [post('sommerfest', 'Sommerfest', 'beitrag'), post('platz', 'Platz zu', 'quickinfo')],
  termine: [], branchName: 'mail/x', mailDate: '2026-11-05', subject: 's',
  prBody: '## Neue Inhalte\n\n| Typ | Datei | Titel |\n|-----|-------|-------|\n| beitrag | `a` | Sommerfest |\n| quickinfo | `b` | Platz zu |\n\n---\nAutomatisch erstellt aus Mail vom 2026-11-05',
  stats: { beitraege: 1, quickinfos: 1, termine: 0 },
};

function run(nodeName, nodes, input) {
  const $ = (name) => ({
    first: () => ({ json: nodes[name] }),
    all: () => (Array.isArray(nodes[name]) ? nodes[name] : [{ json: nodes[name] }]),
  });
  const $input = { all: () => input || [] };
  return new Function('$', '$input', buildJsCode(nodeName))($, $input);
}

const auftraege = (parsed) => run('Bild-Auftraege', { 'Antwort verarbeiten': parsed });
const einfuegen = (parsed, jobs, responses) =>
  run('Bilder einfuegen', { 'Antwort verarbeiten': parsed, 'Bild-Auftraege': jobs }, responses)[0].json;
const ok = { json: { content: [{ type: 'text', text: '<g><circle cx="255" cy="100" r="9" fill="#fff"/></g>' }] } };

test('Bild-Auftraege emits one draw job per post', () => {
  const jobs = auftraege(PARSED);
  assert.equal(jobs.length, 2);
  assert.notEqual(jobs[0].json.idPrefix, jobs[1].json.idPrefix);
  assert.equal(jobs[0].json.request.model, 'claude-sonnet-5-5');
  assert.ok(jobs[0].json.request.messages[0].content.includes('Desc Sommerfest'));
  assert.ok(jobs[0].json.request.system.includes('<example>'));
});

test('Bild-Auftraege skips when there are no posts', () => {
  assert.deepEqual(auftraege({ ...PARSED, files: [] }), [{ json: { skip: true } }]);
});

test('Bilder einfuegen adds SVGs, image lines and PR rows', () => {
  const out = einfuegen(PARSED, auftraege(PARSED), [ok, ok]);
  assert.equal(out.files.length, 4);
  for (const f of out.files.slice(0, 2)) assert.match(f.content, /\nimage: "\/images\/news\/gezeichnet\/2026-11-05-[a-z]+\.svg"\n---/);
  assert.ok(out.files[2].path.startsWith('static/images/news/gezeichnet/'));
  assert.ok(out.files[2].content.includes('id="tpl-bg"'));
  assert.equal((out.prBody.split('\n---\n')[0].match(/\| bild \|/g) || []).length, 2);
  assert.equal(PARSED.files[0].content.includes('image:'), false, 'input not mutated');
});

test('Bilder einfuegen survives an API error for one post', () => {
  const out = einfuegen(PARSED, auftraege(PARSED), [{ json: { error: { message: 'timeout' } } }, ok]);
  assert.equal(out.files.length, 3);
  assert.ok(!out.files[0].content.includes('image:'));
  assert.ok(out.files[1].content.includes('image:'));
  assert.ok(out.prBody.includes('Sommerfest (kein Bild, Platzhalter)'));
});

test('Bilder einfuegen passes data through on skip', () => {
  const out = einfuegen({ ...PARSED, files: [] }, [{ json: { skip: true } }], [{ json: { skip: true } }]);
  assert.deepEqual(out, { ...PARSED, files: [] });
});

test('syncWorkflow wires the draw nodes idempotently', () => {
  const src = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../doc/specs/n8n-mail-to-homepage.json'), 'utf8'));
  const once = syncWorkflow(JSON.parse(JSON.stringify(src)));
  const names = once.nodes.map((n) => n.name);
  for (const n of ['Bild-Auftraege', 'Bild noetig?', 'Bild zeichnen', 'Bilder einfuegen']) assert.ok(names.includes(n), n);
  const c = once.connections;
  assert.deepEqual(c['Antwort verarbeiten'].main, [[{ node: 'Bild-Auftraege', type: 'main', index: 0 }]]);
  assert.deepEqual(c['Bilder einfuegen'].main, [[{ node: 'Termine laden', type: 'main', index: 0 }]]);
  assert.equal(c['Bild noetig?'].main[0][0].node, 'Bild zeichnen');
  assert.equal(c['Bild noetig?'].main[1][0].node, 'Bilder einfuegen');
  const merge = once.nodes.find((n) => n.name === 'Termine zusammenfuehren').parameters.jsCode;
  assert.ok(merge.includes("$('Bilder einfuegen')"));
  assert.ok(!merge.includes("$('Antwort verarbeiten')"));
  assert.deepEqual(syncWorkflow(JSON.parse(JSON.stringify(once))), once);
});
