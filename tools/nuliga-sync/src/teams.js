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
];

const BASE = 'https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage';

export function liganuUrl(group, championship = 'SW 2026') {
  const params = new URLSearchParams({ championship, group });
  return `${BASE}?${params.toString()}`;
}
