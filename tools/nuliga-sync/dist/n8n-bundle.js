// Bundled nuliga-sync logic for n8n Code nodes.
// DO NOT EDIT — regenerate with `npm run bundle`.
//
// Required n8n env: NODE_FUNCTION_ALLOW_EXTERNAL=cheerio,js-yaml
// At top of your n8n Code node, add:
//   const cheerio = require("cheerio");
//   const yaml = require("js-yaml");

// ── normalize.js ──
function normalizeOpponent(raw) {
  if (!raw) return '';
  let s = raw.toLowerCase().trim();
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  s = s.replace(/\s*e\.v\.?\s*/g, ' ');
  s = s.replace(/\s+1$/, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ── parser.js ──
const DATE_TIME_RE = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}:\d{2})/;

function parseDateTimeCell(text) {
  const m = text.match(DATE_TIME_RE);
  if (!m) return null;
  const [, d, mo, y, time] = m;
  return { date: `${y}-${mo}-${d}`, time };
}

function findScheduleTable($) {
  // liga.nu pages have multiple .result-set tables; the schedule is preceded by an <h2>Spielplan</h2>.
  const tables = $('table.result-set').toArray();
  for (const t of tables) {
    const headers = $(t).find('th').map((_, th) => $(th).text().trim()).get();
    if (headers.some(h => /Heimmannschaft/i.test(h))) return t;
  }
  return null;
}

function parseGroupPage(html) {
  const $ = cheerio.load(html);
  const table = findScheduleTable($);
  if (!table) throw new Error('No schedule table found — liga.nu layout may have changed');

  const matches = [];
  let currentDateTime = null;

  $(table).find('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length === 0) return;

    const cellTexts = cells.toArray().map(td => $(td).text().trim());
    const dateTimeCell = cellTexts.find(t => DATE_TIME_RE.test(t));
    if (dateTimeCell) {
      currentDateTime = parseDateTimeCell(dateTimeCell);
    }

    const teamLinks = $(row).find('a[href*="teamPortrait"]');
    if (teamLinks.length < 2 || !currentDateTime) return;

    const home = $(teamLinks[0]).text().trim();
    const guest = $(teamLinks[1]).text().trim();
    if (!home || !guest) return;

    if (!home.includes('Attendorn') && !guest.includes('Attendorn')) return;

    // Matches cell: first td.center after the guest team cell. Empty (&nbsp;) until played.
    const guestCell = $(teamLinks[1]).closest('td');
    const matchesCellText = guestCell.nextAll('td.center').first().text();
    const result = matchesCellText.match(/\d+:\d+/)?.[0] ?? null;

    matches.push({
      date: currentDateTime.date,
      time: currentDateTime.time,
      home,
      guest,
      result,
    });
  });

  // Empty matches is a legitimate state (e.g. precautionary Nebenrunde group
  // where TC BW Attendorn hasn't been seeded yet). Distinguish from "no table at all".
  if (matches.length === 0) {
    return { team_name: null, matches: [] };
  }

  const first = matches[0];
  const team_name = first.home.includes('Attendorn') ? first.home : first.guest;

  return { team_name, matches };
}

