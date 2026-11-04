// --- n8n Code node "Bilder einfuegen": add drawn SVGs to files and PR body ---
// A failed or unusable drawing only costs that post its image, never the mail run.
var parsed = $('Antwort verarbeiten').first().json;
var inputs = $input.all();
if (!inputs.length || inputs[0].json.skip) return [{ json: parsed }];

var jobs = $('Bild-Auftraege').all();
var files = parsed.files.map(function (f) { return Object.assign({}, f); });
var rows = [];
jobs.forEach(function (job, i) {
  var res = inputs[i] ? inputs[i].json : {};
  // thinking blocks may precede the answer, so join all text blocks
  var text = ((res && res.content) || []).filter(function (b) { return b.type === 'text'; })
    .map(function (b) { return b.text; }).join('');
  var post = files.filter(function (f) { return f.path === job.json.postPath; })[0];
  var svg = post ? renderSvg(text, job.json.idPrefix) : null;
  if (svg) {
    var p = imagePaths(post.path);
    files.push({ path: p.file, content: svg, type: 'bild', title: post.title });
    post.content = addImageToFrontMatter(post.content, p.url);
    rows.push('| bild | `' + p.file + '` | ' + post.title + ' |');
  } else {
    rows.push('| bild | – | ' + (post ? post.title : job.json.postPath) + ' (kein Bild, Platzhalter) |');
  }
});
return [{ json: Object.assign({}, parsed, { files: files, prBody: addPrRows(parsed.prBody, rows) }) }];
