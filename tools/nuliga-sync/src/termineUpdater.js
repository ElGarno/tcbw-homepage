import yaml from 'js-yaml';
import { normalizeOpponent } from './normalize.js';

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

export function applyTermineChanges(content, teamChanges) {
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
