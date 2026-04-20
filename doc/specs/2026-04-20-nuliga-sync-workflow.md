# Spec: Liga.nu Auto-Sync Workflow

## Overview

Automate the sync of match dates and times from liga.nu (WTV) into the
Hugo content. A daily n8n workflow scrapes all 7 team group pages, diffs
against the current Markdown content, and creates a Draft-PR on GitHub
when changes are detected. **Never deletes** existing entries — only
updates and adds, with a notification when a match disappears from
liga.nu so a human can decide.

Runs at 06:00 Europe/Berlin, before the existing Daily Deploy cron at
06:30. Both workflows stay independent.

## Flow

```
n8n Cron (06:00 Berlin)
  → Read repo state via GitHub API (Mannschafts-MDs + termine/_index.md)
  → Loop over 7 liga.nu group URLs
      → HTTP Request (HTML)
      → Code Node: cheerio parser → JSON match list
  → Diff Engine (Code Node, JS):
      → Per team: compare existing MD table vs liga.nu match list
      → Detect Updates (date/time changed), Adds (new match), Missings (gone from liga.nu)
      → Apply same logic to home matches in termine/_index.md (matched via "team" marker field)
  → If no changes → END (no PR, no Pushover)
  → GitHub API: branch + commit (Git Trees API) + Draft-PR
  → Pushover notification with PR link
```

## Components

### 1. n8n Workflow `nuliga-sync`

**Trigger:** Cron daily 06:00 Europe/Berlin
**Hosting:** existing Synology NAS n8n instance
**File:** `doc/specs/n8n-nuliga-sync.json`

**Nodes (in order):**
1. Cron trigger
2. GitHub API — read Mannschafts-MDs and `termine/_index.md` via Git Trees API
3. Loop over 7 group URLs
4. HTTP Request → liga.nu HTML
5. Code Node — cheerio parser per page (per-team try/catch)
6. Aggregate: collect all team match lists
7. Code Node — Diff Engine (compare vs current MDs, build change set)
8. If-Node — `changeSet.empty === true` → END
9. GitHub API — create branch + commit + Draft-PR (Git Trees API to avoid SHA conflicts, like Mail-to-Homepage workflow)
10. Pushover — notification with PR link

### 2. cheerio Parser

**Input:** liga.nu group page HTML

**Output:**
```js
{
  group: "67",
  team_name: "TC Blau-Weiß Attendorn 1",
  matches: [
    { date: "2026-05-09", time: "13:00", home: "TC Blau-Weiß Attendorn 1", guest: "Olper TC 1" },
    ...
  ]
}
```

**Logic (sketch):**
```js
const $ = cheerio.load(html);
const matches = [];
$('table.result-set tr').each((_, row) => {
  const cells = $(row).find('td').map((_, c) => $(c).text().trim()).get();
  if (cells.length < 5) return;
  const [dateStr, timeStr, homeTeam, guestTeam] = cells;
  if (!homeTeam.includes('Attendorn') && !guestTeam.includes('Attendorn')) return;
  matches.push({
    date: parseGermanDate(dateStr),
    time: timeStr.match(/\d{2}:\d{2}/)?.[0] ?? null,
    home: homeTeam,
    guest: guestTeam,
  });
});
return { group, team_name: detectTeamName(matches), matches };
```

Selectors get verified against the actual liga.nu HTML during
implementation (the example `table.result-set` is illustrative).

**Sanity checks (parser throws on these):**
- `matches.length === 0` → throw `"No matches found — liga.nu layout may have changed"`
- Date string not parseable → throw with raw cell content
- Workflow catches per-team errors → that team is skipped, other teams continue, Pushover error sent

### 3. Diff Engine — "never delete" principle

**Identity Key (avoids treating date-shifts as delete+add):**
```
identity = `${normalize(opponent)}|${isHome ? 'H' : 'A'}`
```
- `opponent` = the team in the row that does NOT contain "Attendorn"
- `normalize` does:
  - lowercase + collapse whitespace
  - strip suffix " e.V." / "e.V."
  - strip trailing " 1" (the default "first team" indicator) but **keep**
    " 2"/" 3"/… (those identify a different team within the same club)
  - normalize umlauts: ä↔ae, ö↔oe, ü↔ue, ß↔ss
- Implication: same opponent + same home/away = same logical match
  even if date/time changed

