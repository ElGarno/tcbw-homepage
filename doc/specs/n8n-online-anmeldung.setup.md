# Online-Anmeldung — Setup-Schritte für n8n

Diese Spec beschreibt einmaliges Setup für PDF-Generierung im Anmeldungs-Workflow.
Wenn alles eingerichtet ist, erzeugt der Workflow für jede Anmeldung ein
unterschriebenes PDF und hängt es an Vorstand- und Antragsteller-Mail.

Die Cloudflare Account-ID ist in der Workflow-JSON bereits **hardcoded**
(`34a3222a9e0b55bc8a2d2f285ac7e121`) — sollte das einmal nötig sein, die
Account-ID auszuwechseln, in `n8n-online-anmeldung.json` die URL in der
**Render PDF**-Node anpassen.

## 1. Cloudflare API-Token anlegen

1. **Cloudflare Dashboard** → rechts oben Profil → **API Tokens** → **Create Token**
2. **Custom Token** → "Get started"
3. Token-Name: `n8n Browser Rendering`
4. **Permissions:**
   - Account · Browser Rendering · **Edit**
5. **Account Resources:** dein Cloudflare-Account
6. **TTL:** optional unbegrenzt
7. **Continue → Create Token → Token kopieren** (er wird nur einmal angezeigt)

## 2. n8n-Credential anlegen

1. n8n → **Credentials** → **New**
2. Type: **Header Auth**
3. Name: `Cloudflare Browser Rendering (Bearer)`
4. Header Name: `Authorization`
5. Header Value: `Bearer DEIN_TOKEN_HIER`
6. Save

## 3. Workflow re-importieren oder Render-PDF-Node verknüpfen

Beim ersten Re-Import: in der **Render PDF**-Node die Credential aus
Schritt 2 zuordnen (Dropdown bei "Credential to connect with").

## 4. Browser Rendering aktivieren

Im Cloudflare Dashboard → **Workers & Pages → Browser Rendering** muss
das Feature mindestens einmal aktiviert/akzeptiert worden sein (Free Plan
reicht: 10 min Browser-Zeit pro Tag, das entspricht ~100-200 PDFs).

## 5. Test

Curl-Test wie bisher absetzen, im n8n-Workflow auf "Executions" schauen:

- Render PDF sollte ein binary "data" mit `application/pdf` ausgeben
- Mail an Vorstand bekommt das PDF als Anhang
- Bestätigung an Antragsteller ebenfalls

Bei Fehlern in Render PDF:
- 401: Token falsch oder hat nicht den Browser-Rendering-Scope
- 403: Browser Rendering nicht aktiviert für den Account
- 404: Account-ID stimmt nicht
- 429: Quota überschritten — Free Plan upgraden oder bis morgen warten

## 6. Optional: Quota beobachten

Cloudflare Dashboard → **Analytics & Logs → Browser Rendering** zeigt die
verbrauchte Browser-Zeit. Bei stetig steigenden Anmeldungen ggf. auf
Workers Paid umsteigen (5 €/Monat = 10 h/Tag).

## 7. Fortlaufende Mandatsreferenzen (Counter via GitHub)

Seit 2026-05-28 erzeugt der Workflow keine timestamp-basierten Referenzen
mehr (`TCBW-20260528223000-MUSTERMA`), sondern nimmt eine **fortlaufende
Nummer** aus `data/mandate-counter.json` im Repo. Startwert war 2180
(letzte vergebene Nummer 2179, Stand Übergabe Martina Franz).

### Funktionsweise

- **State-Datei** `data/mandate-counter.json` mit Schema
  `{ next, lastUpdated, note }`.
- Neuer Node **Bump Mandate Counter** zwischen *Config* und
  *Validate & Build*: liest die Datei via GitHub Contents API,
  verwendet `next` als Mandatsreferenz, schreibt `next + 1` direkt
  zurück auf `main` (Commit-Message
  `chore(anmeldung): bump mandate counter to N`).
- *Validate & Build* generiert die Referenz nicht mehr selbst,
  sondern liest sie aus `$input.first().json.mandateRef`.

### GitHub-Token in n8n eintragen

1. n8n → Workflow „Online-Anmeldung" → Node **Config** öffnen
2. Bei `githubToken` den GitHub PAT eintragen (gleicher kann wie für
   `n8n-nuliga-sync` verwendet werden — Scope: `repo`)
3. `githubOwner` (`ElGarno`) und `githubRepo` (`tcbw-homepage`) sind
   bereits vorbelegt — anpassen falls Fork

### Was wenn der Counter durcheinander gerät?

Falls eine Nummer manuell aus dem Tritt geraten ist:
1. `data/mandate-counter.json` lokal editieren, `next` auf den
   gewünschten Wert setzen
2. Commit + Push — der nächste Anmelde-Lauf nimmt diesen Startwert

### Lücken bei Validierungsfehlern

Schlägt die Validierung in *Validate & Build* fehl (z. B. ungültige IBAN),
wurde der Counter trotzdem schon erhöht — es entsteht eine Lücke (z. B.
2183 fehlt). Bewusst akzeptiert; clientseitige Formularvalidierung macht
das in der Praxis selten.

## 8. Vereinssatzung als zweiter Anhang

Seit 2026-05-28 wird zusätzlich zum unterschriebenen Antrag auch die
**Vereinssatzung** an die Antragsteller-Bestätigungsmail angehängt.

Funktionsweise:
- PDF liegt unter `static/dokumente/Satzung_TCBW_2022_neukomplett.pdf`
  und wird über Cloudflare Pages öffentlich ausgeliefert.
- Neuer Node **Fetch Satzung** (HTTP Request) zwischen *Forward PDF Binary*
  und *Bestätigung an Antragsteller* lädt das PDF als Binary-Property
  `satzung` herunter.
- *Bestätigung an Antragsteller* listet beide Binaries im
  `attachments`-Feld: `data,satzung`.

Aktualisierung der Satzung:
1. Neue PDF in `static/dokumente/` ablegen (alten Dateinamen behalten,
   sonst auch die URL im Fetch-Satzung-Node anpassen).
2. Commit + Push → Cloudflare Pages deployed automatisch.
3. Beim nächsten Anmelde-Lauf wird die neue Version mitgeschickt — kein
   n8n-Eingriff nötig.
