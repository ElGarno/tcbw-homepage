# Online-Anmeldung — Setup-Schritte für n8n

Diese Spec beschreibt einmaliges Setup für PDF-Generierung im Anmeldungs-Workflow.
Wenn alles eingerichtet ist, erzeugt der Workflow für jede Anmeldung ein
unterschriebenes PDF und hängt es an Vorstand- und Antragsteller-Mail.

## 1. Cloudflare API-Token anlegen

1. **Cloudflare Dashboard** → rechts oben Profil → **API Tokens** → **Create Token**
2. **Custom Token** → "Get started"
3. Token-Name: `n8n Browser Rendering`
4. **Permissions:**
   - Account · Browser Rendering · **Edit**
5. **Account Resources:** dein Cloudflare-Account
6. **TTL:** optional unbegrenzt
7. **Continue → Create Token → Token kopieren** (er wird nur einmal angezeigt)

## 2. Cloudflare Account-ID notieren

Im Cloudflare Dashboard rechts in der Sidebar steht die **Account ID** —
brauchst du gleich für die n8n-Workflow-Variable.

## 3. n8n-Credential anlegen

1. n8n → **Credentials** → **New**
2. Type: **Header Auth**
3. Name: `Cloudflare Browser Rendering (Bearer)`
4. Header Name: `Authorization`
5. Header Value: `Bearer DEIN_TOKEN_HIER`
6. Save

## 4. Workflow-Variable für Account-ID

In n8n → **Settings → Variables → New Variable**:

- Key: `cfAccountId`
- Value: die Cloudflare Account ID aus Schritt 2

(Alternativ: hardcode in der HTTP-Node-URL — Variable ist sauberer, weil
sie auch in anderen Workflows referenzierbar ist.)

## 5. Workflow re-importieren oder Render-PDF-Node verknüpfen

Beim ersten Re-Import: in der **Render PDF**-Node die Credential aus
Schritt 3 zuordnen (Dropdown bei "Credential to connect with").

## 6. Browser Rendering aktivieren

Im Cloudflare Dashboard → **Workers & Pages → Browser Rendering** muss
das Feature mindestens einmal aktiviert/akzeptiert worden sein (Free Plan
reicht: 10 min Browser-Zeit pro Tag, das entspricht ~100-200 PDFs).

## 7. Test

Curl-Test wie bisher absetzen, im n8n-Workflow auf "Executions" schauen:

- Render PDF sollte ein binary "data" mit `application/pdf` ausgeben
- Mail an Vorstand bekommt das PDF als Anhang
- Bestätigung an Antragsteller ebenfalls

Bei Fehlern in Render PDF:
- 401: Token falsch oder hat nicht den Browser-Rendering-Scope
- 403: Browser Rendering nicht aktiviert für den Account
- 404: Account-ID stimmt nicht
- 429: Quota überschritten — Free Plan upgraden oder bis morgen warten

## 8. Optional: Quota beobachten

Cloudflare Dashboard → **Analytics & Logs → Browser Rendering** zeigt die
verbrauchte Browser-Zeit. Bei stetig steigenden Anmeldungen ggf. auf
Workers Paid umsteigen (5 €/Monat = 10 h/Tag).
