export function normalizeOpponent(raw) {
  if (!raw) return '';
  let s = raw.toLowerCase().trim();
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  s = s.replace(/\s*e\.v\.?\s*/g, ' ');
  s = s.replace(/\s+1$/, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
