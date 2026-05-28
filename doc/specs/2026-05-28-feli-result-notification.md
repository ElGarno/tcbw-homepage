# Spec: Feli — automatische Ergebnis-Benachrichtigung (nuliga-sync)

**Status:** Spec — Code-Seite implementiert, n8n-Workflow-Update offen
**Datum:** 2026-05-28
**Folgt aus:** Vorstandsprotokoll 27.05.2026 (TOP 1, Beschluss)

## Ziel

Sobald der tägliche `nuliga-sync`-Cron-Lauf (06:00 Europe/Berlin) ein **neues
Spielergebnis** auf liga.nu erkennt, bekommt **Felicitas Baumhoff**
(`felibaumhoff98@gmail.com`) automatisch eine E-Mail mit den Match-Details
und einem Link zum Social-Media-Generator (`social.tc-bw-attendorn.de`).
So kann sie ohne manuelle Recherche zeitnah einen passenden Post erstellen.

## Was ist ein „neues Ergebnis"?

Der Sync-Code unterscheidet jetzt explizit zwischen:

- **Termin-Änderung** (z. B. Uhrzeit verschoben) → nur PR, keine Feli-Mail
- **Neues Ergebnis** (Match hatte vorher kein Ergebnis, jetzt steht ein Score auf liga.nu) → Feli-Mail
- **Neuer Termin mit gleichzeitig vorhandenem Ergebnis** (selten, z. B. nachträglich eingetragenes Auswärtsspiel) → Feli-Mail

Implementiert in `tools/nuliga-sync/src/syncRunner.js → extractNewResults()`.
Liefert ein zusätzliches Feld `newResults` im Rückgabewert von `runSync()`.

## Datenformat `newResults`

```js
[
  {
    team: 'Herren 30',           // Mannschafts-Label (aus teams.js)
    opponent: 'Olper TC 1',      // Gegner-Name wie auf liga.nu
    date: '09.05.2026',          // DD.MM.YYYY
    time: '13:00',               // HH:MM
    result: '3:6',               // Match-Punkte (nicht Sätze) wie liga.nu liefert
    isHome: true,                // immer true für Medenspiel-Heimspiele
  },
  // ...weitere Einträge bei mehreren neuen Ergebnissen am selben Tag
]
```

Bei leerem Sync: `newResults: []`.

## n8n-Workflow-Erweiterung

Bestehender Flow:

```
Schedule (06:00) → Config → Sync Logic (Code-Node, bundled JS) → Aenderungen? (IF) ──┬─→ Pushover (Fabian)
                                                                                     └─→ Keine Aenderungen (NoOp)
```

Erweitert um:

```
…Sync Logic → Aenderungen? ──┬─→ Pushover (Fabian)
                              │
                              ├─→ Neue Ergebnisse? (IF: newResults.length > 0)
                              │     └─→ Loop über newResults → Gmail (an felibaumhoff98@gmail.com)
                              │
                              └─→ Keine Aenderungen
```

### Neuer IF-Node „Neue Ergebnisse?"

- Condition: `{{ $json.newResults.length }} > 0`
- True-Output → Loop / SplitInBatches über `newResults`
- False-Output → wird verworfen

### Neuer Gmail-Node (oder SMTP)

- An: `felibaumhoff98@gmail.com`
- Von: `vorstand@tc-bw-attendorn.de` oder eine andere bestätigte Adresse
- Betreff: `🎾 Neues Ergebnis: {{ $json.team }} vs. {{ $json.opponent }}`
- Body (HTML):

