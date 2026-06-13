import yaml from 'js-yaml';

function q(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Narrow serializer for the data/pokal.yaml shape. Avoids yaml.dump (crashes in
// the n8n runner sandbox — see termineUpdater.js for the same reason).
export function renderPokalYaml(paths) {
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

export function parsePokalYaml(text) {
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
export function collectNewResults(oldPaths, newPaths, labelBySlug) {
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
