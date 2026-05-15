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

export function isEmptyChangeSet(cs) {
  return cs.updates.length === 0 && cs.adds.length === 0 && cs.missings.length === 0;
}
