export const TEAMS = [
  { slug: 'damen-6er',  file: 'content/mannschaften/damen-6er.md',  group: '2',   label: 'Damen' },
  { slug: 'herren-30',  file: 'content/mannschaften/herren-30.md',  group: '67',  label: 'Herren 30' },
  { slug: 'herren-40',  file: 'content/mannschaften/herren-40.md',  group: '77',  label: 'Herren 40' },
  { slug: 'herren-60',  file: 'content/mannschaften/herren-60.md',  group: '109', label: 'Herren 60' },
  { slug: 'gemischt-1', file: 'content/mannschaften/gemischt-1.md', group: '120', label: 'Gemischt 1' },
  { slug: 'gemischt-2', file: 'content/mannschaften/gemischt-2.md', group: '129', label: 'Gemischt 2' },
  { slug: 'mixed-u12',  file: 'content/mannschaften/mixed-u12.md',  group: '205', label: 'Mixed U12' },
];

const BASE = 'https://wtv.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage';

export function liganuUrl(group, championship = 'SW 2026') {
  const params = new URLSearchParams({ championship, group });
  return `${BASE}?${params.toString()}`;
}
