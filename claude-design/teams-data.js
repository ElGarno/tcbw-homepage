/* TC BW Attendorn — Mannschaftsdaten Sommer 2026
   Quelle: content/mannschaften/*.md (extrahiert aus liga.nu via nuliga-sync)
   Hinweis: In der Production-App wird das hier per Build-Step aus den Hugo-MDs erzeugt. */

window.TCBW_TEAMS_DATA = {
  // Liga-Mannschaften — Liga und Spielplan fix
  "Damen": {
    league: "Bezirksliga",
    matches: [
      { date: "10.05.2026", time: "10:00", opponent: "TC Ennepetal-Breckerfeld",  home: false },
      { date: "17.05.2026", time: "10:00", opponent: "Schwelmer TC RW",            home: true  },
      { date: "31.05.2026", time: "10:00", opponent: "TV Wickede 1890",            home: false },
      { date: "14.06.2026", time: "10:00", opponent: "TC Halver 1960",             home: true  },
      { date: "21.06.2026", time: "10:00", opponent: "Hagener TC Blau-Gold",       home: false },
      { date: "28.06.2026", time: "10:00", opponent: "TC Blau-Weiß Sundern",       home: true  },
    ],
  },
  "Herren 30": {
    league: "Kreisliga",
    matches: [
      { date: "09.05.2026", time: "13:00", opponent: "Olper TC",                   home: true  },
      { date: "13.06.2026", time: "10:00", opponent: "TV Rosenthal 1899 2",        home: false },
      { date: "20.06.2026", time: "13:00", opponent: "TC Ludwigseck Salchendorf",  home: false },
      { date: "04.07.2026", time: "14:30", opponent: "TuS Ferndorf 2",             home: true  },
    ],
  },
  "Herren 40": {
    league: "Südwestfalenliga",
    matches: [
      { date: "09.05.2026", time: "14:00", opponent: "TuS Bruchhausen 02",         home: false },
      { date: "30.05.2026", time: "13:00", opponent: "Tennisclub Iserlohn",        home: true  },
      { date: "13.06.2026", time: "14:30", opponent: "Hagener TC Blau-Gold",       home: true  },
      { date: "20.06.2026", time: "13:00", opponent: "TV Plettenberg",             home: true  },
      { date: "04.07.2026", time: "13:00", opponent: "TC Rot-Weiß Hagen",          home: false },
    ],
  },
  "Herren 60": {
    league: "Bezirksliga",
    matches: [
      { date: "09.05.2026", time: "13:00", opponent: "TC Ennepetal-Breckerfeld",   home: false },
      { date: "16.05.2026", time: "10:00", opponent: "TC Esseltal",                home: false },
      { date: "13.06.2026", time: "09:30", opponent: "TC SSV Elspe 2",             home: true  },
      { date: "21.06.2026", time: "14:30", opponent: "SSV Allendorf TA",           home: false },
      { date: "04.07.2026", time: "09:30", opponent: "TuS Hachen",                 home: true  },
    ],
  },
  "Gemischt 1": {
    league: "Bezirksklasse",
    matches: [
      { date: "25.07.2026", time: "13:00", opponent: "Höinger SV",                 home: true  },
      { date: "08.08.2026", time: "13:00", opponent: "TC Wilgersdorf",             home: false },
      { date: "15.08.2026", time: "13:00", opponent: "TV Plettenberg",             home: false },
      { date: "05.09.2026", time: "10:00", opponent: "TuS 1900 Eisern",            home: true  },
    ],
  },
  "Gemischt 2": {
    league: "Kreisklasse",
    matches: [
      { date: "18.07.2026", time: "13:00", opponent: "TC Buschhütten",             home: false },
      { date: "25.07.2026", time: "09:00", opponent: "TC GW Dünschede",            home: false },
      { date: "08.08.2026", time: "13:00", opponent: "TC 71 Netphen",              home: true  },
      { date: "15.08.2026", time: "13:00", opponent: "TC Gottfried von Cramm 2",   home: true  },
      { date: "05.09.2026", time: "14:30", opponent: "TV Hoffnung Littfeld 2",     home: true  },
    ],
  },
  "Mixed U12": {
    league: "Kreisklasse",
    matches: [
      { date: "12.06.2026", time: "15:30", opponent: "TC 71 Netphen",              home: false },
      { date: "26.06.2026", time: "15:30", opponent: "TC 71 Netphen",              home: true  },
    ],
  },

  // Pokal-Mannschaften — kommende Runde unbekannt, daher kein fester Spielplan
  "Herren-Pokal": {
    league: "WTV Vereinspokal",
    matches: null,
    isPokal: true,
  },
  "Herren 40-Pokal": {
    league: "WTV Vereinspokal",
    matches: null,
    isPokal: true,
  },
};
