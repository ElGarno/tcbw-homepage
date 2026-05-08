# tcbw-social-tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vite + React Web-App, mit der Vereinsmitglieder Instagram-fertige Posts (Match-Ergebnis, Heimspiel-Ankündigung, Saison-Übersicht, Event-Card) per Form-Eingabe erzeugen und als PNG/ZIP herunterladen können.

**Architecture:** Statisches SPA, deployed auf Cloudflare Pages, geschützt durch Cloudflare Access (Email-Whitelist). 4 Template-React-Komponenten rendern voll-1080-px-Artboards im DOM, `html-to-image` exportiert sie pixelgenau als PNG. Mannschaftsdaten kommen build-time aus `../tcbw-homepage/content/mannschaften/*.md` über ein Node-Build-Script.

**Tech Stack:** Vite 5, React 18, JavaScript (kein TS), CSS-Variablen, html-to-image, JSZip, gray-matter, node:test.

**Spec:** `doc/specs/2026-05-08-tcbw-social-tools.md` im tcbw-homepage Repo.
**Mockup-Referenz (laufend):** `claude-design/app-mockup.html` im tcbw-homepage Repo (commit `21faaf6` auf main).

**Quell-Repo (read-only):** `~/PycharmProjects/tcbw-homepage/`
**Ziel-Repo (neu):** `~/PycharmProjects/tcbw-social-tools/`

---

## Voraussetzungen

Bevor du anfängst:

1. Beide Repos parallel: `~/PycharmProjects/tcbw-homepage/` muss bereits existieren. Falls du in einem fresh Clone bist, klone es zusätzlich.
2. `node --version` ≥ 20 (für `node:test` und ESM).
3. `~/PycharmProjects/tcbw-social-tools/` existiert noch nicht — wir legen es in Task 1 an.

---

## Datei-Struktur (Ziel-Layout)

```
tcbw-social-tools/
├── package.json                              # Task 1
├── vite.config.js                            # Task 1
├── index.html                                # Task 1
├── .gitignore                                # Task 1
├── README.md                                 # Task 13
├── public/
│   ├── wappen.png                            # Task 2 (von Quell-Repo)
│   ├── foto-anlage-2.jpg                     # Task 2
│   └── fonts/                                # Task 2 (4 Variable-TTFs)
├── src/
│   ├── main.jsx                              # Task 1
│   ├── App.jsx                               # Task 7
│   ├── colors_and_type.css                   # Task 2
│   ├── app.css                               # Task 7 (UI-Layout)
│   ├── data/
│   │   └── teams.json                        # Task 3 (auto-generiert)
│   ├── lib/
│   │   ├── format-date.js                    # Task 4 (TDD)
│   │   ├── resolve-team-mode.js              # Task 4 (TDD)
│   │   └── download-png.js                   # Task 11
│   ├── templates/
│   │   ├── shared.jsx                        # Task 5 (Wappen, BrandMark, CourtLines, Eyebrow)
│   │   ├── MatchResult.jsx                   # Task 6
│   │   ├── MatchAnnouncement.jsx             # Task 6
│   │   ├── SeasonSchedule.jsx                # Task 6
│   │   └── EventCard.jsx                     # Task 6
│   ├── components/
│   │   ├── TopBar.jsx                        # Task 7
│   │   ├── Sidebar.jsx                       # Task 8
│   │   ├── Preview.jsx                       # Task 9
│   │   ├── ui.jsx                            # Task 8 (Field, Input, NumberInput, Hint)
│   │   └── forms/
│   │       ├── MatchResultForm.jsx           # Task 10
│   │       ├── MatchAnnouncementForm.jsx     # Task 10
│   │       ├── SeasonScheduleForm.jsx        # Task 10
│   │       └── EventCardForm.jsx             # Task 10
│   └── catalog.js                            # Task 9 (TEMPLATES + FORMAT_DIMS)
├── scripts/
│   └── build-teams-data.mjs                  # Task 3 (TDD)
└── tests/
    ├── build-teams-data.test.mjs             # Task 3
    ├── format-date.test.mjs                  # Task 4
    └── resolve-team-mode.test.mjs            # Task 4
```

---

## Task 1: Vite + React Bootstrap

**Files:**
- Create: `~/PycharmProjects/tcbw-social-tools/package.json`
- Create: `~/PycharmProjects/tcbw-social-tools/vite.config.js`
- Create: `~/PycharmProjects/tcbw-social-tools/index.html`
- Create: `~/PycharmProjects/tcbw-social-tools/src/main.jsx`
- Create: `~/PycharmProjects/tcbw-social-tools/.gitignore`

- [ ] **Step 1: Repo anlegen + Vite scaffold**

```bash
cd ~/PycharmProjects
mkdir tcbw-social-tools
cd tcbw-social-tools
npm create vite@latest . -- --template react
npm install
```

Wenn npm fragt, ob das aktuelle Verzeichnis überschrieben werden soll: ja.

- [ ] **Step 2: Extra-Dependencies installieren**

```bash
npm install html-to-image jszip
npm install --save-dev gray-matter
```

`gray-matter` ist nur für das Build-Script; es braucht keinen Bundle-Eintrag.

- [ ] **Step 3: package.json um prebuild-Hook erweitern**

`package.json` öffnen und `scripts` Block ersetzen mit:

```json
"scripts": {
  "dev": "node scripts/build-teams-data.mjs && vite",
  "prebuild": "node scripts/build-teams-data.mjs",
  "build": "vite build",
  "preview": "vite preview",
  "test": "node --test tests/*.test.mjs"
}
```

`type` Feld auf Top-Level ergänzen (für ESM in Skripten):

```json
"type": "module",
```

- [ ] **Step 4: index.html anpassen**

`index.html` ersetzen durch:

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/wappen.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TC BW Attendorn — Social Media Generator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: .gitignore**

`.gitignore` Inhalt:

```
node_modules
dist
.DS_Store
*.local
.vite
src/data/teams.json
```

`src/data/teams.json` ist generiert — wird per `npm run build` erzeugt, gehört nicht ins Repo.

- [ ] **Step 6: src/main.jsx als Stub anlegen**

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./colors_and_type.css";
import "./app.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 7: Stub App.jsx + app.css anlegen, damit `npm run dev` läuft**

`src/App.jsx`:
```jsx
export default function App() {
  return <div style={{ padding: 24 }}>tcbw-social-tools — Bootstrap OK</div>;
}
```

`src/app.css`:
```css
body { margin: 0; }
```

- [ ] **Step 8: Initial Commit**

```bash
git init
git add .
git commit -m "feat: vite + react bootstrap"
```

`npm run dev` und `npm run build` müssen jetzt durchlaufen (build wird in Task 3 vom prebuild-Hook unterbrochen, weil das Build-Script noch nicht existiert — das ist OK, in Task 3 wird das gefixt).

---

## Task 2: Brand-Assets aus tcbw-homepage übernehmen

**Files:**
- Create: `public/wappen.png` (Copy)
- Create: `public/foto-anlage-2.jpg` (Copy)
- Create: `public/fonts/*.ttf` (4 Files Copy)
- Create: `src/colors_and_type.css` (Copy + Pfad-Anpassung)

- [ ] **Step 1: Public Assets kopieren**

```bash
cd ~/PycharmProjects/tcbw-social-tools
mkdir -p public/fonts
cp ../tcbw-homepage/claude-design/assets/wappen.png public/
cp ../tcbw-homepage/claude-design/assets/foto-anlage-2.jpg public/
cp ../tcbw-homepage/claude-design/fonts/*.ttf public/fonts/
```

- [ ] **Step 2: CSS kopieren**

```bash
cp ../tcbw-homepage/claude-design/colors_and_type.css src/
```

- [ ] **Step 3: Font-Pfade im CSS anpassen**

In `src/colors_and_type.css` müssen alle `url("fonts/...")` zu `url("/fonts/...")` werden (Vite serviert `public/` unter `/`):

```bash
sed -i '' 's|url("fonts/|url("/fonts/|g' src/colors_and_type.css
```

(macOS sed-Syntax; auf Linux: `sed -i 's|...|...|g' file`.)

- [ ] **Step 4: CSS aufräumen — fehlende statische Fonts entfernen**

Die statischen Fonts (`PlayfairDisplay-Regular.ttf` etc.) wurden im Quell-Repo nicht runtergeladen, nur die 4 Variable-Fonts. Die fehlenden TTF-Referenzen geben 404 in der Konsole. Lösche alle `@font-face`-Regeln, die *nicht* `VariableFont` im Namen haben.

Öffne `src/colors_and_type.css`. Die `@font-face`-Regeln stehen oben in Zeilen ~7–42. Behalte nur die 4 mit `VariableFont` im URL-Pfad (zwei für Playfair Display, zwei für DM Sans). Lösche die ~24 anderen.

