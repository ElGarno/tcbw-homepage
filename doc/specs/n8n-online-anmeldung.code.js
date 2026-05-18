// "Validate & Build" Code-Node für den Online-Anmeldung-Workflow.
// Lesbare Version — die JSON-escaped Variante steckt in n8n-online-anmeldung.json.
// Generiert vorstandHtml + applicantHtml für die nachgelagerten Mail-Nodes.

const body = $input.first().json.body ?? $input.first().json;

const required = ['vorname','nachname','geburtsdatum','strasse','plz','ort','email','kategorie','beginn','kontoinhaber','iban','sepa_consent','privacy_consent'];
const missing = required.filter(k => !body[k]);
if (missing.length) {
  return [{ json: { ok: false, error: 'missing fields: ' + missing.join(', ') } }];
}

// IBAN Mod-97 sanity check
const iban = String(body.iban).replace(/\s+/g,'').toUpperCase();
const rearr = iban.slice(4) + iban.slice(0,4);
const numStr = rearr.replace(/[A-Z]/g, c => (c.charCodeAt(0) - 55).toString());
let rem = 0;
for (const d of numStr) { rem = (rem * 10 + Number(d)) % 97; }
if (rem !== 1) {
  return [{ json: { ok: false, error: 'invalid IBAN' } }];
}

const nowIso = new Date().toISOString();
const eingegangen = new Date(nowIso).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'long', timeStyle: 'short' });
const mandateRef = 'TCBW-' + nowIso.replace(/[-:T.Z]/g,'').slice(0,12) + '-' + (body.nachname || '').slice(0,8).replace(/[^A-Za-z]/g,'').toUpperCase();

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const row = (label, value) =>
  '<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:200px;vertical-align:top;">' + esc(label) +
  '</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">' + esc(value) + '</td></tr>';

const section = (title, rowsHtml) =>
  '<h2 style="color:#1e56a0;font-size:18px;margin:32px 0 12px;">' + title + '</h2>' +
  '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;font-family:Helvetica,Arial,sans-serif;font-size:14px;">' + rowsHtml + '</table>';

const guardianSection = body.guardian_name
  ? section('Erziehungsberechtigte/r', row('Name', body.guardian_name) + row('Telefon', body.guardian_telefon || '–'))
  : '';

const yn = v => (v === 'on' || v === true || v === 'true') ? '✓ erteilt' : '– nicht erteilt';

const consentSection = section('Foto- &amp; Datenfreigaben (freiwillig)',
  row('Kontaktdaten an Mitglieder weitergeben', yn(body.share_contact)) +
  row('Foto/Video auf Homepage', yn(body.foto_homepage)) +
  row('Foto/Video auf Facebook', yn(body.foto_facebook)) +
  row('Foto/Video auf Instagram', yn(body.foto_instagram)) +
  row('Foto/Video in regionaler Presse', yn(body.foto_presse))
);

const vorstandHtml =
  '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>' +
  '<body style="margin:0;padding:24px;background:#f9fafb;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">' +
  '<div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;padding:32px;">' +
  '<h1 style="color:#0a1628;font-size:24px;margin:0 0 8px;border-bottom:2px solid #1e56a0;padding-bottom:12px;">Neuer Mitgliedsantrag</h1>' +
  '<p style="color:#6b7280;font-size:14px;margin:12px 0;">' +
  '<strong>Eingegangen:</strong> ' + esc(eingegangen) + '<br>' +
  '<strong>Mandatsreferenz:</strong> <code style="background:#f0f6fe;padding:2px 6px;border-radius:4px;font-size:13px;">' + esc(mandateRef) + '</code></p>' +
  section('Persönliche Daten',
    row('Vorname', body.vorname) +
    row('Nachname', body.nachname) +
    row('Geburtsdatum', body.geburtsdatum) +
    row('Adresse', body.strasse + ', ' + body.plz + ' ' + body.ort) +
    row('E-Mail', body.email) +
    row('Telefon', body.telefon || '–')
  ) +
  guardianSection +
  section('Mitgliedschaft',
    row('Kategorie', body.kategorie) +
    row('Beginn', body.beginn)
  ) +
  section('SEPA-Lastschriftmandat',
    row('Kontoinhaber:in', body.kontoinhaber) +
    row('IBAN', iban) +
    row('Mandat akzeptiert', body.sepa_consent ? '✓' : '–') +
    row('Datenschutz akzeptiert', body.privacy_consent ? '✓' : '–')
  ) +
  consentSection +
  '<p style="margin-top:32px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:16px;">User-Agent: ' + esc(body.user_agent || '–') + '</p>' +
  '</div></body></html>';

const applicantHtml =
  '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>' +
  '<body style="margin:0;padding:24px;background:#f9fafb;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">' +
  '<div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;padding:32px;">' +
  '<h1 style="color:#0a1628;font-size:22px;margin:0 0 16px;">Hallo ' + esc(body.vorname) + ',</h1>' +
  '<p style="line-height:1.6;">danke für deinen Aufnahmeantrag beim <strong>Tennisclub Blau-Weiss Attendorn e.V.</strong> — wir haben deine Daten erhalten.</p>' +
  '<div style="background:#f0f6fe;border-left:4px solid #1e56a0;border-radius:8px;padding:16px 20px;margin:24px 0;">' +
  '<p style="margin:0;font-size:14px;"><strong>Eingegangen:</strong> ' + esc(eingegangen) + '<br>' +
  '<strong>Deine Mandatsreferenz:</strong> <code style="background:white;padding:2px 6px;border-radius:4px;font-size:13px;">' + esc(mandateRef) + '</code></p></div>' +
  '<h2 style="color:#1e56a0;font-size:18px;margin:24px 0 12px;">Wie es weitergeht</h2>' +
  '<ol style="line-height:1.7;padding-left:20px;">' +
  '<li>Der Vorstand prüft deinen Antrag in den nächsten Tagen.</li>' +
  '<li>Du bekommst eine Bestätigung per Mail, sobald der Beitritt aktiv ist.</li>' +
  '<li>Der erste Mitgliedsbeitrag wird per SEPA-Lastschrift von dem angegebenen Konto eingezogen.</li>' +
  '</ol>' +
  consentSection +
  '<p style="line-height:1.6;font-size:13px;color:#6b7280;margin-top:18px;">Hinweis: Die oben angekreuzten Foto- und Datenfreigaben sind freiwillig und jederzeit per Mail an <a href="mailto:vorstand@tc-bw-attendorn.de" style="color:#1a4080;">vorstand@tc-bw-attendorn.de</a> widerrufbar.</p>' +
  '<p style="line-height:1.6;margin-top:24px;">Bei Fragen schreib uns einfach an <a href="mailto:vorstand@tc-bw-attendorn.de" style="color:#1a4080;">vorstand@tc-bw-attendorn.de</a>.</p>' +
  '<p style="margin-top:32px;line-height:1.6;">Viele Grüße<br><strong>TC Blau-Weiss Attendorn e.V.</strong></p>' +
  '</div></body></html>';

return [{ json: { ok: true, body, mandateRef, eingegangen, vorstandHtml, applicantHtml, iban } }];
