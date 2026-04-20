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

export function applyTermineChanges(content, teamChanges) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) throw new Error('No frontmatter');
  const data = yaml.load(fmMatch[1]);
  const body = fmMatch[2];

  const events = data.events ?? [];

  for (const tc of teamChanges) {
    for (const u of tc.updates) {
      if (!u.isHome) continue;
      const idx = findMedenspielIdx(events, tc.team, u.opponent);
      if (idx === -1) continue;
      events[idx].date = toDate(u.newDate);
      events[idx].time = `${u.newTime} Uhr`;
    }

    for (const a of tc.adds) {
      if (!a.isHome) continue;
      if (findMedenspielIdx(events, tc.team, a.opponent) !== -1) continue;
      events.push({
        title: titleFor(tc.team, a.opponent),
        date: toDate(a.newDate),
        time: `${a.newTime} Uhr`,
        detail: detailFor(tc.team),
        category: 'medenspiel',
        team: tc.team,
        opponent: a.opponent,
      });
    }
  }

  events.sort((a, b) => {
    const ad = a.date instanceof Date ? a.date : toDate(a.date);
    const bd = b.date instanceof Date ? b.date : toDate(b.date);
    return ad - bd;
  });

  data.events = events;

  const yamlOut = yaml.dump(data, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
  });

  return `---\n${yamlOut}---\n${body}`;
}