**Migration prerequisite:** Existing Mannschafts-MDs use abbreviated
opponent names (e.g. "TC RW Hagen" vs liga.nu's "TC Rot-Weiß Hagen 1").
Before first live run, MD opponent strings are aligned with liga.nu's
canonical format (stripped of " 1" and " e.V." for readability). This
is part of the implementation plan, not the workflow itself.

**Three change categories per team:**

| Category | Condition | Action |
|---|---|---|
| **Update** | identity match exists, but `date` or `time` differs | replace row in MD, list in PR body |
| **Add** | match in liga.nu, no identity match in MD | append row in MD, list in PR body |
| **Missing** | match in MD, no identity match in liga.nu | **NOT deleted**, listed under "⚠️ Missing" in PR body |

After updates+adds: rows are sorted chronologically before writing back.

### 4. Marker fields in `content/termine/_index.md`

To distinguish auto-syncable home matches from manual events
(Sommerfest, JHV, Arbeitseinsatz):

**One-time migration:** every existing `medenspiel` entry gets two new fields:
```yaml
- title: "Herren 30 vs. TuS Ferndorf 2"
  date: 2026-07-04
  time: "14:30 Uhr"
  detail: "Kreisliga, Heimspiel"
  category: "medenspiel"
  team: "herren-30"            # NEW — slug of mannschaften MD
  opponent: "TuS Ferndorf 2"   # NEW — opponent in liga.nu canonical form
                               # (e.V. stripped, trailing " 1" stripped, " 2"+ kept)
```

**Sync rules for `_index.md`:**
- Only entries with `category: "medenspiel"` AND `team` field are touched
- Match by `team` slug + normalized `opponent` → update `time` and `date`
- New home matches in liga.nu (identity not in `_index.md`): inserted with all 7 fields
- Entries without `team` (events): NEVER touched
- Missing home matches: NEVER deleted, only listed in PR body
- `detail` field: never overwritten (manually editable)

### 5. GitHub PR + Pushover

**Branch:** `nuliga-sync/YYYY-MM-DD-HHMM` (timestamp avoids branch collisions —
addresses the same issue noted in Mail-to-Homepage backlog)

**Commit:** `chore(termine): liga.nu sync YYYY-MM-DD`

**PR:**
- Title: `[nuliga] Sync YYYY-MM-DD: N Updates, M Adds, K Missing`
- Body: full changelog (see example below)
- **Draft-PR** (no auto-merge)
- Labels: `automated`, `nuliga-sync`

**Example PR body:**
```markdown
## Liga.nu Sync — 2026-04-21

### Geänderte Spiele
| Team | Spiel | Vorher | Neu |
|---|---|---|---|
| Herren 30 | TuS Ferndorf 2 (H) | 04.07. 13:00 | 04.07. 14:30 |
| Herren 60 | TC Esseltal (A) | 30.05. 13:00 | 16.05. 10:00 |

### Neue Spiele
(keine)

### ⚠️ Spiele nicht mehr in liga.nu
(keine)

### Termine in /termine/_index.md mit-aktualisiert
- Herren 30 vs. TuS Ferndorf 2 (04.07.) → 14:30
```

**Pushover:**
- Only on actual changes (PR-creation triggers it)
- Title: `Liga.nu Sync — Änderungen erkannt`
- Body: `N Updates, M Adds, K Missing — bitte PR reviewen`
- URL: PR link (clickable)

**Idempotency / PR collision:**
- Before opening a new PR, workflow checks for an existing open
  `nuliga-sync/...` PR
- If found AND new diffs are different from the existing PR's diff:
  add a comment to the existing PR with the additional changes
- If found AND new diffs are identical: no-op (no new PR, no
  duplicate Pushover)

### 6. Error Handling

| Error | Behavior |
|---|---|
| Parser throws (0 matches, unparseable dates) | per-team skip, other teams continue, Pushover error |
| HTTP error (liga.nu down) | n8n retry 3× / 2 min; if all fail → per-team skip + Pushover error |
| GitHub API error | workflow stops, Pushover error, no partial PR |
| Existing open nuliga-sync PR | comment on existing PR instead of opening new one |
| Sync still running at 06:30 (Daily Deploy time) | Deploy uses pre-sync state, sync gets picked up next day |

n8n stores execution logs (default 14 days) — used for postmortem.

### 7. Test Strategy

**Pre-launch:**
1. Run parser standalone against current liga.nu HTML → output diffs against
   current MDs should be 0 (baseline test)
2. Diff engine unit tests with synthetic inputs:
   - Identical → 0 changes
   - Time changed → 1 Update
   - Match removed from liga.nu → 1 Missing (not Delete)
   - New match in liga.nu → 1 Add
   - Date shift (same opponent, new day) → 1 Update (not Delete+Add)
3. Manual workflow run via n8n "Test Workflow" → verify no PR
   (current state is identical)
4. Forced diff test: locally edit a Mannschafts-MD time, push, trigger
   workflow → must create PR with correct Update row
5. Pushover smoke test with dummy diff

**Post-launch:**
- Monitor logs daily for first week
- Verify "Missing" warnings manually before deciding to delete

## Decisions

- **Never delete entries.** Even when liga.nu reports a match is gone,
  the workflow only flags it. Reason: parser bugs / liga.nu hiccups
  must never silently drop content (cf. Ennepetal incident on 2026-04-20).
- **Identity key without date.** Same opponent + home/away = same logical
  match. Date/time become updatable attributes, not part of identity.
- **Deterministic parser, no AI.** liga.nu HTML is stable, an AI call
  per team would cost more and obscure failure modes. If the parser ever
  breaks, the per-team error path catches it without corrupting data.
- **Marker field on Termine.** Explicit `team` + `opponent` fields make
  the auto-sync scope obvious and protect non-match events
  (Sommerfest, JHV) from being touched.
- **Pushover only on changes.** No notification noise on idle days.
- **Separate workflow from Daily Deploy.** Decoupled — sync failure
  cannot block deploy.
- **n8n on existing Synology NAS.** No new infrastructure.

## Cost Estimate

- HTTP fetches: 7/day × 365 = ~2.5k requests/year (negligible)
- GitHub API: free
- n8n: already running
- Pushover: already in use
- **Total: $0/year**

## Open Points (resolved during implementation)

- Exact cheerio selectors against the live liga.nu HTML (verified during
  parser development against a saved sample)
- Pre-existing Pushover credentials in n8n already configured (re-use)
- GitHub PAT scope: existing token from Mail-to-Homepage workflow has
  the required scopes (re-use)
