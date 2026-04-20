function germanDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function ensureBold(team, isOurs) {
  const stripped = team.replace(/\*\*/g, '').trim();
  return isOurs ? `**${stripped}**` : stripped;
}

function formatRow(m) {
  const homeIsOurs = m.home.includes('Attendorn');
  const guestIsOurs = m.guest.includes('Attendorn');
  const home = ensureBold(m.home, homeIsOurs);
  const guest = ensureBold(m.guest, guestIsOurs);
  const result = m.result ?? '-';
  return `| ${germanDate(m.date)} | ${m.time} | ${home} | ${guest} | ${result} |`;
}

const TABLE_HEADER = '| Datum | Uhrzeit | Heim | Gast | Ergebnis |';
const TABLE_SEP = '|-------|---------|------|------|----------|';

export function writeMannschaftMd({ frontmatter, body, matches }) {
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date));

  const lines = body.split('\n');
  const headerIdx = lines.findIndex(l => l.startsWith('| Datum '));
  if (headerIdx === -1) throw new Error('No table header found in body');
  let endIdx = headerIdx + 2;
  while (endIdx < lines.length && lines[endIdx].startsWith('|')) endIdx++;

  const newTable = [TABLE_HEADER, TABLE_SEP, ...sorted.map(formatRow)];
  const newLines = [...lines.slice(0, headerIdx), ...newTable, ...lines.slice(endIdx)];

  return `---\n${frontmatter}\n---\n${newLines.join('\n')}`;
}
