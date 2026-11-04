// Writes the draw nodes into doc/specs/n8n-mail-to-homepage.json (idempotent).
// After changing src/ or the prompt: run this, then paste the jsCode of
// "Bild-Auftraege" and "Bilder einfuegen" into the live n8n workflow.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '../../..');
const WORKFLOW = path.join(ROOT, 'doc/specs/n8n-mail-to-homepage.json');
const PROMPT = path.join(ROOT, 'doc/specs/n8n-mail-to-homepage-draw-prompt.md');
const EXAMPLE_MOTIFS = ['2026-09-13-rewe-scheine-fuer-vereine', '2026-08-21-schleifchenturnier-details',
  '2026-04-27-platzoeffnung-2026'];
const read = (p) => fs.readFileSync(p, 'utf8');

function buildJsCode(nodeName) {
  const draw = read(path.join(__dirname, '../src/draw.js'));
  if (nodeName === 'Bild-Auftraege') {
    const examples = EXAMPLE_MOTIFS.map((b) => read(path.join(__dirname, '../motifs', b + '.g.svg')));
    return draw + '\nvar SYSTEM_PROMPT = ' + JSON.stringify(read(PROMPT).trim()) + ';\nvar EXAMPLES = ' +
      JSON.stringify(examples) + ';\n\n' + read(path.join(__dirname, '../src/n8n-auftraege.js'));
  }
  if (nodeName === 'Bilder einfuegen') return draw + '\n' + read(path.join(__dirname, '../src/n8n-einfuegen.js'));
  throw new Error('unknown node ' + nodeName);
}

const ANTHROPIC_CREDENTIAL = { anthropicApi: { id: 'bfPeI9Ato8OfI8mv', name: 'Anthropic account' } };

function drawNodes() {
  return [
    { parameters: { jsCode: buildJsCode('Bild-Auftraege') }, id: 'bild-auftraege', name: 'Bild-Auftraege',
      type: 'n8n-nodes-base.code', typeVersion: 2, position: [1190, 200] },
    { parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ id: 'needs-image', leftValue: '={{ !$json.skip }}', rightValue: '',
          operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } },
      id: 'bild-noetig', name: 'Bild noetig?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [1410, 200] },
    { parameters: { method: 'POST', url: 'https://api.anthropic.com/v1/messages',
        authentication: 'predefinedCredentialType', nodeCredentialType: 'anthropicApi',
        sendHeaders: true, headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }] },
        sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.request) }}',
        options: { timeout: 300000 } },
      id: 'bild-zeichnen', name: 'Bild zeichnen', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
      position: [1630, 100], retryOnFail: true, maxTries: 2, onError: 'continueRegularOutput',
      credentials: ANTHROPIC_CREDENTIAL },
    { parameters: { jsCode: buildJsCode('Bilder einfuegen') }, id: 'bilder-einfuegen', name: 'Bilder einfuegen',
      type: 'n8n-nodes-base.code', typeVersion: 2, position: [1850, 200] },
  ];
}

const link = (node) => [{ node, type: 'main', index: 0 }];

function syncWorkflow(wf) {
  for (const node of drawNodes()) {
    const i = wf.nodes.findIndex((n) => n.name === node.name);
    if (i === -1) wf.nodes.push(node); else wf.nodes[i] = node;
  }
  Object.assign(wf.connections, {
    'Antwort verarbeiten': { main: [link('Bild-Auftraege')] },
    'Bild-Auftraege': { main: [link('Bild noetig?')] },
    'Bild noetig?': { main: [link('Bild zeichnen'), link('Bilder einfuegen')] },
    'Bild zeichnen': { main: [link('Bilder einfuegen')] },
    'Bilder einfuegen': { main: [link('Termine laden')] },
  });
  const merge = wf.nodes.find((n) => n.name === 'Termine zusammenfuehren');
  merge.parameters.jsCode = merge.parameters.jsCode.replace("$('Antwort verarbeiten')", "$('Bilder einfuegen')");
  return wf;
}

if (require.main === module) {
  fs.writeFileSync(WORKFLOW, JSON.stringify(syncWorkflow(JSON.parse(read(WORKFLOW))), null, 2) + '\n');
  console.log('updated doc/specs/n8n-mail-to-homepage.json');
}

module.exports = { buildJsCode, syncWorkflow };