// ── mdReader.js ──
function parseGermanDate(s) {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function stripBold(s) {
  return s.replace(/\*\*/g, '').trim();
}

function readMannschaftMd(content) {
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

// ── mdWriter.js ──
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

function writeMannschaftMd({ frontmatter, body, matches }) {
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

// ── diff.js ──
function getIdentity(match) {
  const isHome = match.home.includes('Attendorn');
  const opponent = isHome ? match.guest : match.home;
  return `${normalizeOpponent(opponent)}|${isHome ? 'H' : 'A'}`;
}

function diffMatches(existing, liga) {
  const existingByIdentity = new Map(existing.map(m => [getIdentity(m), m]));
  const ligaByIdentity = new Map(liga.map(m => [getIdentity(m), m]));

  const updates = [];
  const adds = [];
  const missings = [];

  for (const [id, ligaMatch] of ligaByIdentity) {
    const existingMatch = existingByIdentity.get(id);
    if (!existingMatch) {
      adds.push({ ...ligaMatch });
      continue;
    }
    const dateOrTimeChanged =
      existingMatch.date !== ligaMatch.date || existingMatch.time !== ligaMatch.time;
    // liga.nu null never overwrites a manually entered MD result — preserves human edits
    // and avoids result loss if liga.nu temporarily drops the score (parser hiccup, layout change).
    const resultChanged =
      ligaMatch.result != null && existingMatch.result !== ligaMatch.result;
    if (dateOrTimeChanged || resultChanged) {
      updates.push({
        identity: id,
        oldDate: existingMatch.date,
        oldTime: existingMatch.time,
        oldResult: existingMatch.result ?? null,
        newDate: ligaMatch.date,
        newTime: ligaMatch.time,
        newResult: resultChanged ? ligaMatch.result : (existingMatch.result ?? null),
        home: ligaMatch.home,
        guest: ligaMatch.guest,
      });
    }
  }

  for (const [id, existingMatch] of existingByIdentity) {
    if (!ligaByIdentity.has(id)) {
      missings.push({ ...existingMatch });
    }
  }

  return { updates, adds, missings };
}

function isEmptyChangeSet(cs) {
  return cs.updates.length === 0 && cs.adds.length === 0 && cs.missings.length === 0;
}

// ── termineUpdater.js ──
const LEAGUE_LABELS = {
  'herren-30': 'Kreisliga',
  'herren-40': 'Südwestfalenliga',
  'herren-60': 'Bezirksliga',
  'damen-6er': 'Bezirksliga',
  'gemischt-1': 'Bezirksklasse',
  'gemischt-2': 'Kreisklasse',
  'mixed-u12': 'Kreisklasse',
};

const TEAM_TITLES = {
  'herren-30': 'Herren 30',
  'herren-40': 'Herren 40',
  'herren-60': 'Herren 60',
  'damen-6er': 'Damen',
  'gemischt-1': 'Gemischt 1',
  'gemischt-2': 'Gemischt 2',
  'mixed-u12': 'Mixed U12',
};

function detailFor(team) {
  return `${LEAGUE_LABELS[team] ?? 'Liga'}, Heimspiel`;
}

function titleFor(team, opponent) {
  return `${TEAM_TITLES[team] ?? team} vs. ${opponent}`;
}

function toDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`);
}

function isDateLike(v) {
  // Cross-realm-safe Date detection — `instanceof Date` fails inside the
  // n8n runner sandbox because js-yaml returns Date instances from a different
  // realm. Duck-type check on `toISOString` works regardless of realm.
  return v != null && typeof v.toISOString === 'function';
}

function sameOpponent(a, b) {
  return normalizeOpponent(a ?? '') === normalizeOpponent(b ?? '');
}

function findMedenspielIdx(events, team, opponent) {
  return events.findIndex(e =>
    e.category === 'medenspiel' &&
    e.team === team &&
    sameOpponent(e.opponent, opponent)
  );
}

function findPokalIdx(events, ligaGroup, opponent) {
  return events.findIndex(e =>
    e.category === 'pokal' &&
    e.liga_group === ligaGroup &&
    sameOpponent(e.opponent, opponent)
  );
}

function buildEventEntry(tc, addMatch) {
  if (tc.kind === 'pokal') {
    return {
      title: `${tc.teamLabel} vs. ${addMatch.opponent}`,
      date: toDate(addMatch.newDate),
      time: `${addMatch.newTime} Uhr`,
      detail: tc.pokalDetail,
      category: 'pokal',
      opponent: addMatch.opponent,
      liga_championship: tc.championship,
      liga_group: tc.ligaGroup,
    };
  }
  return {
    title: titleFor(tc.team, addMatch.opponent),
    date: toDate(addMatch.newDate),
    time: `${addMatch.newTime} Uhr`,
    detail: detailFor(tc.team),
    category: 'medenspiel',
    team: tc.team,
    opponent: addMatch.opponent,
  };
}

function applyTermineChanges(content, teamChanges) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) throw new Error('No frontmatter');
  const data = yaml.load(fmMatch[1]);
  const body = fmMatch[2];

  const events = data.events ?? [];

  for (const tc of teamChanges) {
    const findIdx = tc.kind === 'pokal'
      ? (evts, opp) => findPokalIdx(evts, tc.ligaGroup, opp)
      : (evts, opp) => findMedenspielIdx(evts, tc.team, opp);

    for (const u of tc.updates) {
      if (!u.isHome) continue;
      const idx = findIdx(events, u.opponent);
      if (idx === -1) continue;
      events[idx].date = toDate(u.newDate);
      events[idx].time = `${u.newTime} Uhr`;
    }

    for (const a of tc.adds) {
      if (!a.isHome) continue;
      if (findIdx(events, a.opponent) !== -1) continue;
      events.push(buildEventEntry(tc, a));
    }
  }

  events.sort((a, b) => {
    const ad = isDateLike(a.date) ? a.date : toDate(a.date);
    const bd = isDateLike(b.date) ? b.date : toDate(b.date);
    return ad - bd;
  });

  data.events = events;

  return `---\n${dumpTermineYaml(data)}---\n${body}`;
}

// --- Custom YAML serializer ---
// Avoids js-yaml's yaml.dump because n8n 2.x runner sandbox makes Error.name
// read-only, which crashes inside YAMLException's constructor. The serializer
// is intentionally narrow: handles only the termine.md frontmatter shape
// (top-level scalars + events list with string/Date/null fields).

function escapeDoubleQuoted(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function formatYamlValue(key, value) {
  if (value === undefined || value === null) return '~';
  if (key === 'date' && isDateLike(value)) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return `"${escapeDoubleQuoted(value)}"`;
}

function dumpTermineYaml(data) {
  const lines = [];
  for (const [key, val] of Object.entries(data)) {
    if (key === 'events') continue;
    lines.push(`${key}: ${formatYamlValue(key, val)}`);
  }
  lines.push('events:');
  const events = data.events ?? [];
  for (const e of events) {
    let first = true;
    for (const [key, val] of Object.entries(e)) {
      if (val === undefined) continue;
      const indent = first ? '  - ' : '    ';
      lines.push(`${indent}${key}: ${formatYamlValue(key, val)}`);
      first = false;
    }
  }
  return lines.join('\n') + '\n';
}

// ── prBody.js ──
function shortDate(iso) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

function bullet(s) {
  return `- ${s}`;
}

function renderPrBody(syncDate, teamChanges) {
  const lines = [`## Liga.nu Sync — ${syncDate}`, ''];

  const allUpdates = teamChanges.flatMap(tc => tc.updates.map(u => ({ ...u, teamLabel: tc.teamLabel })));
  // Split updates: a row is a "schedule change" if date or time differs, a "result change" if the
  // result newly appeared or was corrected. Combined updates appear in both sections (clearer for review).
  const scheduleUpdates = allUpdates.filter(u => u.oldDate !== u.newDate || u.oldTime !== u.newTime);
  const resultUpdates = allUpdates.filter(u => u.newResult != null && u.oldResult !== u.newResult);

  lines.push('### Geänderte Spiele');
  if (scheduleUpdates.length === 0) {
    lines.push('(keine)');
  } else {
    lines.push('| Team | Spiel | Vorher | Neu |');
    lines.push('|---|---|---|---|');
    for (const u of scheduleUpdates) {
      const where = u.isHome ? 'H' : 'A';
      const oldStr = `${shortDate(u.oldDate)} ${u.oldTime}`;
      const newStr = `${shortDate(u.newDate)} ${u.newTime}`;
      lines.push(`| ${u.teamLabel} | ${u.opponent} (${where}) | ${oldStr} | ${newStr} |`);
    }
  }
  lines.push('');

  lines.push('### Neue Ergebnisse');
  if (resultUpdates.length === 0) {
    lines.push('(keine)');
  } else {
    lines.push('| Team | Spiel | Vorher | Ergebnis |');
    lines.push('|---|---|---|---|');
    for (const u of resultUpdates) {
      const where = u.isHome ? 'H' : 'A';
      const oldStr = u.oldResult ?? '–';
      lines.push(`| ${u.teamLabel} | ${u.opponent} (${where}) | ${oldStr} | ${u.newResult} |`);
    }
  }
  lines.push('');

  lines.push('### Neue Spiele');
  const allAdds = teamChanges.flatMap(tc => tc.adds.map(a => ({ ...a, teamLabel: tc.teamLabel })));
  if (allAdds.length === 0) {
    lines.push('(keine)');
  } else {
    for (const a of allAdds) {
      const where = a.isHome ? 'H' : 'A';
      lines.push(bullet(`${a.teamLabel}: ${a.opponent} (${where}) am ${shortDate(a.newDate)} ${a.newTime}`));
    }
  }
  lines.push('');

  lines.push('### ⚠️ Spiele nicht mehr in liga.nu');
  const allMissings = teamChanges.flatMap(tc => tc.missings.map(m => ({ ...m, teamLabel: tc.teamLabel })));
  if (allMissings.length === 0) {
    lines.push('(keine)');
  } else {
    for (const m of allMissings) {
      const where = m.isHome ? 'H' : 'A';
      lines.push(bullet(`${m.teamLabel}: ${m.opponent} (${where}) am ${shortDate(m.date)} ${m.time}`));
    }
  }
  lines.push('');

  const allTermineUpdates = teamChanges.flatMap(tc => tc.termineUpdates ?? []);
  if (allTermineUpdates.length > 0) {
    lines.push('### Termine in /termine/_index.md mit-aktualisiert');
    for (const t of allTermineUpdates) {
      lines.push(bullet(`${t.title} (${shortDate(t.date)}) → ${t.newTime}`));
    }
  }

  return lines.join('\n');
}

// ── teams.js ──
const TEAMS = [
  { kind: 'medenspiel', slug: 'damen-6er',  file: 'content/mannschaften/damen-6er.md',  group: '2',   label: 'Damen' },
  { kind: 'medenspiel', slug: 'herren-30',  file: 'content/mannschaften/herren-30.md',  group: '67',  label: 'Herren 30' },
  { kind: 'medenspiel', slug: 'herren-40',  file: 'content/mannschaften/herren-40.md',  group: '77',  label: 'Herren 40' },
  { kind: 'medenspiel', slug: 'herren-60',  file: 'content/mannschaften/herren-60.md',  group: '109', label: 'Herren 60' },
  { kind: 'medenspiel', slug: 'gemischt-1', file: 'content/mannschaften/gemischt-1.md', group: '120', label: 'Gemischt 1' },
  { kind: 'medenspiel', slug: 'gemischt-2', file: 'content/mannschaften/gemischt-2.md', group: '129', label: 'Gemischt 2' },
  { kind: 'medenspiel', slug: 'mixed-u12',  file: 'content/mannschaften/mixed-u12.md',  group: '205', label: 'Mixed U12' },
];

// Cup teams: each logical team plays a Hauptrunde (winner branch) and, after a
// Hauptrunde loss, a Nebenrunde (loser branch). Each branch is its own liga.nu group.
const POKAL_TEAMS = [
  {
    kind: 'pokal',
    slug: 'herren-lk18-25',
    label: 'Herren-Pokal LK 18–25',
    championship: 'WTV VP 2026',
    detail: 'WTV Vereinspokal · Herren LK 18,0–25,0',
    branches: { haupt: '2229674', neben: '2236574' },
  },
  {
    kind: 'pokal',
    slug: 'herren-40',
    label: 'Herren-40-Pokal',
    championship: 'WTV VP 2026',
    detail: 'WTV Vereinspokal · Herren Ü40 LK 1,0–25,0',
    branches: { haupt: '2229754', neben: '2236634' },
  },
];

const BASE = 'https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage';

function encQuery(s) {
  return encodeURIComponent(s).replace(/%20/g, '+');
}

function liganuUrl(group, championship = 'SW 2026') {
  return `${BASE}?championship=${encQuery(championship)}&group=${encQuery(group)}`;
}

// ── pokalPath.js ──
// "TV Rönkhausen 1892 e.V. TA 1" -> "TV Rönkhausen 1892 TA"
function displayName(raw) {
  return String(raw)
    .replace(/\s+e\.V\.?/gi, '')
    .replace(/\s+1$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchOutcome(match) {
  if (!match.result) return 'open';
  const m = match.result.match(/(\d+):(\d+)/);
  if (!m) return 'open';
  const homeScore = Number(m[1]);
  const guestScore = Number(m[2]);
  const isHome = match.home.includes('Attendorn');
  const ours = isHome ? homeScore : guestScore;
  const theirs = isHome ? guestScore : homeScore;
  if (ours > theirs) return 'win';
  if (ours < theirs) return 'loss';
  return 'open'; // no draws in a cup; defensive
}

function attendornMatches(matches) {
  return matches
    .filter(m => m.home.includes('Attendorn') || m.guest.includes('Attendorn'))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function toRound(m, branch, round) {
  const isHome = m.home.includes('Attendorn');
  const opponent = isHome ? m.guest : m.home;
  return {
    branch,
    round,
    date: m.date,
    time: m.time,
    home: isHome,
    opponent: displayName(opponent),
    result: m.result ?? null,
    outcome: matchOutcome(m),
  };
}

/**
 * Build one cup team's path. hauptRaw/nebenRaw are the *full* parsed match lists
 * of each branch group (Attendorn filtering happens here).
 */
function buildPokalPath(team, hauptRaw, nebenRaw) {
  const haupt = attendornMatches(hauptRaw);
  const neben = attendornMatches(nebenRaw);

  const rounds = haupt.map((m, i) => toRound(m, 'haupt', i + 1));
  const lostHaupt = rounds.some(r => r.outcome === 'loss');
  if (lostHaupt && neben.length) {
    neben.forEach((m, i) => rounds.push(toRound(m, 'neben', i + 1)));
  }

  const activeGroup = (lostHaupt && neben.length) ? team.branches.neben : team.branches.haupt;
  return {
    slug: team.slug,
    label: team.label,
    detail: team.detail,
    liga_url: liganuUrl(activeGroup, team.championship),
    rounds,
  };
}

// ── pokalData.js ──
function q(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Narrow serializer for the data/pokal.yaml shape. Avoids yaml.dump (crashes in
// the n8n runner sandbox — see termineUpdater.js for the same reason).
function renderPokalYaml(paths) {
  const lines = ['teams:'];
  for (const t of paths) {
    lines.push(`  - slug: ${q(t.slug)}`);
    lines.push(`    label: ${q(t.label)}`);
    lines.push(`    detail: ${q(t.detail)}`);
    lines.push(`    liga_url: ${q(t.liga_url)}`);
    lines.push('    rounds:');
    for (const r of t.rounds) {
      lines.push(`      - branch: ${r.branch}`);
      lines.push(`        round: ${r.round}`);
      lines.push(`        date: ${r.date}`);
      lines.push(`        time: ${q(r.time)}`);
      lines.push(`        home: ${r.home}`);
      lines.push(`        opponent: ${q(r.opponent)}`);
      lines.push(`        result: ${r.result == null ? '~' : q(r.result)}`);
      lines.push(`        outcome: ${r.outcome}`);
    }
  }
  return lines.join('\n') + '\n';
}

function parsePokalYaml(text) {
  if (!text || !text.trim()) return [];
  const data = yaml.load(text);
  return (data && data.teams) ? data.teams : [];
}

function isoToGerman(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Emit a result event for every round in newPaths that has a score which was
 * absent before (open->scored, or a brand-new already-scored round).
 * labelBySlug maps a team slug to its display label.
 */
function collectNewResults(oldPaths, newPaths, labelBySlug) {
  const oldByKey = new Map();
  for (const t of oldPaths) {
    for (const r of t.rounds ?? []) {
      oldByKey.set(`${t.slug}|${r.branch}|${r.round}`, r.result ?? null);
    }
  }
  const events = [];
  for (const t of newPaths) {
    for (const r of t.rounds ?? []) {
      if (r.result == null) continue;
      const prev = oldByKey.get(`${t.slug}|${r.branch}|${r.round}`);
      if (prev == null || prev !== r.result) {
        events.push({
          team: labelBySlug[t.slug] ?? t.label,
          opponent: r.opponent,
          date: isoToGerman(r.date),
          time: r.time,
          result: r.result,
          isHome: r.home,
        });
      }
    }
  }
  return events;
}

// ── syncRunner.js ──
const TERMINE_PATH = 'content/termine/_index.md';
const POKAL_DATA_PATH = 'data/pokal.yaml';

function pad(n) {
  return String(n).padStart(2, '0');
}

function timestampBranchName(d = new Date()) {
  return `nuliga-sync/${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

function isoToday(d = new Date()) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function isDateLike(v) {
  return v != null && typeof v.toISOString === 'function';
}

function pokalExistingFromTermine(events, ligaGroup) {
  return events
    .filter(e => e.category === 'pokal' && e.liga_group === ligaGroup)
    .map(e => ({
      date: isDateLike(e.date) ? e.date.toISOString().slice(0, 10) : String(e.date),
      time: String(e.time).replace(/\s*Uhr\s*$/, ''),
      home: 'TC Blau-Weiß Attendorn 1',
      guest: e.opponent,
    }));
}

function buildTermineUpdateEntries(tc, events) {
  const out = [];
  for (const u of tc.updates) {
    if (!u.isHome) continue;
    const match = events.find(e =>
      e.category === 'medenspiel' &&
      e.team === tc.team &&
      normalizeOpponent(e.opponent ?? '') === normalizeOpponent(u.opponent),
    );
    if (match) out.push({ title: match.title, date: u.newDate, newTime: u.newTime });
  }
  return out;
}

function decorateTeamChange(tc, team, events) {
  const updates = tc.updates.map(u => ({
    ...u,
    opponent: opponentFromMatch(u),
    isHome: u.home?.includes('Attendorn') ?? Boolean(u.isHome),
  }));
  const adds = tc.adds.map(a => ({
    ...a,
    opponent: opponentFromMatch(a),
    isHome: a.home?.includes('Attendorn') ?? Boolean(a.isHome),
    newDate: a.date,
    newTime: a.time,
  }));
  const missings = tc.missings.map(m => ({
    ...m,
    opponent: opponentFromMatch(m),
    isHome: m.home?.includes('Attendorn') ?? Boolean(m.isHome),
  }));
  const termineUpdates = team.kind === 'medenspiel'
    ? buildTermineUpdateEntries({ team: team.slug, updates }, events)
    : [];
  return {
    kind: team.kind,
    team: team.slug,
    teamLabel: team.label,
    ligaGroup: team.group,
    championship: team.championship,
    pokalDetail: team.pokalDetail,
    updates,
    adds,
    missings,
    termineUpdates,
  };
}

function opponentFromMatch(m) {
  if (m.opponent) return m.opponent;
  const isHome = m.home?.includes('Attendorn');
  return isHome ? m.guest : m.home;
}

async function readRepoFileSafe(readRepoFile, path) {
  try {
    return await readRepoFile(path);
  } catch {
    return '';
  }
}

async function runSync({ fetchImpl, readRepoFile, today = new Date() }) {
  const teamReports = [];
  const errors = [];

  const termineMd = await readRepoFile(TERMINE_PATH);
  const termineFmMatch = termineMd.match(/^---\n([\s\S]*?)\n---/);
  const termineEvents = termineFmMatch
    ? yaml.load(termineFmMatch[1]).events ?? []
    : [];

  // --- Medenspiel teams (one group each) ---
  for (const team of TEAMS) {
    try {
      const url = liganuUrl(team.group, team.championship ?? 'SW 2026');
      const res = await fetchImpl(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const liga = parseGroupPage(await res.text());

      const existingMd = await readRepoFile(team.file);
      const { matches: existing, frontmatter, body } = readMannschaftMd(existingMd);
      const cs = diffMatches(existing, liga.matches);
      teamReports.push({ team, cs, existingMd, frontmatter, body, existingMatches: existing, ligaMatches: liga.matches });
    } catch (err) {
      errors.push({ team: team.slug, error: err.message });
    }
  }

  // --- Cup teams (haupt + neben group each) ---
  const pokalPaths = [];
  const labelBySlug = {};
  for (const pt of POKAL_TEAMS) {
    try {
      const branchMatches = {};
      for (const [branchName, groupId] of Object.entries(pt.branches)) {
        const res = await fetchImpl(liganuUrl(groupId, pt.championship));
        if (!res.ok) throw new Error(`HTTP ${res.status} (${branchName})`);
        branchMatches[branchName] = parseGroupPage(await res.text()).matches;

        // Termine home announcements for this branch: only UPCOMING (unplayed)
        // home games. A played home game (has a result) belongs to the bracket,
        // not the announcements list. Termine has no result field anyway.
        const home = branchMatches[branchName].filter(m => m.home.includes('Attendorn') && !m.result);
        if (home.length) {
          const existing = pokalExistingFromTermine(termineEvents, groupId);
          const cs = diffMatches(existing, home);
          cs.updates = cs.updates.filter(u => u.oldDate !== u.newDate || u.oldTime !== u.newTime);
          cs.missings = []; // played games drop out of `home`; don't churn termine — display filters past dates
          const termineTeam = {
            kind: 'pokal',
            slug: `${pt.slug}-${branchName}`,
            label: pt.label,
            group: groupId,
            championship: pt.championship,
            pokalDetail: pt.detail,
          };
          teamReports.push({ team: termineTeam, cs, existingMatches: existing, ligaMatches: home });
        }
      }

      pokalPaths.push(buildPokalPath(pt, branchMatches.haupt ?? [], branchMatches.neben ?? []));
      labelBySlug[pt.slug] = pt.label;
    } catch (err) {
      errors.push({ team: pt.slug, error: err.message });
    }
  }

  const decorated = teamReports.map(r => decorateTeamChange(r.cs, r.team, termineEvents));
  const termineHasChanges = decorated.some(d => d.updates.length || d.adds.length || d.missings.length);

  const oldPokalRaw = await readRepoFileSafe(readRepoFile, POKAL_DATA_PATH);
  const newPokalRaw = pokalPaths.length ? renderPokalYaml(pokalPaths) : oldPokalRaw;
  const pokalChanged = pokalPaths.length > 0 && newPokalRaw !== oldPokalRaw;
  const pokalNewResults = pokalPaths.length
    ? collectNewResults(parsePokalYaml(oldPokalRaw), pokalPaths, labelBySlug)
    : [];

  const hasChanges = termineHasChanges || pokalChanged;
  if (!hasChanges) {
    return { changed: false, errors, fileChanges: [], prBody: null, newResults: pokalNewResults };
  }

  const fileChanges = [];

  for (const report of teamReports) {
    if (isEmptyChangeSet(report.cs)) continue;
    if (report.team.kind === 'pokal') continue; // pokal touches only termine + data/pokal.yaml

    const nextMatches = [...report.existingMatches];
    for (const u of report.cs.updates) {
      const identity = getIdentityLocal(u);
      const idx = nextMatches.findIndex(m => getIdentityLocal(m) === identity);
      if (idx !== -1) {
        nextMatches[idx] = { ...nextMatches[idx], date: u.newDate, time: u.newTime, result: u.newResult ?? nextMatches[idx].result };
      }
    }
    for (const a of report.cs.adds) {
      nextMatches.push({ date: a.date, time: a.time, home: a.home, guest: a.guest, result: a.result ?? null });
    }

    const newMdContent = writeMannschaftMd({ frontmatter: report.frontmatter, body: report.body, matches: nextMatches });
    fileChanges.push({ path: report.team.file, content: newMdContent });
  }

  const newTermineMd = applyTermineChanges(termineMd, decorated);
  if (newTermineMd !== termineMd) {
    fileChanges.push({ path: TERMINE_PATH, content: newTermineMd });
  }

  if (pokalChanged) {
    fileChanges.push({ path: POKAL_DATA_PATH, content: newPokalRaw });
  }

  const prBody = renderPrBody(isoToday(today), decorated);
  const branch = timestampBranchName(today);
  const commitMessage = `chore(termine): liga.nu sync ${isoToday(today)}`;
  const prTitle = `[nuliga] Sync ${isoToday(today)}: ${sumChanges(decorated)}`;
  const newResults = [...extractNewResults(decorated), ...pokalNewResults];

  return { changed: true, errors, fileChanges, branch, commitMessage, prTitle, prBody, newResults };
}

function extractNewResults(decorated) {
  const items = [];
  for (const d of decorated) {
    for (const u of d.updates) {
      if (!u.oldResult && u.newResult) {
        items.push({ team: d.teamLabel, opponent: u.opponent, date: u.newDate ?? u.date, time: u.newTime ?? u.time, result: u.newResult, isHome: u.isHome });
      }
    }
    for (const a of d.adds) {
      if (a.result) {
        items.push({ team: d.teamLabel, opponent: a.opponent, date: a.newDate ?? a.date, time: a.newTime ?? a.time, result: a.result, isHome: a.isHome });
      }
    }
  }
  return items;
}

function getIdentityLocal(m) {
  const isHome = m.home?.includes('Attendorn');
  const opponent = isHome ? m.guest : m.home;
  return `${normalizeOpponent(opponent ?? '')}|${isHome ? 'H' : 'A'}`;
}

function sumChanges(decorated) {
  const u = decorated.reduce((s, d) => s + d.updates.length, 0);
  const a = decorated.reduce((s, d) => s + d.adds.length, 0);
  const m = decorated.reduce((s, d) => s + d.missings.length, 0);
  return `${u} Updates, ${a} Adds, ${m} Missing`;
}