```html
<p>Hi Feli,</p>

<p>auf liga.nu ist ein neues Ergebnis aufgetaucht:</p>

<table style="border-collapse: collapse; margin: 12px 0;">
  <tr><td style="padding: 6px 12px;"><strong>Mannschaft:</strong></td><td>{{ $json.team }}</td></tr>
  <tr><td style="padding: 6px 12px;"><strong>Gegner:</strong></td><td>{{ $json.opponent }}</td></tr>
  <tr><td style="padding: 6px 12px;"><strong>Datum:</strong></td><td>{{ $json.date }} · {{ $json.time }}</td></tr>
  <tr><td style="padding: 6px 12px;"><strong>Ergebnis:</strong></td><td><strong>{{ $json.result }}</strong></td></tr>
</table>

<p>
  <a href="https://social.tc-bw-attendorn.de"
     style="display: inline-block; background: #0d3a82; color: white; padding: 10px 18px;
            text-decoration: none; border-radius: 6px; font-weight: 600;">
    Social-Media-Post erstellen →
  </a>
</p>

<p style="color: #888; font-size: 13px;">
  Automatisch generiert vom nuliga-sync. Bei Fragen → Fabian.
</p>
```

### Optionale Erweiterung (später, koordiniert mit Social-Tools-Team)

Sobald `social.tc-bw-attendorn.de` Deep-Linking per Query-Parametern unterstützt
(z. B. `?template=match-result&team=herren-30&opponent=…&result=…`), kann der
Button-Link das Formular vorbefüllen. Bis dahin: generischer Link, Feli wählt
Team + Spiel manuell.

## Manuelle Schritte (Fabian)

Die aktualisierte n8n-Workflow-JSON (`doc/specs/n8n-nuliga-sync.json`) enthält
bereits alle nötigen Nodes (IF „Neue Ergebnisse?", SplitOut, Gmail-Node) und
die zusätzliche `feliEmail`-Config-Variable. Workflow im n8n importieren oder
selektiv die neuen Nodes ergänzen:

1. **n8n-Workflow öffnen** (Synology → Portainer → n8n)
2. **„Sync Logic"-Code-Node** aktualisieren: zwischen den `--- PASTE BUNDLE ---`
   Markern den Inhalt von `tools/nuliga-sync/dist/n8n-bundle.js` (aktueller
   Build, enthält `extractNewResults`) einsetzen
3. **Gmail-Credential** in n8n hinzufügen falls noch nicht vorhanden:
   `Add credential → Gmail OAuth2 → Account vorstand@tc-bw-attendorn.de`
   Die `id` aus dem Credential dann in der JSON beim Node „Mail an Feli"
   eintragen (Platzhalter `REPLACE_WITH_GMAIL_CREDENTIAL_ID`)
4. **Workflow-Import:** entweder das aktualisierte JSON komplett importieren
   (überschreibt den alten Workflow) oder die 3 neuen Nodes manuell anlegen
   und die Connection von „Aenderungen?" True auf „Neue Ergebnisse?" parallel
   zu „Pushover" ziehen
5. **Test:** in n8n „Execute Workflow" mit Mock-Daten (`newResults` mit
   einem Dummy-Eintrag) → E-Mail muss bei Feli ankommen
6. **Live-Test:** nächster echter Sync-Lauf, bei dem ein Ergebnis frisch
   reinkommt — Mail-Empfang verifizieren

## Testabdeckung (im Repo)

Drei neue Tests in `tools/nuliga-sync/tests/syncRunner.test.js`:

- `newResults: filled-in scores are extracted for social-media notification`
- `newResults: time-only updates are NOT extracted as new results`
- `newResults: returns empty array when no changes detected at all`

Alle drei grün.

## Offene Punkte

- **Pull-Frequenz:** Bleibt bei daily 06:00 (bewusst, siehe Brainstorming am
  28.05.2026). Falls Feli später schnellere Notifications braucht, kann
  ein zweiter Abend-Cron (z. B. 22:00) ergänzt werden — PR-Logik filtert
  Duplikate ohnehin per Identity-Match.
- **Pokal-Nebenrunde H40:** group-ID auf liga.nu noch nicht sichtbar
  (TODO in `tools/nuliga-sync/src/teams.js`).
- **SM-Generator Deep-Link:** wenn der Generator Query-Params unterstützt,
  Button-URL aufrüsten (siehe Optional-Block oben).
