import yaml from 'js-yaml';
import { TEAMS, liganuUrl } from './teams.js';
import { parseGroupPage } from './parser.js';
import { readMannschaftMd } from './mdReader.js';
import { writeMannschaftMd } from './mdWriter.js';
import { diffMatches, isEmptyChangeSet } from './diff.js';
import { applyTermineChanges } from './termineUpdater.js';
import { renderPrBody } from './prBody.js';
import { normalizeOpponent } from './normalize.js';

const TERMINE_PATH = 'content/termine/_index.md';
const ATTENDORN_HOME_NAME = 'TC Blau-Weiß Attendorn 1';

function pad(n) {
  return String(n).padStart(2, '0');
}

function timestampBranchName(d = new Date()) {
  return `nuliga-sync/${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

function isoToday(d = new Date()) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function pokalExistingFromTermine(events, ligaGroup) {
  return events
    .filter(e => e.category === 'pokal' && e.liga_group === ligaGroup)
    .map(e => ({
      date: e.date instanceof Date
        ? e.date.toISOString().slice(0, 10)
        : String(e.date),
      time: String(e.time).replace(/\s*Uhr\s*$/, ''),
      home: ATTENDORN_HOME_NAME,
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
  // Termine cross-update only applies to medenspiel (pokal entries ARE the termine entry).
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

export async function runSync({ fetchImpl, readRepoFile, today = new Date() }) {
  const teamReports = [];
  const errors = [];

  // Read termine MD once up-front; pokal teams need it to look up existing matches.
  const termineMd = await readRepoFile(TERMINE_PATH);
  const termineFmMatch = termineMd.match(/^---\n([\s\S]*?)\n---/);
  const termineEvents = termineFmMatch
    ? yaml.load(termineFmMatch[1]).events ?? []
    : [];

  for (const team of TEAMS) {
    try {
      const url = liganuUrl(team.group, team.championship ?? 'SW 2026');
      const res = await fetchImpl(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const liga = parseGroupPage(html);

      if (team.kind === 'pokal') {
        const ligaHome = liga.matches.filter(m => m.home.includes('Attendorn'));
        const existing = pokalExistingFromTermine(termineEvents, team.group);
        const cs = diffMatches(existing, ligaHome);
        teamReports.push({ team, cs, existingMatches: existing, ligaMatches: ligaHome });
      } else {
        const existingMd = await readRepoFile(team.file);
        const { matches: existing, frontmatter, body } = readMannschaftMd(existingMd);
        const cs = diffMatches(existing, liga.matches);
        teamReports.push({ team, cs, existingMd, frontmatter, body, existingMatches: existing, ligaMatches: liga.matches });
      }
    } catch (err) {
      errors.push({ team: team.slug, error: err.message });
    }
  }

  const decorated = teamReports.map(r => decorateTeamChange(r.cs, r.team, termineEvents));

  const hasChanges = decorated.some(d => d.updates.length || d.adds.length || d.missings.length);

  if (!hasChanges) {
    return { changed: false, errors, fileChanges: [], prBody: null };
  }

  const fileChanges = [];

  for (const report of teamReports) {
    if (isEmptyChangeSet(report.cs)) continue;
    if (report.team.kind === 'pokal') continue;  // pokal touches only _index.md

    const nextMatches = [...report.existingMatches];

    for (const u of report.cs.updates) {
      const identity = getIdentityLocal(u);
      const idx = nextMatches.findIndex(m => getIdentityLocal(m) === identity);
      if (idx !== -1) {
        nextMatches[idx] = { ...nextMatches[idx], date: u.newDate, time: u.newTime };
      }
    }
    for (const a of report.cs.adds) {
      nextMatches.push({ date: a.date, time: a.time, home: a.home, guest: a.guest, result: null });
    }

    const newMdContent = writeMannschaftMd({
      frontmatter: report.frontmatter,
      body: report.body,
      matches: nextMatches,
    });
    fileChanges.push({ path: report.team.file, content: newMdContent });
  }

  const newTermineMd = applyTermineChanges(termineMd, decorated);
  if (newTermineMd !== termineMd) {
    fileChanges.push({ path: TERMINE_PATH, content: newTermineMd });
  }

  const prBody = renderPrBody(isoToday(today), decorated);
  const branch = timestampBranchName(today);
  const commitMessage = `chore(termine): liga.nu sync ${isoToday(today)}`;
  const prTitle = `[nuliga] Sync ${isoToday(today)}: ${sumChanges(decorated)}`;

  return {
    changed: true,
    errors,
    fileChanges,
    branch,
    commitMessage,
    prTitle,
    prBody,
  };
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
