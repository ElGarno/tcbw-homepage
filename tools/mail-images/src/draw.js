// Drawn post images: house-style SVG template, allow-list sanitiser and text helpers.
// Plain script without require/import: its source is pasted verbatim into n8n Code nodes
// (see scripts/sync-n8n.js), and module.exports is only used by the Node tests.

var ALLOWED_ELEMENTS = ['g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
  'linearGradient', 'radialGradient', 'stop', 'defs'];

var ALLOWED_ATTRIBUTES = ['id', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'x', 'y', 'x1', 'y1',
  'x2', 'y2', 'width', 'height', 'points', 'fill', 'fill-opacity', 'fill-rule', 'stroke',
  'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-dasharray',
  'opacity', 'transform', 'offset', 'stop-color', 'stop-opacity', 'gradientUnits',
  'gradientTransform'];

var MAX_SVG_LENGTH = 8192;
var DRAW_MODEL = 'claude-sonnet-5-5';
var MAX_BODY_CHARS = 3000;

var TEMPLATE_HEAD =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510 200" width="510" height="200">\n' +
  '<defs>' +
  '<linearGradient id="tpl-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#153266"/><stop offset="1" stop-color="#0a1628"/></linearGradient>' +
  '<radialGradient id="tpl-glow" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#3a7bd5" stop-opacity=".45"/><stop offset="1" stop-color="#3a7bd5" stop-opacity="0"/></radialGradient>' +
  '</defs>\n' +
  '<rect width="510" height="200" fill="url(#tpl-bg)"/>\n' +
  '<g stroke="#fff" stroke-opacity=".12" stroke-width="2" fill="none"><rect x="60" y="25" width="390" height="150"/><path d="M255 25 V175 M60 45 H450 M60 155 H450 M157 45 V155 M352 45 V155 M157 100 H352"/></g>\n' +
  '<ellipse cx="255" cy="110" rx="170" ry="90" fill="url(#tpl-glow)"/>\n';

// Returns the outermost <g>...</g> from model output (prose and code fences ignored).
function extractMotif(text) {
  if (!text) return null;
  var re = /<(\/?)g(?=[\s>\/])[^>]*?(\/?)>/g;
  var start = -1, depth = 0, m;
  while ((m = re.exec(text)) !== null) {
    var closing = m[1] === '/', selfClosing = m[2] === '/';
    if (start === -1) {
      if (closing) continue;
      start = m.index;
      if (selfClosing) return m[0];
      depth = 1;
      continue;
    }
    if (selfClosing) continue;
    depth += closing ? -1 : 1;
    if (depth === 0) return text.slice(start, re.lastIndex);
  }
  return null;
}

function cleanAttributes(raw, idPrefix) {
  var out = [];
  var re = /([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, m;
  while ((m = re.exec(raw)) !== null) {
    var name = m[1], value = m[2] !== undefined ? m[2] : m[3];
    if (ALLOWED_ATTRIBUTES.indexOf(name) === -1) continue;
    if (/["&]/.test(value)) continue;
    if (name === 'id') {
      if (!/^[A-Za-z0-9_-]+$/.test(value)) continue;
      value = idPrefix + '-' + value;
    } else if (value.indexOf('url(') !== -1) {
      var local = /^url\(#([A-Za-z0-9_-]+)\)$/.exec(value.trim());
      if (!local) continue;
      value = 'url(#' + idPrefix + '-' + local[1] + ')';
    }
    out.push(name + '="' + value + '"');
  }
  return out.length ? ' ' + out.join(' ') : '';
}

// Rebuilds markup from allow-listed elements/attributes only. Text nodes are dropped
// (motifs have none). Returns null for empty or unbalanced input.
function sanitizeMotif(markup, idPrefix) {
  if (!markup || !markup.trim()) return null;
  var src = markup
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<![^>]*>/g, '');
  var re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(\/?)>/g;
  var stack = [], dropDepth = 0, out = '', m;
  while ((m = re.exec(src)) !== null) {
    var closing = m[1] === '/', name = m[2], selfClosing = m[4] === '/';
    var allowed = ALLOWED_ELEMENTS.indexOf(name) !== -1;
    if (closing) {
      if (!stack.length || stack[stack.length - 1] !== name) return null;
      stack.pop();
      if (dropDepth > 0) { dropDepth--; continue; }
      out += '</' + name + '>';
      continue;
    }
    if (dropDepth > 0 || !allowed) {
      if (!selfClosing) { stack.push(name); dropDepth++; }
      continue;
    }
    var attrs = cleanAttributes(m[3], idPrefix);
    if (selfClosing) {
      out += '<' + name + attrs + '/>';
    } else {
      stack.push(name);
      out += '<' + name + attrs + '>';
    }
  }
  if (stack.length) return null;
  return out ? out : null;
}

function wrapSvg(motif) {
  return TEMPLATE_HEAD + motif + '\n</svg>\n';
}

function renderSvg(rawText, idPrefix) {
  var motif = sanitizeMotif(extractMotif(rawText), idPrefix);
  if (!motif) return null;
  var svg = wrapSvg(motif);
  // shortcut: counts UTF-16 units, not bytes; sanitized output is ASCII in practice
  return svg.length < MAX_SVG_LENGTH ? svg : null;
}

function imagePaths(postPath) {
  var base = postPath.split('/').pop().replace(/\.md$/, '');
  return {
    file: 'static/images/news/gezeichnet/' + base + '.svg',
    url: '/images/news/gezeichnet/' + base + '.svg',
  };
}

function addImageToFrontMatter(md, url) {
  var end = md.indexOf('\n---', 3);
  if (!md.startsWith('---') || end === -1) return md;
  if (/^image:/m.test(md.slice(0, end))) return md;
  return md.slice(0, end) + '\nimage: "' + url + '"' + md.slice(end);
}

function addPrRows(prBody, rows) {
  var idx = prBody.lastIndexOf('\n\n---\n');
  if (idx === -1) return prBody + '\n' + rows.join('\n');
  return prBody.slice(0, idx) + '\n' + rows.join('\n') + prBody.slice(idx);
}

// Anthropic Messages API request body for one post.
function buildDrawRequest(post, systemPrompt, examples) {
  var system = systemPrompt + (examples || []).map(function (e) {
    return '\n\n<example>\n' + e.trim() + '\n</example>';
  }).join('');
  var content = 'Title: ' + (post.title || '') + '\nDescription: ' + (post.description || '') +
    '\n\n' + String(post.body || '').slice(0, MAX_BODY_CHARS);
  return {
    model: DRAW_MODEL,
    max_tokens: 4000,
    system: system,
    messages: [{ role: 'user', content: content }],
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    ALLOWED_ELEMENTS: ALLOWED_ELEMENTS, ALLOWED_ATTRIBUTES: ALLOWED_ATTRIBUTES,
    extractMotif: extractMotif, sanitizeMotif: sanitizeMotif, wrapSvg: wrapSvg,
    renderSvg: renderSvg, imagePaths: imagePaths,
    addImageToFrontMatter: addImageToFrontMatter, addPrRows: addPrRows,
    buildDrawRequest: buildDrawRequest, DRAW_MODEL: DRAW_MODEL,
  };
}
