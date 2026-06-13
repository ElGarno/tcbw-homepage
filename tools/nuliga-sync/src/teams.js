export const TEAMS = [
  { kind: 'medenspiel', slug: 'damen-6er',  file: 'content/mannschaften/damen-6er.md',  group: '2',   label: 'Damen' },
  { kind: 'medenspiel', slug: 'herren-30',  file: 'content/mannschaften/herren-30.md',  group: '67',  label: 'Herren 30' },
  { kind: 'medenspiel', slug: 'herren-40',  file: 'content/mannschaften/herren-40.md',  group: '77',  label: 'Herren 40' },
  { kind: 'medenspiel', slug: 'herren-60',  file: 'content/mannschaften/herren-60.md',  group: '109', label: 'Herren 60' },
  { kind: 'medenspiel', slug: 'gemischt-1', file: 'content/mannschaften/gemischt-1.md', group: '120', label: 'Gemischt 1' },
  { kind: 'medenspiel', slug: 'gemischt-2', file: 'content/mannschaften/gemischt-2.md', group: '129', label: 'Gemischt 2' },
  { kind: 'medenspiel', slug: 'mixed-u12',  file: 'content/mannschaften/mixed-u12.md',  group: '205', label: 'Mixed U12' },
];

// Cup teams: each logical team plays a Hauptrunde (winner branch) and, after a
// Hauptrunde loss, a Nebenrunde (loser branch). Each branch is its own liga.nu group.
export const POKAL_TEAMS = [
  {
    kind: 'pokal',
    slug: 'herren-lk18-25',
    label: 'Herren-Pokal LK 18–25',
    championship: 'WTV VP 2026',
    detail: 'WTV Vereinspokal · Herren LK 18,0–25,0',
    branches: { haupt: '2229674', neben: '2236574' },
  },
  {
    kind: 'pokal',
    slug: 'herren-40',
    label: 'Herren-40-Pokal',
    championship: 'WTV VP 2026',
    detail: 'WTV Vereinspokal · Herren Ü40 LK 1,0–25,0',
    branches: { haupt: '2229754', neben: '2236634' },
  },
];

const BASE = 'https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage';

function encQuery(s) {
  return encodeURIComponent(s).replace(/%20/g, '+');
}

export function liganuUrl(group, championship = 'SW 2026') {
  return `${BASE}?championship=${encQuery(championship)}&group=${encQuery(group)}`;
}
