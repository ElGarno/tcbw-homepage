# Liga.nu Sync Deployment

## Prerequisites

- n8n auf der Synology NAS (bereits vorhanden, self-hosted free)
- Docker-Env-Var: `NODE_FUNCTION_ALLOW_EXTERNAL=cheerio,js-yaml` (einmalig nötig)
- GitHub PAT mit `repo`-Scope (von Mail-to-Homepage wiederverwenden)
- Pushover App-Token + User-Key (von Daily-Deploy wiederverwenden)

## Einrichtung

### Schritt 1: Docker-Compose anpassen (einmalig)

Der n8n-Container muss externe NPM-Module erlauben. Im Docker-Compose-File:

```yaml
services:
  n8n:
    environment:
      - NODE_FUNCTION_ALLOW_EXTERNAL=cheerio,js-yaml
      # ... alle anderen bestehenden Env-Vars bleiben
```

Dann Container neustarten:

```bash
docker compose up -d n8n
```

Das ist **die einzige** Docker-Änderung. Alle Secrets werden im Workflow selbst gepflegt (nicht als Env-Var).

### Schritt 2: Bundle erzeugen

```bash
cd tools/nuliga-sync
npm install
npm test                # alle Tests grün
npm run baseline        # 0 Aenderungen erwartet
npm run bundle          # schreibt dist/n8n-bundle.js
```

Inhalt von `dist/n8n-bundle.js` in Zwischenablage kopieren.

### Schritt 3: Workflow in n8n importieren

1. n8n UI → neuer Workflow → Menü (⋮) → "Import from File" → `doc/specs/n8n-nuliga-sync.json`
2. Node **"Config"** öffnen und alle 5 Werte eintragen:
   - `githubToken` — der GitHub PAT (ghp_...)
   - `githubOwner` — `ElGarno`
   - `githubRepo` — `tcbw-homepage`
   - `pushoverToken` — Pushover App-Token
   - `pushoverUser` — Pushover User-Key
3. Node **"Sync Logic"** öffnen. Im Code-Editor den Platzhalter
   ```
   // --- PASTE BUNDLE BELOW ---
   // ... entire content of tools/nuliga-sync/dist/n8n-bundle.js goes here ...
   // --- PASTE BUNDLE ABOVE ---
   ```
   ersetzen durch den Inhalt von `dist/n8n-bundle.js`.
4. Workflow speichern (Ctrl+S).

### Schritt 4: Test Run (kein PR erwartet)

- Button "Test workflow" oben klicken
- Workflow läuft in < 30s durch
- Im "Sync Logic"-Node-Output: `{ changed: false }`
- Path "Keine Aenderungen" wird genommen
- Kein PR, kein Pushover

Wenn das klappt, ist die Pipeline korrekt konfiguriert.

### Schritt 5: Forced Diff Test (optional, für Sicherheit)

1. Lokal eine Uhrzeit in einer Mannschafts-MD ändern, commiten, pushen auf `main`
2. Im n8n-Workflow "Test workflow" klicken
3. Erwartung:
   - Draft-PR erscheint in https://github.com/ElGarno/tcbw-homepage/pulls
   - Pushover-Nachricht kommt an
   - PR-Body enthält die Änderung als "Update"-Zeile
4. Danach: PR schließen + Commit zurückrollen (`git revert HEAD && git push`)

### Schritt 6: Aktivieren

Toggle oben rechts auf "Active" → Workflow läuft ab jetzt täglich 06:00 Europe/Berlin.

## Betrieb

- Sync läuft **06:00 Berlin**, vor Daily Deploy um **06:30**
- Drafts werden NICHT automatisch gemerged — menschliches Review nötig
- "Missing"-Einträge im PR-Body bitte manuell prüfen (Mannschaft zurückgezogen oder Parser-Problem?)
- Bundle bei Code-Änderungen neu generieren (`npm run bundle`) und im "Sync Logic"-Node aktualisieren
- Token-Rotation: Config-Node öffnen, Wert ändern, speichern. Kein Docker-Restart nötig.

## Troubleshooting

| Symptom | Ursache | Behebung |
|---|---|---|
| Error `Cannot find module 'cheerio'` in Code node | `NODE_FUNCTION_ALLOW_EXTERNAL` nicht gesetzt | Docker-Compose aktualisieren, `docker compose up -d n8n` |
| Error "No matches found — liga.nu layout may have changed" | liga.nu HTML geändert | Lokal `npm run baseline`, HTML inspizieren, `parser.js` anpassen, Bundle neu bauen, in Sync-Logic paste |
| Identity-Matching versagt (alle als Add+Missing) | Opponent-Name in MD weicht zu stark von liga.nu ab | `normalize.js` erweitern oder MD-Eintrag auf kanonische Form bringen |
| Pushover kommt nicht | Token im Config-Node falsch | Config-Node prüfen, ggf. neuen Pushover-Token erzeugen und eintragen |
| "Bad credentials" 401 | GitHub PAT im Config-Node fehlt `repo`-Scope oder ist abgelaufen | Neuen PAT erzeugen, Config-Node aktualisieren |
| PR erstellt, aber Body leer | Bundle-Paste unvollständig | Bundle-Inhalt nochmal zwischen die Marker paste, Leerzeilen vermeiden |
