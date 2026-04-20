function parseGermanDate(s) {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function stripBold(s) {
  return s.replace(/\*\*/g, '').trim();
}

export function readMannschaftMd(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) throw new Error('Missing frontmatter');
  const frontmatter = fmMatch[1];
  const body = fmMatch[2];

  const matches = [];
  for (const line of body.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 5) continue;
    const date = parseGermanDate(cells[0]);
    if (!date) continue;
    const time = cells[1].match(/(\d{2}:\d{2})/)?.[1] ?? null;
    matches.push({
      date,
      time,
      home: stripBold(cells[2]),
      guest: stripBold(cells[3]),
      result: cells[4] === '-' ? null : cells[4],
    });
  }

  return { frontmatter, body, matches };
}
