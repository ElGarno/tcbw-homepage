# Taeglicher Auto-Deploy via n8n

## Zweck

Cloudflare Pages baut die Seite nur bei Git-Pushes. Damit abgelaufene Termine
automatisch verschwinden (Hugo blendet sie per `now`-Vergleich aus), brauchen
wir einen taeglichen Rebuild.

## Einrichtung

### Schritt 1: Deploy Hook in Cloudflare erstellen

1. Cloudflare Dashboard → Pages → `tcbw-homepage`
2. Settings → Builds & Deployments → **Deploy Hooks**
3. "Add deploy hook" klicken
4. Name: `daily-rebuild`
5. Branch: `main`
6. Speichern → die generierte URL kopieren (sieht aus wie
   `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/xxxx`)

### Schritt 2: n8n Workflow importieren

1. n8n oeffnen → neuen Workflow anlegen
2. Drei-Punkte-Menue → "Import from File" → die JSON-Datei unten importieren
3. Im HTTP Request Node die URL durch deinen Deploy Hook ersetzen
4. Workflow aktivieren (Toggle oben rechts)

### Schritt 3: Testen

1. Im n8n Workflow auf "Test Workflow" klicken
2. Pruefen ob im Cloudflare Dashboard ein neuer Build gestartet wurde

## n8n Workflow JSON

Datei: `n8n-daily-deploy.json` (siehe unten)

Workflow-Beschreibung:
- **Cron-Trigger**: Jeden Tag um 06:00 Uhr (Europe/Berlin)
- **HTTP Request**: POST an den Cloudflare Deploy Hook
- **Pushover** (optional): Benachrichtigung bei Fehler