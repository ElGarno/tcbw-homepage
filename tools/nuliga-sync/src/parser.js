import * as cheerio from 'cheerio';

const DATE_TIME_RE = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}:\d{2})/;

function parseDateTimeCell(text) {
  const m = text.match(DATE_TIME_RE);
  if (!m) return null;
  const [, d, mo, y, time] = m;
  return { date: `${y}-${mo}-${d}`, time };
}

function findScheduleTable($) {
  // liga.nu pages have multiple .result-set tables; the schedule is preceded by an <h2>Spielplan</h2>.
  const tables = $('table.result-set').toArray();
  for (const t of tables) {
    const headers = $(t).find('th').map((_, th) => $(th).text().trim()).get();
    if (headers.some(h => /Heimmannschaft/i.test(h))) return t;
  }
  return null;
}

export function parseGroupPage(html) {
  const $ = cheerio.load(html);
  const table = findScheduleTable($);
  if (!table) throw new Error('No schedule table found — liga.nu layout may have changed');

  const matches = [];
  let currentDateTime = null;

  $(table).find('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length === 0) return;

    const cellTexts = cells.toArray().map(td => $(td).text().trim());
    const dateTimeCell = cellTexts.find(t => DATE_TIME_RE.test(t));
    if (dateTimeCell) {
      currentDateTime = parseDateTimeCell(dateTimeCell);
    }

    const teamLinks = $(row).find('a[href*="teamPortrait"]');
    if (teamLinks.length < 2 || !currentDateTime) return;

    const home = $(teamLinks[0]).text().trim();
    const guest = $(teamLinks[1]).text().trim();
    if (!home || !guest) return;

    if (!home.includes('Attendorn') && !guest.includes('Attendorn')) return;

    matches.push({
      date: currentDateTime.date,
      time: currentDateTime.time,
      home,
      guest,
    });
  });

  if (matches.length === 0) {
    throw new Error('No matches found — liga.nu layout may have changed');
  }

  const first = matches[0];
  const team_name = first.home.includes('Attendorn') ? first.home : first.guest;

  return { team_name, matches };
}
