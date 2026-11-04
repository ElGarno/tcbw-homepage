// --- n8n Code node "Bild-Auftraege": one draw job per generated post ---
var parsed = $('Antwort verarbeiten').first().json;
var posts = parsed.files.filter(function (f) { return f.path.indexOf('content/aktuelles/') === 0; });
// Downstream IF routes this past the API call; zero items would stop the whole run
if (!posts.length) return [{ json: { skip: true } }];
return posts.map(function (f) {
  var base = f.path.split('/').pop().replace(/\.md$/, '');
  var description = (/^description: "(.*)"$/m.exec(f.content) || [])[1] || '';
  var body = f.content.replace(/^---\n[\s\S]*?\n---\n/, '');
  return {
    json: {
      postPath: f.path,
      idPrefix: 'img-' + base,
      request: buildDrawRequest({ title: f.title, description: description, body: body }, SYSTEM_PROMPT, EXAMPLES),
    },
  };
});