- [ ] **Step 5: Im Browser sichten**

```bash
npm run dev
```

Im Browser auf `http://localhost:5173` öffnen, prüfen:
- Schriftart sollte **DM Sans** sein, nicht System-Default
- Konsole zeigt **keine 404** für Fonts

- [ ] **Step 6: Commit**

```bash
git add public/ src/colors_and_type.css
git commit -m "feat: copy brand assets (wappen, anlage photo, variable fonts, css)"
```

---

## Task 3: Build-Script für Mannschaftsdaten (TDD)

**Files:**
- Create: `tests/build-teams-data.test.mjs`
- Create: `scripts/build-teams-data.mjs`
- Create: `src/data/teams.json` (Output, .gitignored)

Das Build-Script liest die Mannschafts-MDs aus `../tcbw-homepage/content/mannschaften/`, parsed Frontmatter (`title`, `league`) und die Markdown-Tabelle (Datum, Uhrzeit, Heim, Gast), erkennt `**TC BW Attendorn**` (mit oder ohne `2`-Suffix für Reserve-Mannschaft) als „home-Team" und produziert das JSON-Format aus dem Mockup. Pokal-Mannschaften haben keine Spieltabelle und werden hardcoded.

- [ ] **Step 1: Failing Test schreiben — Frontmatter-Parsing**

Datei `tests/build-teams-data.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTeamMd } from "../scripts/build-teams-data.mjs";

const SAMPLE_MD = `---
title: "Herren 30"
league: "Kreisliga"
captain: "Horlacher Marc"
---

Herren 30 6er Mannschaft in der Kreisliga (Gr. 067 SI), Saison Sommer 2026.

## Spielplan Sommer 2026

| Datum | Uhrzeit | Heim | Gast | Ergebnis |
|-------|---------|------|------|----------|
| 09.05.2026 | 13:00 | **TC BW Attendorn** | Olper TC | - |
| 13.06.2026 | 10:00 | TV Rosenthal 1899 2 | **TC BW Attendorn** | - |
`;

test("parseTeamMd extracts title and league from frontmatter", () => {
  const result = parseTeamMd(SAMPLE_MD);
  assert.equal(result.title, "Herren 30");
  assert.equal(result.league, "Kreisliga");
});

test("parseTeamMd extracts matches with date, time, opponent, home flag", () => {
  const result = parseTeamMd(SAMPLE_MD);
  assert.equal(result.matches.length, 2);
  assert.deepEqual(result.matches[0], {
    date: "09.05.2026",
    time: "13:00",
    opponent: "Olper TC",
    home: true,
  });
  assert.deepEqual(result.matches[1], {
    date: "13.06.2026",
    time: "10:00",
    opponent: "TV Rosenthal 1899 2",
    home: false,
  });
});

test("parseTeamMd handles 'TC BW Attendorn 2' (reserve team) as home identifier", () => {
  const md = `---
title: "Gemischte 2"
league: "Kreisklasse"
---

| Datum | Uhrzeit | Heim | Gast | Ergebnis |
|-------|---------|------|------|----------|
| 18.07.2026 | 13:00 | TC Buschhütten | **TC BW Attendorn 2** | - |
| 08.08.2026 | 13:00 | **TC BW Attendorn 2** | TC 71 Netphen | - |
`;
  const result = parseTeamMd(md);
  assert.equal(result.matches[0].home, false);
  assert.equal(result.matches[0].opponent, "TC Buschhütten");
  assert.equal(result.matches[1].home, true);
  assert.equal(result.matches[1].opponent, "TC 71 Netphen");
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

```bash
npm test
```

Erwartung: FAIL — `parseTeamMd is not a function` (Modul fehlt noch).

- [ ] **Step 3: Build-Script implementieren — `parseTeamMd`**

Datei `scripts/build-teams-data.mjs`:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOMEPAGE_REPO = path.resolve(__dirname, "../../tcbw-homepage");
const MANNSCHAFTEN_DIR = path.join(HOMEPAGE_REPO, "content/mannschaften");
const OUTPUT = path.resolve(__dirname, "../src/data/teams.json");

const HOME_PATTERN = /\*\*TC BW Attendorn(?: \d)?\*\*/;

const TITLE_REMAP = {
  "Damen": "Damen",
  "Herren 30": "Herren 30",
  "Herren 40": "Herren 40",
  "Herren 60": "Herren 60",
  "Gemischte Mannschaft 1": "Gemischt 1",
  "Gemischte Mannschaft 2": "Gemischt 2",
  "Mixed U12": "Mixed U12",
};

const POKAL_TEAMS = {
  "Herren-Pokal":     { league: "WTV Vereinspokal", matches: null, isPokal: true },
  "Herren 40-Pokal":  { league: "WTV Vereinspokal", matches: null, isPokal: true },
};

export function parseTeamMd(md) {
  const { data, content } = matter(md);
  const title = data.title;
  const league = data.league;
  const matches = [];

  const lines = content.split("\n");
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    if (line.startsWith("|---") || line.includes("Datum")) continue;
    const cells = line.split("|").map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length < 4) continue;
    const [date, time, heim, gast] = cells;
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date)) continue;

    const heimIsUs = HOME_PATTERN.test(heim);
    const gastIsUs = HOME_PATTERN.test(gast);
    if (!heimIsUs && !gastIsUs) continue;

    matches.push({
      date,
      time,
      opponent: heimIsUs ? gast.replace(/\*\*/g, "").trim() : heim.replace(/\*\*/g, "").trim(),
      home: heimIsUs,
    });
  }

  return { title, league, matches };
}

export function buildTeamsData() {
  const files = fs.readdirSync(MANNSCHAFTEN_DIR).filter(f => f.endsWith(".md") && f !== "_index.md");
  const teams = {};
  for (const f of files) {
    const md = fs.readFileSync(path.join(MANNSCHAFTEN_DIR, f), "utf8");
    const parsed = parseTeamMd(md);
    const remappedTitle = TITLE_REMAP[parsed.title] ?? parsed.title;
    teams[remappedTitle] = {
      league: parsed.league,
      matches: parsed.matches,
    };
  }
  Object.assign(teams, POKAL_TEAMS);
  return teams;
}

// Run if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const data = buildTeamsData();
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2));
  console.log(`✓ Wrote ${OUTPUT} (${Object.keys(data).length} teams)`);
}
```

- [ ] **Step 4: Tests laufen lassen (müssen passen)**

```bash
npm test
```

Erwartung: alle 3 PASS.

- [ ] **Step 5: Smoke-Test gegen echte Daten**

```bash
node scripts/build-teams-data.mjs
cat src/data/teams.json
```

Erwartung: JSON enthält alle 7 Liga-Mannschaften + 2 Pokal-Mannschaften, jeweils mit `league` und `matches` (null für Pokal). Stichprobe: `teams["Herren 30"].matches[0]` sollte `Olper TC, 09.05.2026, home: true` enthalten.

Vergleiche mit Mockup-Referenz `../tcbw-homepage/claude-design/teams-data.js`: dieselben Daten, nur als JSON statt JS.

- [ ] **Step 6: prebuild-Hook validieren**

```bash
rm -f src/data/teams.json
npm run build
ls src/data/teams.json
```

Erwartung: `teams.json` existiert nach Build.

- [ ] **Step 7: Commit**

```bash
git add scripts/ tests/build-teams-data.test.mjs
git commit -m "feat(build): teams data extraction from tcbw-homepage Mannschaft-MDs"
```

---

## Task 4: Lib-Helpers (TDD)

**Files:**
- Create: `tests/format-date.test.mjs`
- Create: `src/lib/format-date.js`
- Create: `tests/resolve-team-mode.test.mjs`
- Create: `src/lib/resolve-team-mode.js`

- [ ] **Step 1: Failing test für format-date**

Datei `tests/format-date.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDateLong } from "../src/lib/format-date.js";

test("formatDateLong: 09.05.2026 → '9. Mai'", () => {
  assert.equal(formatDateLong("09.05.2026"), "9. Mai");
});

test("formatDateLong: 30.05.2026 → '30. Mai'", () => {
  assert.equal(formatDateLong("30.05.2026"), "30. Mai");
});

test("formatDateLong: 13.06.2026 → '13. Juni'", () => {
  assert.equal(formatDateLong("13.06.2026"), "13. Juni");
});

test("formatDateLong: empty → empty", () => {
  assert.equal(formatDateLong(""), "");
  assert.equal(formatDateLong(null), "");
  assert.equal(formatDateLong(undefined), "");
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

```bash
npm test
```

Erwartung: FAIL — Modul fehlt.

- [ ] **Step 3: Implementieren**

Datei `src/lib/format-date.js`:

```js
const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function formatDateLong(ddmmyyyy) {
  if (!ddmmyyyy) return "";
  const [d, m] = ddmmyyyy.split(".");
  return `${parseInt(d, 10)}. ${MONTHS_DE[parseInt(m, 10) - 1]}`;
}

