import { normalizeOpponent } from './normalize.js';

function getIdentity(match) {
  const isHome = match.home.includes('Attendorn');
  const opponent = isHome ? match.guest : match.home;
  return `${normalizeOpponent(opponent)}|${isHome ? 'H' : 'A'}`;
}

export function diffMatches(existing, liga) {
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
    if (existingMatch.date !== ligaMatch.date || existingMatch.time !== ligaMatch.time) {
      updates.push({
        identity: id,
        oldDate: existingMatch.date,
        oldTime: existingMatch.time,
        newDate: ligaMatch.date,
        newTime: ligaMatch.time,
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

export function isEmptyChangeSet(cs) {
  return cs.updates.length === 0 && cs.adds.length === 0 && cs.missings.length === 0;
}
