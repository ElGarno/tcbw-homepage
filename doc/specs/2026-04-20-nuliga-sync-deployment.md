# Liga.nu Sync Deployment

## Prerequisites

- n8n auf der Synology NAS (bereits vorhanden)
- Docker-Env-Var: `NODE_FUNCTION_ALLOW_EXTERNAL=cheerio,js-yaml`
- GitHub PAT mit `repo`-Scope (aus Mail-to-Homepage wiederverwenden)
- Pushover Credentials (bereits vorhanden)

## Einrichtung

### Schritt 1: n8n-Container Env-Var setzen

Im Docker-Compose von n8n:

```yaml
services:
  n8n:
    environment:
      - NODE_FUNCTION_ALLOW_EXTERNAL=cheerio,js-yaml
      - GITHUB_TOKEN=ghp_...               # PAT mit repo-scope
      - GITHUB_OWNER=ElGarno
      - GITHUB_REPO=tcbw-homepage
      - PUSHOVER_TOKEN=a...                # Pushover App Token
      - PUSHOVER_USER=u...                 # Pushover User Key
```

Danach Container neu starten.

### Schritt 2: Bundle erzeugen

```bash
cd tools/nuliga-sync
npm install
npm test                # alle Tests grün
npm run baseline        # 0 Aenderungen erwartet
npm run bundle          # schreibt dist/n8n-bundle.js
cat dist/n8n-bundle.js  # Inhalt kopieren
```

### Schritt 3: Workflow in n8n importieren

1. n8n UI → neuer Workflow → Menü → Import from File → `doc/specs/n8n-nuliga-sync.json`
2. Node "Sync Logic" öffnen
3. Im Code-Editor den Platzhalter
   ```
   // --- PASTE BUNDLE BELOW ---
   // ... entire content of tools/nuliga-sync/dist/n8n-bundle.js goes here ...
   // --- PASTE BUNDLE ABOVE ---
   ```
   ersetzen durch den Inhalt von `dist/n8n-bundle.js`.
4. Workflow speichern.

### Schritt 4: Test Run

- Button "Test workflow" klicken
- Erwartung: läuft in < 30s durch, Output des Sync-Logic-Nodes zeigt
  `{ changed: false }`, kein PR, kein Pushover, Path "Keine Aenderungen" wird genommen.

### Schritt 5: Forced Diff Test

Um einen echten Durchlauf zu testen:

1. Lokal eine Uhrzeit in einer Mannschafts-MD ändern, commiten, pushen auf `main`
2. Workflow "Test" klicken
3. Erwartung: Draft-PR auf GitHub, Pushover-Nachricht kommt an
4. PR wieder schließen + Commit zurückrollen

### Schritt 6: Aktivieren

Toggle oben rechts auf "Active" → läuft ab jetzt täglich 06:00 Europe/Berlin.

## Betrieb

- Sync läuft **06:00 Berlin**, vor Daily Deploy um **06:30**
- Drafts werden NICHT automatisch gemerged — menschliches Review nötig
- "Missing"-Einträge im PR-Body bitte manuell prüfen (Mannschaft zurückgezogen? oder Parser-Fehler?)
- Bundle bei Code-Änderungen neu generieren (`npm run bundle`) und im n8n-Node aktualisieren

## Troubleshooting

| Symptom | Ursache | Behebung |
|---|---|---|
| Sync-Logic Fehler "no matches found — liga.nu layout may have changed" | liga.nu HTML geändert | `npm run baseline`, HTML inspizieren, Selektoren in `parser.js` anpassen, Bundle neu bauen, in n8n paste |
| "Identity-Matching" versagt (alle als Add+Missing) | Opponent-Name in MD unterscheidet sich zu stark von liga.nu | `normalize.js` anpassen oder MD-Eintrag auf kanonische Form bringen |
| Pushover kommt nicht | Credentials/Token abgelaufen | Token erneuern, Env-Var im Container aktualisieren, Container restart |
| PR wird erstellt aber Body ist leer | Bundle-Paste unvollständig | Bundle neu paste, genau zwischen den Markern |
| "Bad credentials" 401 | GitHub PAT fehlt `repo`-Scope | PAT neu erstellen, korrektes Scope setzen |