export function matchLabel(match) {
  return `${match.date.slice(0, 5)} · ${match.opponent} (${match.home ? "Heim" : "Auswärts"})`;
}
```

- [ ] **Step 4: Test passt jetzt**

```bash
npm test
```

Erwartung: PASS für format-date.

- [ ] **Step 5: Failing test für resolve-team-mode**

Datei `tests/resolve-team-mode.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveTeamMode } from "../src/lib/resolve-team-mode.js";

const TEAMS = {
  "Herren 30": {
    league: "Kreisliga",
    matches: [{ date: "09.05.2026", time: "13:00", opponent: "Olper TC", home: true }],
  },
  "Herren-Pokal": {
    league: "WTV Vereinspokal",
    matches: null,
    isPokal: true,
  },
};

test("league team in 'win' variant: not pokal, returns matches", () => {
  const m = resolveTeamMode("Herren 30", "win", TEAMS);
  assert.equal(m.isPokal, false);
  assert.equal(m.league, "Kreisliga");
  assert.equal(m.matches.length, 1);
});

test("league team in 'pokal' variant: isPokal true, matches null", () => {
  const m = resolveTeamMode("Herren 30", "pokal", TEAMS);
  assert.equal(m.isPokal, true);
  assert.equal(m.matches, null);
});

test("pokal team in any variant: isPokal true", () => {
  const m = resolveTeamMode("Herren-Pokal", "win", TEAMS);
  assert.equal(m.isPokal, true);
  assert.equal(m.matches, null);
});

test("unknown team: empty league, no matches, isPokal false", () => {
  const m = resolveTeamMode("Phantom", "win", TEAMS);
  assert.equal(m.isPokal, false);
  assert.equal(m.league, "");
  assert.equal(m.matches, null);
});
```

- [ ] **Step 6: Test laufen lassen (muss fehlschlagen)**

```bash
npm test
```

Erwartung: FAIL — Modul fehlt.

- [ ] **Step 7: Implementieren**

Datei `src/lib/resolve-team-mode.js`:

```js
export function resolveTeamMode(team, variant, teamsData) {
  const t = teamsData[team];
  const isPokalTeam = !!t?.isPokal;
  const isPokalVariant = variant === "pokal";
  const isPokal = isPokalTeam || isPokalVariant;
  return {
    isPokal,
    league: t?.league ?? "",
    matches: isPokal ? null : (t?.matches ?? null),
  };
}

export function findMatchIndex(team, opponent, date, teamsData) {
  const t = teamsData[team];
  if (!t?.matches) return -1;
  return t.matches.findIndex(m => m.opponent === opponent && m.date === date);
}
```

- [ ] **Step 8: Tests passen**

```bash
npm test
```

Erwartung: alle PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ tests/format-date.test.mjs tests/resolve-team-mode.test.mjs
git commit -m "feat(lib): format-date + resolve-team-mode helpers (TDD)"
```

---

## Task 5: Shared-Template-Primitives portieren

**Files:**
- Create: `src/templates/shared.jsx` (von `tcbw-homepage/claude-design/templates.jsx` portiert)

- [ ] **Step 1: shared.jsx anlegen**

Die ursprüngliche `templates.jsx` enthält 4 geteilte Primitives oben (`CourtLines`, `Wappen`, `BrandMark`, `Eyebrow`). In ESM-Module-Form:

Datei `src/templates/shared.jsx`:

```jsx
import React from "react";

export const CourtLines = ({ opacity = 0.14, color = "#ffffff", strokeScale = 1 }) => {
  const stroke = 2 * strokeScale;
  const s = { position: "absolute", inset: 0, opacity, pointerEvents: "none" };
  return (
    <div style={s}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        <rect x="15" y="20" width="70" height="60" fill="none" stroke={color} strokeWidth={stroke * 0.25} />
        <line x1="22" y1="20" x2="22" y2="80" stroke={color} strokeWidth={stroke * 0.25} />
        <line x1="78" y1="20" x2="78" y2="80" stroke={color} strokeWidth={stroke * 0.25} />
        <line x1="15" y1="50" x2="85" y2="50" stroke={color} strokeWidth={stroke * 0.35} />
        <line x1="22" y1="35" x2="78" y2="35" stroke={color} strokeWidth={stroke * 0.25} />
        <line x1="22" y1="65" x2="78" y2="65" stroke={color} strokeWidth={stroke * 0.25} />
        <line x1="50" y1="35" x2="50" y2="65" stroke={color} strokeWidth={stroke * 0.25} />
      </svg>
    </div>
  );
};

export const Wappen = ({ size = 88, style }) => (
  <img
    src="/wappen.png"
    alt="TC BW Attendorn Wappen"
    style={{
      width: size,
      height: size,
      objectFit: "contain",
      display: "block",
      ...style,
    }}
  />
);

export const BrandMark = ({ tone = "light", scale = 1 }) => {
  const isDark = tone === "dark";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 * scale }}>
      <Wappen size={44 * scale} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
        <span style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 16 * scale,
          color: isDark ? "#fff" : "var(--blue-700)",
          letterSpacing: "-0.01em",
        }}>
          TC Blau-Weiss Attendorn
        </span>
        <span style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 500,
          fontSize: 11 * scale,
          color: isDark ? "var(--blue-200)" : "var(--gray-500)",
          letterSpacing: "0.04em",
          marginTop: 2 * scale,
        }}>
          @tcbwattendorn · Seit 1931
        </span>
      </div>
    </div>
  );
};

export const Eyebrow = ({ children, color, scale = 1, style }) => (
  <div style={{
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    fontSize: 13 * scale,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color,
    ...style,
  }}>
    {children}
  </div>
);
```

**Wichtige Änderung gegenüber Quell-Repo:** `<img src="assets/wappen.png">` wurde zu `<img src="/wappen.png">`, weil Vite `public/` unter `/` serviert.

- [ ] **Step 2: Im Browser kurz prüfen**

Temporär in `src/App.jsx`:

```jsx
import { Wappen } from "./templates/shared.jsx";
export default function App() {
  return <div style={{ padding: 24 }}><Wappen size={120} /></div>;
}
```

`npm run dev`, im Browser: Wappen muss erscheinen. Wenn ja, App.jsx wieder zurücksetzen oder erstmal so lassen — wird in Task 7 sowieso komplett ersetzt.

- [ ] **Step 3: Commit**

```bash
git add src/templates/shared.jsx
git commit -m "feat(templates): port shared primitives (Wappen, CourtLines, BrandMark, Eyebrow)"
```

---

## Task 6: 4 Templates portieren

**Files:**
- Create: `src/templates/MatchResult.jsx`
- Create: `src/templates/MatchAnnouncement.jsx`
- Create: `src/templates/SeasonSchedule.jsx`
- Create: `src/templates/EventCard.jsx`

Alle 4 sind im Quell-Repo bereits fertig:
- `MatchResult` und `MatchAnnouncement` in `~/PycharmProjects/tcbw-homepage/claude-design/templates.jsx`
- `SeasonSchedule` und `EventCard` in `~/PycharmProjects/tcbw-homepage/claude-design/templates-events.jsx`

Die Templates sind ~620 Zeilen — ich liste sie hier nicht erneut. Stattdessen: Copy + drei mechanische Transformationen.

- [ ] **Step 1: MatchResult.jsx anlegen**

```bash
cd ~/PycharmProjects/tcbw-social-tools
```

Quelle öffnen: `~/PycharmProjects/tcbw-homepage/claude-design/templates.jsx`.

Aus dieser Datei die `MatchResult`-Komponente kopieren (von `const MatchResult = (...)` bis zur schließenden `};` der Komponente — ca. Zeile 119 bis ~362). Außerdem: das `ACCENTS`-Objekt (Zeilen ~104–108).

Datei `src/templates/MatchResult.jsx`:

```jsx
import React from "react";
import { CourtLines, Wappen, BrandMark, Eyebrow } from "./shared.jsx";

const ACCENTS = {
  win:  { primary: "#1e56a0", deep: "#0f2240", soft: "#dceafb", tag: "Heimsieg" },
  loss: { primary: "#4b5563", deep: "#1f2937", soft: "#e2e5ea", tag: "Heimspiel" },
  pokal:{ primary: "#f97316", deep: "#9a2e0a", soft: "#fff7ed", tag: "Pokal" },
};

export const MatchResult = ({ format = "square", variant = "win", data }) => {
  // … 1:1 aus templates.jsx Zeilen 120–362
};
```

Konkret aus `templates.jsx` einfügen — keine inhaltliche Änderung. Behalte `ACCENTS` separat oben in der Datei (es ist nur in `MatchResult` benutzt).

- [ ] **Step 2: MatchAnnouncement.jsx anlegen**

