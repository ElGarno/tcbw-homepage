import { TEAMS, liganuUrl } from './teams.js';
import { parseGroupPage } from './parser.js';
import { readMannschaftMd } from './mdReader.js';
import { writeMannschaftMd } from './mdWriter.js';
import { diffMatches, isEmptyChangeSet } from './diff.js';
import { applyTermineChanges } from './termineUpdater.js';
import { renderPrBody } from './prBody.js';
import { normalizeOpponent } from './normalize.js';

const TERMINE_PATH = 'content/termine/_index.md';

function pad(n) {
  return String(n).padStart(2, '0');
}

function timestampBranchName(d = new Date()) {
  return `nuliga-sync/${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

function isoToday(d = new Date()) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
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

function decorateTeamChange(tc, teamLabel, events) {
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
  const termineUpdates = buildTermineUpdateEntries(
    { team: tc.team, updates },
    events,
  );
  return { team: tc.team, teamLabel, updates, adds, missings, termineUpdates };
}

function opponentFromMatch(m) {
  if (m.opponent) return m.opponent;
  const isHome = m.home?.includes('Attendorn');
  return isHome ? m.guest : m.home;
}

export async function runSync({ fetchImpl, readRepoFile, today = new Date() }) {
  const teamReports = [];
  const errors = [];

  for (const team of TEAMS) {
    try {
      const res = await fetchImpl(liganuUrl(team.group));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const liga = parseGroupPage(html);

      const existingMd = await readRepoFile(team.file);
      const { matches: existing, frontmatter, body } = readMannschaftMd(existingMd);

      const cs = diffMatches(existing, liga.matches);
      teamReports.push({ team, cs, existingMd, frontmatter, body, existingMatches: existing, ligaMatches: liga.matches });
    } catch (err) {
      errors.push({ team: team.slug, error: err.message });
    }
  }

  const termineMd = await readRepoFile(TERMINE_PATH);
  const termineFmMatch = termineMd.match(/^---\n([\s\S]*?)\n---/);
  const termineEvents = termineFmMatch
    ? (await import('js-yaml')).default.load(termineFmMatch[1]).events ?? []
    : [];

  const decorated = teamReports.map(r =>
    decorateTeamChange({ team: r.team.slug, ...r.cs }, r.team.label, termineEvents),
  );

  const hasChanges = decorated.some(d => d.updates.length || d.adds.length || d.missings.length);

  if (!hasChanges) {
    return { changed: false, errors, fileChanges: [], prBody: null };
  }

  const fileChanges = [];

  for (const report of teamReports) {
    if (isEmptyChangeSet(report.cs)) continue;
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

  const teamChangesForTermine = decorated.map(d => ({
    team: d.team,
    updates: d.updates,
    adds: d.adds,
    missings: d.missings,
  }));
  const newTermineMd = applyTermineChanges(termineMd, teamChangesForTermine);
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
