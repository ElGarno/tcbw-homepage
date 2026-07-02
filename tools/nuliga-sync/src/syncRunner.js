import yaml from 'js-yaml';
import { TEAMS, POKAL_TEAMS, liganuUrl } from './teams.js';
import { parseGroupPage } from './parser.js';
import { readMannschaftMd } from './mdReader.js';
import { writeMannschaftMd } from './mdWriter.js';
import { diffMatches, isEmptyChangeSet } from './diff.js';
import { applyTermineChanges } from './termineUpdater.js';
import { renderPrBody } from './prBody.js';
import { normalizeOpponent } from './normalize.js';
import { buildPokalPath } from './pokalPath.js';
import { renderPokalYaml, parsePokalYaml, collectNewResults } from './pokalData.js';

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

export async function runSync({ fetchImpl, readRepoFile, today = new Date(), pokalTeams = POKAL_TEAMS }) {
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
  for (const pt of pokalTeams) {
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