Aus `~/PycharmProjects/tcbw-homepage/claude-design/templates.jsx` die `MatchAnnouncement`-Komponente kopieren (ab `const MatchAnnouncement = ...` Zeile ~373 bis ~620).

**Eine inhaltliche Sache prüfen:** im Quell-File ist die Lesbarkeits-Verbesserung der Uhrzeit (`color: variant === "pokal" ? "#fdba74" : "#93c5fd"` mit `textShadow`) bereits drin (commit `21faaf6`).

Datei `src/templates/MatchAnnouncement.jsx`:

```jsx
import React from "react";
import { CourtLines, Wappen, BrandMark, Eyebrow } from "./shared.jsx";

export const MatchAnnouncement = ({ format = "portrait", variant = "league", data }) => {
  // … 1:1 aus templates.jsx Zeilen 373–619
};
```

**Wichtige Änderung gegenüber Quell-Repo:** Zeile mit `const bgImage = "assets/foto-anlage-2.jpg";` muss zu `const bgImage = "/foto-anlage-2.jpg";` werden (Vite-Public-Pfad).

- [ ] **Step 3: SeasonSchedule.jsx anlegen**

Aus `~/PycharmProjects/tcbw-homepage/claude-design/templates-events.jsx` die `SeasonSchedule`-Komponente kopieren (ab Zeile ~16 bis ~235).

Auch das `T34_ACCENTS`-Objekt mitnehmen (Zeilen 6–10).

Datei `src/templates/SeasonSchedule.jsx`:

```jsx
import React from "react";
import { Wappen, BrandMark, Eyebrow } from "./shared.jsx";

const T34_ACCENTS = {
  blue: { primary: "#1e56a0", deep: "#0f2240", soft: "#dceafb" },
  orange: { primary: "#f97316", deep: "#9a2e0a", soft: "#fff7ed" },
  green: { primary: "#10b981", deep: "#059669", soft: "#ecfdf5" },
};

export const SeasonSchedule = ({ format = "portrait", data }) => {
  // … 1:1 aus templates-events.jsx Zeilen 16–235
};
```

- [ ] **Step 4: EventCard.jsx anlegen**

Aus `~/PycharmProjects/tcbw-homepage/claude-design/templates-events.jsx` die `EventCard`-Komponente kopieren (Zeilen ~241–418).

Datei `src/templates/EventCard.jsx`:

```jsx
import React from "react";
import { Wappen, BrandMark, Eyebrow } from "./shared.jsx";

const EVENT_ACCENTS = {
  blue: { primary: "#1e56a0", deep: "#0f2240", soft: "#dceafb" },
  orange: { primary: "#f97316", deep: "#9a2e0a", soft: "#fff7ed" },
  green: { primary: "#10b981", deep: "#059669", soft: "#ecfdf5" },
};

export const EventCard = ({ format = "square", data }) => {
  // … 1:1 aus templates-events.jsx Zeilen 241–418
  // Achtung: im Original heißt das Konstanten-Objekt T34_ACCENTS und wird oben in der Datei einmal definiert.
  // Hier in eigenem File: lokales EVENT_ACCENTS-Objekt verwenden, oder die SeasonSchedule-Konstante teilen.
  // Variable a = T34_ACCENTS.green; → a = EVENT_ACCENTS.green;
};
```

- [ ] **Step 5: Smoke-Test in App.jsx**

Temporär:

```jsx
import { MatchResult } from "./templates/MatchResult.jsx";
import { MatchAnnouncement } from "./templates/MatchAnnouncement.jsx";
import { SeasonSchedule } from "./templates/SeasonSchedule.jsx";
import { EventCard } from "./templates/EventCard.jsx";

export default function App() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: 24, background: "#eef0f3" }}>
      <div style={{ transform: "scale(0.4)", transformOrigin: "top left", width: 1080, height: 1080 }}>
        <MatchResult format="square" variant="win" />
      </div>
      <div style={{ transform: "scale(0.4)", transformOrigin: "top left", width: 1080, height: 1350 }}>
        <MatchAnnouncement format="portrait" variant="league" />
      </div>
      <div style={{ transform: "scale(0.4)", transformOrigin: "top left", width: 1080, height: 1350 }}>
        <SeasonSchedule format="portrait" />
      </div>
      <div style={{ transform: "scale(0.4)", transformOrigin: "top left", width: 1080, height: 1080 }}>
        <EventCard format="square" />
      </div>
    </div>
  );
}
```

`npm run dev`, im Browser auf `:5173`: alle 4 Templates rendern in voller Pracht (skaliert auf 40 %). Wappen, Foto, Schriftarten alle sichtbar.

App.jsx wird in Task 7 wieder ersetzt — diese Test-Version nicht committen.

- [ ] **Step 6: Commit (ohne den App.jsx-Smoke-Test)**

```bash
git checkout src/App.jsx
git add src/templates/
git commit -m "feat(templates): port MatchResult, MatchAnnouncement, SeasonSchedule, EventCard"
```

---

## Task 7: App-Shell + TopBar

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/app.css`
- Create: `src/components/TopBar.jsx`

Der App-Shell hat: TopBar oben, links Sidebar (Tabs + Form), rechts Stage (Toolbar + Preview-Canvas).

- [ ] **Step 1: app.css mit Layout-Styles**

Inhalt aus `~/PycharmProjects/tcbw-homepage/claude-design/app-mockup.html` Zeilen 8–110 (alles im `<style>`-Block, ohne den Reset für `*, html, body`) übernehmen.

Datei `src/app.css` ersetzen mit:

```css
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; background: var(--gray-100); font-family: var(--font-sans); color: var(--gray-800); }
#root { height: 100vh; }

/* — copy alle Layout-Styles aus app-mockup.html: .app, .topbar, .body, .sidebar, .stage, .stage-toolbar, .stage-canvas, .tabs, .tab, .form, .form-section-title, .field, .field-row, .label, .input, .select, .pillgroup, .pill, .btn, .btn-primary, .btn-ghost, .preview-frame, .preview-scaler, .badge-pending, .badge-ok — */
```

(Den gesamten `<style>`-Block aus app-mockup.html Zeile 8 bis vor `</style>` kopieren.)

- [ ] **Step 2: TopBar.jsx**

Datei `src/components/TopBar.jsx`:

```jsx
import React from "react";

export const TopBar = ({ onDownload, downloadStatus }) => (
  <header className="topbar">
    <div className="topbar-left">
      <img src="/wappen.png" alt="TC BW Attendorn" />
      <div>
        <div className="topbar-title">Social Media Generator</div>
        <div className="topbar-sub">TC Blau-Weiss Attendorn</div>
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {downloadStatus === "working" && <span className="badge-pending">Erzeuge PNG …</span>}
      {downloadStatus === "done" && <span className="badge-pending badge-ok">Heruntergeladen ✓</span>}
      <button className="btn btn-primary" onClick={onDownload} disabled={downloadStatus === "working"}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>↓</span>
        PNG herunterladen
      </button>
    </div>
  </header>
);
```

- [ ] **Step 3: App.jsx als Skeleton**

```jsx
import React, { useState } from "react";
import { TopBar } from "./components/TopBar.jsx";

