import { liganuUrl } from './teams.js';

// "TV Rönkhausen 1892 e.V. TA 1" -> "TV Rönkhausen 1892 TA"
function displayName(raw) {
  return String(raw)
    .replace(/\s+e\.V\.?/gi, '')
    .replace(/\s+1$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchOutcome(match) {
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
export function buildPokalPath(team, hauptRaw, nebenRaw) {
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
