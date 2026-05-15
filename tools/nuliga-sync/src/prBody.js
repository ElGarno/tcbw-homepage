function shortDate(iso) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

function bullet(s) {
  return `- ${s}`;
}

export function renderPrBody(syncDate, teamChanges) {
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