export default function App() {
  const [downloadStatus, setDownloadStatus] = useState("idle");

  return (
    <div className="app">
      <TopBar
        onDownload={() => setDownloadStatus("working")}
        downloadStatus={downloadStatus}
      />
      <div className="body">
        <aside className="sidebar">
          <div style={{ padding: 24, color: "var(--gray-500)" }}>Sidebar coming in Task 8</div>
        </aside>
        <main className="stage">
          <div style={{ padding: 24, color: "var(--gray-500)" }}>Preview coming in Task 9</div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Im Browser sichten**

```bash
npm run dev
```

Erwartung: TopBar mit Wappen + Titel sichtbar, Download-Button rechts. Sidebar + Stage-Bereiche grau dargestellt.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/app.css src/components/TopBar.jsx
git commit -m "feat(shell): app shell + TopBar"
```

---

## Task 8: Sidebar mit Tabs + UI-Primitives

**Files:**
- Create: `src/components/ui.jsx`
- Create: `src/components/Sidebar.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: UI-Primitives**

Datei `src/components/ui.jsx`:

```jsx
import React from "react";

export const Field = ({ label, children }) => (
  <label className="field">
    <span className="label">{label}</span>
    {children}
  </label>
);

export const Input = ({ value, onChange, ...rest }) => (
  <input className="input" value={value ?? ""} onChange={e => onChange(e.target.value)} {...rest} />
);

export const NumberInput = ({ value, onChange }) => (
  <input
    className="input" type="number" min="0" max="20"
    value={value ?? 0}
    onChange={e => onChange(parseInt(e.target.value || "0", 10))}
  />
);

export const Hint = ({ children }) => (
  <span style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 2, lineHeight: 1.4 }}>
    {children}
  </span>
);
```

- [ ] **Step 2: Sidebar.jsx (ohne Forms — die kommen in Task 10)**

Datei `src/components/Sidebar.jsx`:

```jsx
import React from "react";

export const Sidebar = ({
  templates,
  templateId,
  onSelectTemplate,
  format,
  formats,
  onSelectFormat,
  variant,
  variants,
  onSelectVariant,
  formatLabels,
  children,
}) => {
  const showVariants = variants.length > 1;

  return (
    <aside className="sidebar">
      <div className="tabs" style={{ gridTemplateColumns: `repeat(${Object.keys(templates).length}, 1fr)` }}>
        {Object.entries(templates).map(([id, t]) => (
          <button
            key={id}
            className={`tab ${templateId === id ? "active" : ""}`}
            onClick={() => onSelectTemplate(id)}
            title={t.sublabel}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="form">
        <div className="form-section-title">Format</div>
        <div className="pillgroup">
          {formats.map(f => (
            <button
              key={f}
              className={`pill ${format === f ? "active" : ""}`}
              onClick={() => onSelectFormat(f)}
            >
              {formatLabels[f]}
            </button>
          ))}
        </div>

        {showVariants && (
          <>
            <div className="form-section-title">Variante</div>
            <div className="pillgroup">
              {variants.map(v => (
                <button
                  key={v.id}
                  className={`pill ${v.accent === "orange" ? "accent-orange" : ""} ${variant === v.id ? "active" : ""}`}
                  onClick={() => onSelectVariant(v.id)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </>
        )}

        {children}
      </div>
    </aside>
  );
};
```

- [ ] **Step 3: catalog.js (Templates + Formate)**

Datei `src/catalog.js`:

```js
import { MatchResult } from "./templates/MatchResult.jsx";
import { MatchAnnouncement } from "./templates/MatchAnnouncement.jsx";
import { SeasonSchedule } from "./templates/SeasonSchedule.jsx";
import { EventCard } from "./templates/EventCard.jsx";

export const TEMPLATES = {
  "match-result": {
    label: "Ergebnis",
    sublabel: "Spiel-Ergebnis nach Heimspiel",
    formats: ["square", "story"],
    variants: [
      { id: "win",   label: "Sieg",       accent: "blue" },
      { id: "loss",  label: "Niederlage", accent: "gray" },
      { id: "pokal", label: "Pokal",      accent: "orange" },
    ],
    Component: MatchResult,
    defaults: {
      team: "Herren 30",
      home: 6, away: 3,
      opponent: "Olper TC",
      date: "09.05.2026",
      location: "Heimspiel",
      league: "Kreisliga",
    },
  },
  "match-announcement": {
    label: "Heimspiel",
    sublabel: "Ankündigung vor dem Match",
    formats: ["square", "portrait", "story"],
    variants: [
      { id: "league", label: "Liga",  accent: "blue" },
      { id: "pokal",  label: "Pokal", accent: "orange" },
    ],
    Component: MatchAnnouncement,
    defaults: {
      team: "Herren 40",
      opponent: "Tennisclub Iserlohn",
      dateLine1: "30. Mai",
      dateLine2: "13:00 Uhr",
      league: "Südwestfalenliga",
      location: "Tennisanlage Burg Schnellenberg",
      cta: "Komm vorbei",
      eyebrow: "Nächstes Heimspiel",
    },
  },
  "season-schedule": {
    label: "Saison",
    sublabel: "Mannschafts-Übersicht",
    formats: ["portrait", "story"],
    variants: [{ id: "default", label: "Standard", accent: "blue" }],
    Component: SeasonSchedule,
    defaults: {
      eyebrow: "Saison 2026",
      title: "Unsere Mannschaften",
      subtitle: "Sommer 2026",
      slogan: "Der an der Burg",
    },
  },
  "event-card": {
    label: "Event",
    sublabel: "Sommerfest, JHV, Arbeitseinsatz …",
    formats: ["square", "portrait", "story"],
    variants: [{ id: "default", label: "Standard", accent: "green" }],
    Component: EventCard,
    defaults: {
      eyebrow: "Vereinsevent",
      title: "Sommerfest 2026",
      dateLine1: "23. August",
      dateLine2: "15:00 Uhr",
      subline: "Familienprogramm · Schleifchenturnier · Grill",
      location: "Tennisanlage Burg Schnellenberg",
      cta: "Wir freuen uns auf euch",
    },
  },
};

export const FORMAT_DIMS = {
  square:   { w: 1080, h: 1080, label: "Square 1:1" },
  portrait: { w: 1080, h: 1350, label: "Portrait 4:5" },
  story:    { w: 1080, h: 1920, label: "Story 9:16" },
};
```

- [ ] **Step 4: App.jsx mit Sidebar + State**

Ersetze `src/App.jsx`:

```jsx
import React, { useState } from "react";
import { TopBar } from "./components/TopBar.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { TEMPLATES, FORMAT_DIMS } from "./catalog.js";

export default function App() {
  const [templateId, setTemplateId] = useState("match-result");
  const [format, setFormat] = useState("square");
  const [variant, setVariant] = useState("win");
  const [data, setData] = useState(TEMPLATES["match-result"].defaults);
  const [downloadStatus, setDownloadStatus] = useState("idle");

  const tpl = TEMPLATES[templateId];

  const switchTemplate = (id) => {
    const t = TEMPLATES[id];
    setTemplateId(id);
    setFormat(t.formats[0]);
    setVariant(t.variants[0].id);
    setData(t.defaults);
  };

  const formatLabels = Object.fromEntries(
    Object.entries(FORMAT_DIMS).map(([k, v]) => [k, v.label])
  );

  return (
    <div className="app">
      <TopBar onDownload={() => {}} downloadStatus={downloadStatus} />
      <div className="body">
        <Sidebar
          templates={TEMPLATES}
          templateId={templateId}
          onSelectTemplate={switchTemplate}
          format={format}
          formats={tpl.formats}
          onSelectFormat={setFormat}
          variant={variant}
          variants={tpl.variants}
          onSelectVariant={setVariant}
          formatLabels={formatLabels}
        >
          <div style={{ marginTop: 16, padding: 12, background: "var(--gray-50)", borderRadius: 8, color: "var(--gray-600)", fontSize: 13 }}>
            Form coming in Task 10
          </div>
        </Sidebar>
        <main className="stage">
          <div style={{ padding: 24, color: "var(--gray-500)" }}>
            Preview coming in Task 9 — current state: {templateId} / {format} / {variant}
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Im Browser sichten**

`npm run dev`. Tabs oben in Sidebar müssen klickbar sein, Format-Pills + Varianten-Pills schalten den State um (sichtbar in der Stage-Text-Anzeige).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui.jsx src/components/Sidebar.jsx src/catalog.js src/App.jsx
git commit -m "feat(ui): sidebar with template tabs + format/variant pills"
```

---

## Task 9: Preview mit Auto-Scaling

**Files:**
- Create: `src/components/Preview.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Preview.jsx**

Datei `src/components/Preview.jsx`:

```jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { FORMAT_DIMS } from "../catalog.js";

export const Preview = ({ template, format, variant, data, onReset, previewRef }) => {
  const dims = FORMAT_DIMS[format];
  const stageRef = useRef(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const compute = () => {
      const el = stageRef.current;
      if (!el) return;
      const padding = 64;
      const availW = el.clientWidth - padding;
      const availH = el.clientHeight - padding;
      const s = Math.min(availW / dims.w, availH / dims.h, 1);
      setScale(s > 0 ? s : 0.5);
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener("resize", compute);
    return () => { ro.disconnect(); window.removeEventListener("resize", compute); };
  }, [dims.w, dims.h]);

  const Component = template.Component;
  const componentProps = useMemo(() => {
    const props = { format, data };
    if (template.variants.length > 1) props.variant = variant;
    return props;
  }, [format, variant, data, template]);

  return (
    <main className="stage">
      <div className="stage-toolbar">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-700)" }}>
            {template.label} · {dims.label}
          </span>
          <span style={{ fontSize: 12, color: "var(--gray-500)" }}>
            Vorschau {Math.round(scale * 100)} % · {dims.w}×{dims.h} px
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={onReset}>Reset</button>
        </div>
      </div>
      <div className="stage-canvas" ref={stageRef}>
        <div className="preview-frame" style={{ width: dims.w * scale, height: dims.h * scale }}>
          <div className="preview-scaler" style={{ transform: `scale(${scale})`, width: dims.w, height: dims.h }}>
            <div ref={previewRef}>
              <Component {...componentProps} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
```

- [ ] **Step 2: App.jsx — Preview einbinden**

Ersetze den `<main className="stage">…</main>` Block in `src/App.jsx` durch:

```jsx
<Preview
  template={tpl}
  format={format}
  variant={variant}
  data={data}
  onReset={() => setData(tpl.defaults)}
  previewRef={previewRef}
/>
```

Imports erweitern und `previewRef` definieren:

```jsx
import React, { useState, useRef } from "react";
import { Preview } from "./components/Preview.jsx";
// …
const previewRef = useRef(null);
```

- [ ] **Step 3: Im Browser sichten**

`npm run dev` → Live-Preview erscheint, automatisch skaliert. Tab-/Format-/Variant-Wechsel ändert die Vorschau.

- [ ] **Step 4: Commit**

```bash
git add src/components/Preview.jsx src/App.jsx
git commit -m "feat(preview): live preview with auto-scaling"
```

---

## Task 10: Forms (Match-Result, Match-Announcement, Season-Schedule, Event-Card)

**Files:**
- Create: `src/components/forms/MatchResultForm.jsx`
- Create: `src/components/forms/MatchAnnouncementForm.jsx`
- Create: `src/components/forms/SeasonScheduleForm.jsx`
- Create: `src/components/forms/EventCardForm.jsx`
- Modify: `src/App.jsx` (Forms einsetzen)

Quelle: `~/PycharmProjects/tcbw-homepage/claude-design/app-mockup.html` Zeilen ~310–530 enthalten alle 4 Forms. Wir portieren sie 1:1 in eigene Module.

- [ ] **Step 1: TeamSelect-Komponente — als shared util**

In `src/components/ui.jsx` ergänzen:

```jsx
import teamsData from "../data/teams.json";

export const TEAM_OPTIONS = Object.keys(teamsData);
export const TEAMS_DATA = teamsData;

export const TeamSelect = ({ value, onChange }) => (
  <select className="select" value={value ?? ""} onChange={e => onChange(e.target.value)}>
    {TEAM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
  </select>
);
```

- [ ] **Step 2: MatchResultForm**

Datei `src/components/forms/MatchResultForm.jsx`:

```jsx
import React from "react";
import { Field, Input, NumberInput, Hint, TeamSelect, TEAMS_DATA } from "../ui.jsx";
import { resolveTeamMode, findMatchIndex } from "../../lib/resolve-team-mode.js";
import { matchLabel } from "../../lib/format-date.js";

export const MatchResultForm = ({ data, set, variant }) => {
  const mode = resolveTeamMode(data.team, variant, TEAMS_DATA);
  const selectedIdx = mode.matches ? findMatchIndex(data.team, data.opponent, data.date, TEAMS_DATA) : -1;

  return (
    <>
      <div className="form-section-title">Mannschaft & Spiel</div>
      <Field label="Mannschaft">
        <TeamSelect value={data.team} onChange={v => {
          const t = TEAMS_DATA[v];
          const newMode = resolveTeamMode(v, variant, TEAMS_DATA);
          if (newMode.isPokal) {
            set({ team: v, league: t.league, opponent: "", date: "", location: "Heimspiel" });
          } else {
            const m = t.matches[0];
            set({
              team: v, league: t.league,
              opponent: m.opponent, date: m.date,
              location: m.home ? "Heimspiel" : "Auswärts",
            });
          }
        }} />
        <Hint>Liga: <strong>{mode.league}</strong></Hint>
      </Field>

      {mode.isPokal ? (
        <>
          <Field label="Gegner">
            <Input value={data.opponent} onChange={v => set({ opponent: v })} placeholder="Gegner manuell eintragen" />
            <Hint>Pokal — nächste Runde unbekannt, bitte manuell eintragen.</Hint>
          </Field>
          <Field label="Datum">
            <Input value={data.date} onChange={v => set({ date: v })} placeholder="z.B. 04.07.2026" />
          </Field>
          <Field label="Ort">
            <select className="select" value={data.location ?? "Heimspiel"} onChange={e => set({ location: e.target.value })}>
              <option>Heimspiel</option>
              <option>Auswärts</option>
            </select>
          </Field>
        </>
      ) : (
        <Field label="Spiel">
          <select className="select" value={selectedIdx} onChange={e => {
            const m = mode.matches[parseInt(e.target.value, 10)];
            set({ opponent: m.opponent, date: m.date, location: m.home ? "Heimspiel" : "Auswärts" });
          }}>
            {mode.matches.map((m, i) => (
              <option key={i} value={i}>{matchLabel(m)}</option>
            ))}
          </select>
          <Hint>Spielplan aus liga.nu — Datum, Uhrzeit, Heim/Auswärts werden automatisch übernommen.</Hint>
        </Field>
      )}

      <div className="form-section-title">Ergebnis</div>
      <div className="field-row">
        <Field label="Wir"><NumberInput value={data.home} onChange={v => set({ home: v })} /></Field>
        <Field label="Gegner"><NumberInput value={data.away} onChange={v => set({ away: v })} /></Field>
      </div>
    </>
  );
};
```

- [ ] **Step 3: MatchAnnouncementForm**

Datei `src/components/forms/MatchAnnouncementForm.jsx`:

```jsx
import React from "react";
import { Field, Input, Hint, TeamSelect, TEAMS_DATA } from "../ui.jsx";
import { resolveTeamMode } from "../../lib/resolve-team-mode.js";
import { formatDateLong, matchLabel } from "../../lib/format-date.js";

export const MatchAnnouncementForm = ({ data, set, variant }) => {
  const mode = resolveTeamMode(data.team, variant, TEAMS_DATA);
  const homeMatches = mode.matches?.filter(m => m.home) ?? null;
  const selectedIdx = homeMatches
    ? homeMatches.findIndex(m => m.opponent === data.opponent && formatDateLong(m.date) === data.dateLine1)
    : -1;

  return (
    <>
      <div className="form-section-title">Mannschaft & Spiel</div>
      <Field label="Mannschaft">
        <TeamSelect value={data.team} onChange={v => {
          const t = TEAMS_DATA[v];
          const newMode = resolveTeamMode(v, variant, TEAMS_DATA);
          if (newMode.isPokal) {
            set({ team: v, league: t.league, opponent: "", dateLine1: "", dateLine2: "" });
          } else {
            const home = t.matches.filter(m => m.home);
            const m = home[0] ?? t.matches[0];
            set({
              team: v, league: t.league,
              opponent: m.opponent,
              dateLine1: formatDateLong(m.date),
              dateLine2: m.time + " Uhr",
            });
          }
        }} />
        <Hint>Liga: <strong>{mode.league}</strong></Hint>
      </Field>

      {mode.isPokal ? (
        <>
          <Field label="Gegner">
            <Input value={data.opponent} onChange={v => set({ opponent: v })} placeholder="Gegner manuell eintragen" />
            <Hint>Pokal — nächste Runde unbekannt, bitte manuell eintragen.</Hint>
          </Field>
          <div className="field-row">
            <Field label="Datum"><Input value={data.dateLine1} onChange={v => set({ dateLine1: v })} placeholder="30. Mai" /></Field>
            <Field label="Uhrzeit"><Input value={data.dateLine2} onChange={v => set({ dateLine2: v })} placeholder="13:00 Uhr" /></Field>
          </div>
        </>
      ) : homeMatches && homeMatches.length > 0 ? (
        <Field label="Heimspiel">
          <select className="select" value={selectedIdx} onChange={e => {
            const m = homeMatches[parseInt(e.target.value, 10)];
            set({
              opponent: m.opponent,
              dateLine1: formatDateLong(m.date),
              dateLine2: m.time + " Uhr",
            });
          }}>
            {homeMatches.map((m, i) => (
              <option key={i} value={i}>{matchLabel(m)}</option>
            ))}
          </select>
          <Hint>Nur Heimspiele — Datum & Uhrzeit werden aus liga.nu übernommen.</Hint>
        </Field>
      ) : (
        <Hint>Diese Mannschaft hat keine Heimspiele in der aktuellen Saison.</Hint>
      )}

      <div className="form-section-title">Beschriftung</div>
      <Field label="Eyebrow (oben)"><Input value={data.eyebrow} onChange={v => set({ eyebrow: v })} placeholder="z.B. Nächstes Heimspiel" /></Field>
      <Field label="CTA (unten)"><Input value={data.cta} onChange={v => set({ cta: v })} placeholder="z.B. Komm vorbei" /></Field>
      <Field label="Ort"><Input value={data.location} onChange={v => set({ location: v })} /></Field>
    </>
  );
};
```

- [ ] **Step 4: SeasonScheduleForm**

Datei `src/components/forms/SeasonScheduleForm.jsx`:

```jsx
import React from "react";
import { Field, Input } from "../ui.jsx";

export const SeasonScheduleForm = ({ data, set }) => (
  <>
    <div className="form-section-title">Header</div>
    <Field label="Eyebrow"><Input value={data.eyebrow} onChange={v => set({ eyebrow: v })} /></Field>
    <Field label="Titel"><Input value={data.title} onChange={v => set({ title: v })} /></Field>
    <Field label="Untertitel"><Input value={data.subtitle} onChange={v => set({ subtitle: v })} /></Field>
    <Field label="Slogan"><Input value={data.slogan} onChange={v => set({ slogan: v })} /></Field>
    <div className="form-section-title">Mannschaften</div>
    <div style={{ fontSize: 12, color: "var(--gray-500)", lineHeight: 1.5 }}>
      Die Mannschaftsliste kommt aus dem Spielplan-Datensatz und wird automatisch verwendet.
    </div>
  </>
);
```

- [ ] **Step 5: EventCardForm**

Datei `src/components/forms/EventCardForm.jsx`:

```jsx
import React from "react";
import { Field, Input } from "../ui.jsx";

export const EventCardForm = ({ data, set }) => (
  <>
    <div className="form-section-title">Event</div>
    <Field label="Eyebrow"><Input value={data.eyebrow} onChange={v => set({ eyebrow: v })} placeholder="z.B. Vereinsevent" /></Field>
    <Field label="Titel"><Input value={data.title} onChange={v => set({ title: v })} placeholder="z.B. Sommerfest 2026" /></Field>

    <div className="form-section-title">Termin</div>
    <div className="field-row">
      <Field label="Datum"><Input value={data.dateLine1} onChange={v => set({ dateLine1: v })} placeholder="23. August" /></Field>
      <Field label="Uhrzeit"><Input value={data.dateLine2} onChange={v => set({ dateLine2: v })} placeholder="15:00 Uhr" /></Field>
    </div>

    <div className="form-section-title">Beschriftung</div>
    <Field label="Untertitel"><Input value={data.subline} onChange={v => set({ subline: v })} placeholder="kurze Beschreibung" /></Field>
    <Field label="CTA"><Input value={data.cta} onChange={v => set({ cta: v })} /></Field>
    <Field label="Ort"><Input value={data.location} onChange={v => set({ location: v })} /></Field>
  </>
);
```

- [ ] **Step 6: App.jsx — Forms einsetzen**

In `src/App.jsx` ergänzen:

```jsx
import { MatchResultForm } from "./components/forms/MatchResultForm.jsx";
import { MatchAnnouncementForm } from "./components/forms/MatchAnnouncementForm.jsx";
import { SeasonScheduleForm } from "./components/forms/SeasonScheduleForm.jsx";
import { EventCardForm } from "./components/forms/EventCardForm.jsx";

const FORM_BY_TEMPLATE = {
  "match-result":       MatchResultForm,
  "match-announcement": MatchAnnouncementForm,
  "season-schedule":    SeasonScheduleForm,
  "event-card":         EventCardForm,
};
```

Innerhalb der `App`-Komponente:

```jsx
const Form = FORM_BY_TEMPLATE[templateId];
const set = (patch) => setData(d => ({ ...d, ...patch }));
```

Den Sidebar-Children-Block ersetzen:

```jsx
<Sidebar … >
  <Form data={data} set={set} variant={variant} />
</Sidebar>
```

- [ ] **Step 7: Im Browser sichten**

`npm run dev` → vollständige App mit Mannschafts-Dropdown, Spiel-Dropdown, Live-Preview. Klickwege durchspielen:
- Match-Result: Mannschaft wechseln → Spiel-Dropdown füllt sich neu
- Match-Result: Variante „Pokal" → Felder werden Freitext
- Heimspiel-Ankündigung: nur Heimspiele im Dropdown
- Saison: Defaults rendern
- Event: Felder editierbar, Preview aktualisiert

- [ ] **Step 8: Commit**

```bash
git add src/components/forms/ src/components/ui.jsx src/App.jsx
git commit -m "feat(forms): all 4 template forms with team/match auto-fill"
```

---

## Task 11: PNG-Download (Single)

**Files:**
- Create: `src/lib/download-png.js`
- Modify: `src/App.jsx` (onDownload-Handler)

- [ ] **Step 1: download-png.js**

Datei `src/lib/download-png.js`:

```js
import { toPng } from "html-to-image";
import { FORMAT_DIMS } from "../catalog.js";

export async function downloadPng(node, { templateId, variant, format }) {
  const dims = FORMAT_DIMS[format];
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 1,
    width: dims.w,
    height: dims.h,
    style: { transform: "none", transformOrigin: "top left" },
  });
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.download = `tcbw_${templateId}_${variant}_${format}_${stamp}.png`;
  a.href = dataUrl;
  a.click();
}
```

- [ ] **Step 2: App.jsx — handler einbauen**

```jsx
import { downloadPng } from "./lib/download-png.js";
// …
const onDownload = async () => {
  if (!previewRef.current) return;
  setDownloadStatus("working");
  try {
    await downloadPng(previewRef.current, { templateId, variant, format });
    setDownloadStatus("done");
    setTimeout(() => setDownloadStatus("idle"), 1800);
  } catch (e) {
    console.error(e);
    alert("Download fehlgeschlagen — Konsole ansehen");
    setDownloadStatus("idle");
  }
};
```

`<TopBar onDownload={onDownload} … />` (statt der leeren `() => {}`-Funktion).

- [ ] **Step 3: Smoke-Test**

`npm run dev` → Button „PNG herunterladen" klicken → Browser-Download startet → PNG öffnen → Auflösung muss z.B. 1080×1080 sein, nicht skaliert.

- [ ] **Step 4: Commit**

```bash
git add src/lib/download-png.js src/App.jsx
git commit -m "feat(download): single-PNG export via html-to-image"
```

---

## Task 12: ZIP-Download (Alle Formate)

**Files:**
- Modify: `src/lib/download-png.js` (Funktion ergänzen)
- Modify: `src/components/Preview.jsx` (HiddenRenderer ergänzen)
- Modify: `src/App.jsx` (zweiten Button)
- Modify: `src/components/TopBar.jsx` (zweiten Button)

**Architektur-Entscheidung:** Das Single-Preview im DOM zeigt nur das aktuell gewählte Format. Für die ZIP brauchen wir Snapshots aller Formate des aktuellen Templates. Lösung: ein „Hidden Renderer", der alle Formate parallel im DOM rendert (off-screen positioniert), aus dem dann Format-für-Format gesnapshotet wird.

- [ ] **Step 1: HiddenRenderer-Komponente**

In `src/components/Preview.jsx` ergänzen (forwardRef damit App den Container-Knoten queryen kann):

```jsx
export const HiddenRenderer = React.forwardRef(({ template, variant, data, formats }, ref) => {
  const Component = template.Component;
  return (
    <div ref={ref} style={{ position: "absolute", left: -99999, top: 0, pointerEvents: "none" }}>
      {formats.map(f => {
        const dims = FORMAT_DIMS[f];
        const props = { format: f, data };
        if (template.variants.length > 1) props.variant = variant;
        return (
          <div key={f} data-format={f} style={{ width: dims.w, height: dims.h }}>
            <Component {...props} />
          </div>
        );
      })}
    </div>
  );
});
```

- [ ] **Step 2: downloadAllFormats-Funktion in lib**

In `src/lib/download-png.js` ergänzen:

```js
import JSZip from "jszip";

/** Erwartet einen Container-Node, der pro Format ein <div data-format="…"> Kind hat. */
export async function downloadAllFormats(containerNode, { templateId, variant }) {
  const nodes = Array.from(containerNode.querySelectorAll("[data-format]"));
  const zip = new JSZip();
  const stamp = new Date().toISOString().slice(0, 10);

  for (const node of nodes) {
    const f = node.dataset.format;
    const dims = FORMAT_DIMS[f];
    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 1,
      width: dims.w,
      height: dims.h,
    });
    zip.file(`tcbw_${templateId}_${variant}_${f}_${stamp}.png`, dataUrl.split(",")[1], { base64: true });
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = `tcbw_${templateId}_${variant}_${stamp}.zip`;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: App.jsx — HiddenRenderer + Handler einbauen**

Imports erweitern:

```jsx
import { Preview, HiddenRenderer } from "./components/Preview.jsx";
import { downloadPng, downloadAllFormats } from "./lib/download-png.js";
```

In `App`-Komponente:

```jsx
const hiddenRef = useRef(null);

const onDownloadAll = async () => {
  if (!hiddenRef.current) return;
  setDownloadStatus("working");
  try {
    await downloadAllFormats(hiddenRef.current, { templateId, variant });
    setDownloadStatus("done");
    setTimeout(() => setDownloadStatus("idle"), 1800);
  } catch (e) {
    console.error(e);
    alert("ZIP-Download fehlgeschlagen — Konsole ansehen");
    setDownloadStatus("idle");
  }
};
```

Vor dem schließenden `</div>` der App den HiddenRenderer einfügen:

```jsx
<HiddenRenderer ref={hiddenRef} template={tpl} variant={variant} data={data} formats={tpl.formats} />
```

TopBar-Aufruf um `onDownloadAll` ergänzen:

```jsx
<TopBar onDownload={onDownload} onDownloadAll={onDownloadAll} downloadStatus={downloadStatus} />
```

- [ ] **Step 4: TopBar.jsx — zweiten Button**

In `src/components/TopBar.jsx` den Button-Block ersetzen:

```jsx
<button className="btn btn-ghost" onClick={onDownloadAll} disabled={downloadStatus === "working"}>
  ZIP (alle Formate)
</button>
<button className="btn btn-primary" onClick={onDownload} disabled={downloadStatus === "working"}>
  <span style={{ fontSize: 16, lineHeight: 1 }}>↓</span>
  PNG herunterladen
</button>
```

Props-Signature: `({ onDownload, onDownloadAll, downloadStatus })`.

- [ ] **Step 5: Smoke-Test**

`npm run dev`, Match-Result wählen → ZIP-Button klicken → ZIP-Datei mit den Formaten des Templates (square + story bei Match-Result) wird heruntergeladen, jedes PNG in voller 1080-px-Auflösung.

- [ ] **Step 6: Commit**

```bash
git add src/lib/download-png.js src/App.jsx src/components/Preview.jsx src/components/TopBar.jsx
git commit -m "feat(download): zip export with all formats"
```

---

## Task 13: README + Deploy auf Cloudflare Pages

**Files:**
- Create: `README.md`
- Create: GitHub Repo `ElGarno/tcbw-social-tools`
- Cloudflare Pages Project verbinden
- Cloudflare Access Application konfigurieren

- [ ] **Step 1: README.md**

Datei `README.md`:

```markdown
# tcbw-social-tools

Internes Werkzeug für TC Blau-Weiss Attendorn: erzeugt Instagram-fertige Grafiken (Match-Ergebnis, Heimspiel-Ankündigung, Saison-Übersicht, Event) per Form-Eingabe.

**Zugriff:** https://social.tc-bw-attendorn.de (geschützt durch Cloudflare Access — Email-Whitelist).

## Lokale Entwicklung

```bash
git clone git@github.com:ElGarno/tcbw-social-tools.git
cd tcbw-social-tools
npm install
npm run dev
```

Voraussetzung: das Schwester-Repo `tcbw-homepage` muss parallel ausgecheckt sein (`../tcbw-homepage/`), weil das Build-Script die Mannschaftsdaten von dort liest.

## Build

```bash
npm run build
```

Erzeugt `dist/`. Der `prebuild`-Hook regeneriert `src/data/teams.json` aus `../tcbw-homepage/content/mannschaften/*.md`.

## Tests

```bash
npm test
```

## Deployment

Cloudflare Pages baut automatisch bei jedem Push auf `main`.

- **Build-Command:** `npm run build`
- **Output:** `dist`
- **Cross-Repo:** Cloudflare Pages-Build muss tcbw-homepage parallel auschecken (siehe `.cloudflare/build.sh`).
```

- [ ] **Step 2: GitHub Repo anlegen**

```bash
gh repo create ElGarno/tcbw-social-tools --public --source=. --push
```

(`gh` muss authentifiziert sein.)

- [ ] **Step 3: Cloudflare Pages — Cross-Repo-Setup**

Cloudflare Pages baut nur ein Repo aus. Damit das Build-Script auf `../tcbw-homepage/content/mannschaften/` zugreifen kann, brauchen wir entweder:

**Option A (empfohlen):** Pre-Build-Script, das tcbw-homepage clonet.

Datei `.cloudflare/build.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

if [ ! -d ../tcbw-homepage ]; then
  cd ..
  git clone --depth 1 https://github.com/ElGarno/tcbw-homepage.git
  cd tcbw-social-tools
fi

npm run build
```

In Cloudflare Pages → Settings → Builds & deployments:
- **Build command:** `bash .cloudflare/build.sh`
- **Output directory:** `dist`
- **Node version:** 20

```bash
chmod +x .cloudflare/build.sh
git add .cloudflare/build.sh README.md
git commit -m "chore: cloudflare pages build script + readme"
git push
```

- [ ] **Step 4: Cloudflare Pages Projekt verbinden**

Manuell im Cloudflare Dashboard:

1. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git** → Repo `ElGarno/tcbw-social-tools` auswählen
2. Build settings wie oben
3. Deploy starten — beim ersten Lauf läuft `bash .cloudflare/build.sh`, Output landet in `dist/`
4. Default-URL `tcbw-social-tools.pages.dev` ist live

- [ ] **Step 5: Custom Domain**

Im Pages-Projekt → **Custom domains** → `social.tc-bw-attendorn.de` hinzufügen. CNAME wird automatisch in der DNS-Zone (die liegt schon bei Cloudflare wegen Hauptseite) gesetzt.

- [ ] **Step 6: Cloudflare Access konfigurieren**

1. **Zero Trust Dashboard** → **Access** → **Applications** → **Add an application** → **Self-hosted**
2. Application Domain: `social.tc-bw-attendorn.de`
3. Application Policy:
   - Name: „Vereinsmitglieder"
   - Action: **Allow**
   - Include: **Emails** mit Whitelist (Vorstand + Mannschaftsführer)
4. Identity Provider: **One-time PIN** (Default — User bekommt 6-stelligen Code per Email)

Liste der initial erlaubten Emails — vom User holen, vorher nicht im Plan steckend. Mindestens:
- `vorstand@tc-bw-attendorn.de`
- Email Bastian Gerlach
- Email Felix Kersting
- Email Paula Kersting (Marketing)

- [ ] **Step 7: End-to-End-Test**

In einem Privatfenster `https://social.tc-bw-attendorn.de` öffnen:
- Cloudflare Access fragt nach Email
- One-Time-PIN per Email kommt
- Nach Eingabe: App lädt
- Match-Ergebnis erstellen, PNG herunterladen, Bild öffnen — Pixel-perfekt 1080×1080

- [ ] **Step 8: Final Commit**

```bash
git add README.md .cloudflare/
git commit -m "docs: deployment readme + cloudflare access setup notes"
git push
```

---

## Self-Review Checklist (vor Übergabe)

- [ ] Alle 13 Tasks haben echten Code, keine TBDs
- [ ] Spec-Punkte ↔ Tasks: jeder MUST/SHOULD-Requirement aus der Spec hat einen Task (Match-Result/Announcement/Season/Event jeweils Task 6 + 10; ZIP = Task 12; Auth = Task 13; Spiel-Dropdown = Task 10; Pokal-Mode = Task 10; Reset-Button = Task 9)
- [ ] Type-Konsistenz: `mode.matches` (nicht `mode.opponents` aus älterer Mockup-Version) ist überall `findMatchIndex` ist konsistent benannt
- [ ] Pfade: `~/PycharmProjects/tcbw-homepage/` als Quell-Repo, `~/PycharmProjects/tcbw-social-tools/` als Ziel
- [ ] Templates aus Quell-Repo werden 1:1 portiert mit dokumentierten Vite-Anpassungen (`src="/wappen.png"` statt `src="assets/wappen.png"`)
- [ ] Build-Script ist TDD'd (Task 3), Lib-Helpers sind TDD'd (Task 4); UI ist visuell getestet
- [ ] Cloudflare Access kommt am Ende, nicht vorher — sonst kann der Engineer nicht im Browser testen

## Bekannte Risiken / Out-of-Plan

- **Cross-Repo-Build:** Wenn jemand das tcbw-homepage Repo umbenennt oder verschiebt, bricht der Build. Lösung würde im nuliga-sync-style sein (Hugo bietet `/api/teams.json` an); aktuell out-of-scope.
- **JSZip Bundle-Größe:** ~100 KB minified. Wenn das Bundle-Size-Budget eng wird, ZIP-Feature streichen oder Lazy-Load.
- **html-to-image und custom Fonts:** Bekanntes Issue — Fonts müssen vor dem Snapshot geladen sein. `useEffect` mit `document.fonts.ready` als Vorsorge falls erste PNG-Generierung das DM-Sans nicht aufnimmt.

## Execution Handoff

**Plan complete and saved to `doc/plans/2026-05-08-tcbw-social-tools-implementation.md`.**

Empfohlener Ablauf für die fresh Claude im neuen Verzeichnis:

1. `cd ~/PycharmProjects/tcbw-social-tools` (Verzeichnis existiert nach Task 1)
2. Plan + Spec einlesen (Pfade oben)
3. Task-für-Task abarbeiten — entweder per `superpowers:executing-plans` (inline) oder `superpowers:subagent-driven-development` (Subagents)

**Geschätzter Aufwand:** 6–8 Stunden konzentrierte Arbeit für Tasks 1–11 + 12 (ZIP). Task 13 (Deploy + Access) ~1 Stunde plus Wartezeit auf DNS-Propagation und manuelle CF-Dashboard-Klicks.
