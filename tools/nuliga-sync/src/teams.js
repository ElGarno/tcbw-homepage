export const TEAMS = [
  { kind: 'medenspiel', slug: 'damen-6er',  file: 'content/mannschaften/damen-6er.md',  group: '2',   label: 'Damen' },
  { kind: 'medenspiel', slug: 'herren-30',  file: 'content/mannschaften/herren-30.md',  group: '67',  label: 'Herren 30' },
  { kind: 'medenspiel', slug: 'herren-40',  file: 'content/mannschaften/herren-40.md',  group: '77',  label: 'Herren 40' },
  { kind: 'medenspiel', slug: 'herren-60',  file: 'content/mannschaften/herren-60.md',  group: '109', label: 'Herren 60' },
  { kind: 'medenspiel', slug: 'gemischt-1', file: 'content/mannschaften/gemischt-1.md', group: '120', label: 'Gemischt 1' },
  { kind: 'medenspiel', slug: 'gemischt-2', file: 'content/mannschaften/gemischt-2.md', group: '129', label: 'Gemischt 2' },
  { kind: 'medenspiel', slug: 'mixed-u12',  file: 'content/mannschaften/mixed-u12.md',  group: '205', label: 'Mixed U12' },
  {
    kind: 'pokal', slug: 'herren-pokal',
    group: '2229674', championship: 'WTV VP 2026',
    label: 'Herren-Pokal',
    pokalDetail: 'WTV Vereinspokal · Herren LK 18,0–25,0, Heimspiel',
  },
  {
    kind: 'pokal', slug: 'herren-40-pokal',
    group: '2229754', championship: 'WTV VP 2026',
    label: 'Herren 40-Pokal',
    pokalDetail: 'WTV Vereinspokal · Herren Ü40 LK 1,0–25,0, Heimspiel',
  },
  // Nebenrunde Herren LK 18-25 — Vorsorge, falls TC BW Attendorn aus der Hauptrunde
  // (group 2229674) ausscheidet, läuft die Verlierer-Runde in dieser group.
  {
    kind: 'pokal', slug: 'herren-pokal-nebenrunde',
    group: '2236574', championship: 'WTV VP 2026',
    label: 'Herren-Pokal Nebenrunde',
    pokalDetail: 'WTV Vereinspokal · Herren LK 18,0–25,0 (Nebenrunde), Heimspiel',
  },
  // TODO: Nebenrunde Herren-40-Pokal — group-ID ist auf liga.nu noch nicht
  // sichtbar (vermutlich erst nach Komplettierung der 1. Runde freigeschaltet).
  // TC BW Attendorn hat den Herren-40-Pokal in der 1. Runde verloren und sollte
  // dort auftauchen. Sobald die group-ID auf wtv.liga.nu erscheint, hier ergänzen.
];

const BASE = 'https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage';

function encQuery(s) {
  return encodeURIComponent(s).replace(/%20/g, '+');
}

export function liganuUrl(group, championship = 'SW 2026') {
  return `${BASE}?championship=${encQuery(championship)}&group=${encQuery(group)}`;
}
