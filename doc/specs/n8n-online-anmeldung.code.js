// "Validate & Build" Code-Node für den Online-Anmeldung-Workflow.
// Lesbare Version — die JSON-escaped Variante steckt in n8n-online-anmeldung.json.
// Generiert vorstandHtml + applicantHtml (für die Mail-Nodes) sowie pdfHtml
// (an Cloudflare Browser Rendering geschickt → PDF-Anhang).

const body = $input.first().json.body ?? $input.first().json;

const required = ['vorname','nachname','geburtsdatum','strasse','plz','ort','email','kategorie','beginn','kontoinhaber','iban','sepa_consent','privacy_consent','signature'];
const missing = required.filter(k => !body[k]);
if (missing.length) {
  return [{ json: { ok: false, error: 'missing fields: ' + missing.join(', ') } }];
}

// Minderjährig?
const birth = new Date(body.geburtsdatum);
const cutoff = new Date();
cutoff.setFullYear(cutoff.getFullYear() - 18);
const isMinor = birth > cutoff;
if (isMinor && (!body.guardian_signature || !String(body.guardian_signature).startsWith('data:image'))) {
  return [{ json: { ok: false, error: 'guardian_signature required for minors' } }];
}
if (!String(body.signature).startsWith('data:image')) {
  return [{ json: { ok: false, error: 'invalid signature data' } }];
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

// ASCII-Transliteration für Mandatsreferenz / Dateinamen (Wörenkämper → Woerenkaemper)
const asciify = s => String(s ?? '')
  .replace(/ä/g, 'ae').replace(/Ä/g, 'Ae')
  .replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
  .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue')
  .replace(/ß/g, 'ss');

const mandateRef = 'TCBW-' + nowIso.replace(/[-:T.Z]/g,'').slice(0,12) + '-' + asciify(body.nachname).replace(/[^A-Za-z]/g,'').slice(0,8).toUpperCase();

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ── Mail-Templates (HTML, kompakt für Email-Client) ─────────────────────────
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
  '<p style="background:#ecfdf5;border-left:4px solid #10b981;padding:10px 14px;border-radius:6px;font-size:14px;margin:18px 0;">📎 Der vollständige unterschriebene Antrag liegt als PDF im Anhang.</p>' +
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
  '<p style="background:#ecfdf5;border-left:4px solid #10b981;padding:10px 14px;border-radius:6px;font-size:14px;">📎 Im Anhang findest du eine PDF-Kopie deines unterschriebenen Antrags fürs eigene Archiv.</p>' +
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

// ── PDF-HTML (A4, Print-CSS, eingebettete Unterschriften) ───────────────────
// Wird an Cloudflare Browser Rendering geschickt und zur PDF konvertiert.

const pdfRow = (label, value) =>
  '<tr><td class="lbl">' + esc(label) + '</td><td>' + esc(value) + '</td></tr>';

const pdfSection = (title, rowsHtml) =>
  '<h2>' + title + '</h2><table class="kv">' + rowsHtml + '</table>';

const guardianPdfSection = body.guardian_name
  ? pdfSection('Erziehungsberechtigte/r', pdfRow('Name', body.guardian_name) + pdfRow('Telefon', body.guardian_telefon || '–'))
  : '';

const consentPdfRow = (label, value) =>
  '<tr><td class="lbl">' + esc(label) + '</td><td class="' + (value ? 'yes' : 'no') + '">' + (value ? '☒ erteilt' : '☐ nicht erteilt') + '</td></tr>';

const pdfConsentSection = pdfSection('Foto- & Datenfreigaben (freiwillig)',
  consentPdfRow('Kontaktdaten an Mitglieder weitergeben (z.B. Fahrgemeinschaften)', body.share_contact === 'on') +
  consentPdfRow('Foto/Video auf der Vereins-Homepage (tc-bw-attendorn.de)', body.foto_homepage === 'on') +
  consentPdfRow('Foto/Video auf der Facebook-Seite des Vereins', body.foto_facebook === 'on') +
  consentPdfRow('Foto/Video auf der Instagram-Seite des Vereins', body.foto_instagram === 'on') +
  consentPdfRow('Foto/Video in regionaler Presse', body.foto_presse === 'on')
);

const sigSection =
  '<h2>Unterschrift(en)</h2>' +
  '<div class="signatures">' +
    '<div class="sig">' +
      '<div class="sig-box"><img src="' + body.signature + '" alt="Unterschrift Antragsteller"></div>' +
      '<div class="sig-label">' + esc(body.vorname) + ' ' + esc(body.nachname) + ' (Antragsteller)<br><span class="sig-meta">' + esc(eingegangen) + '</span></div>' +
    '</div>' +
    (isMinor && body.guardian_signature ?
      '<div class="sig">' +
        '<div class="sig-box"><img src="' + body.guardian_signature + '" alt="Unterschrift Erziehungsberechtigte/r"></div>' +
        '<div class="sig-label">' + esc(body.guardian_name) + ' (Erziehungsberechtigte/r)<br><span class="sig-meta">' + esc(eingegangen) + '</span></div>' +
      '</div>' : '') +
  '</div>';

const pdfHtml =
  '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Mitgliedsantrag ' + esc(body.vorname) + ' ' + esc(body.nachname) + '</title>' +
  '<style>' +
  '@page { size: A4; margin: 16mm 14mm; }' +
  '* { box-sizing: border-box; }' +
  'body { font-family: Helvetica, Arial, sans-serif; color: #1f2937; font-size: 11pt; line-height: 1.45; margin: 0; }' +
  '.head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e56a0; padding-bottom: 10px; margin-bottom: 16px; }' +
  '.head h1 { color: #0a1628; font-size: 20pt; margin: 0; }' +
  '.head .sub { color: #6b7280; font-size: 10pt; margin-top: 2px; }' +
  '.meta { text-align: right; font-size: 9.5pt; color: #374151; }' +
  '.meta code { background: #f0f6fe; padding: 1px 5px; border-radius: 3px; font-size: 9pt; }' +
  'h2 { color: #1e56a0; font-size: 13pt; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }' +
  'table.kv { width: 100%; border-collapse: collapse; margin: 0 0 4px; }' +
  'table.kv td { padding: 5px 8px; border-bottom: 1px solid #f0f2f5; vertical-align: top; }' +
  'table.kv td.lbl { color: #6b7280; width: 38%; }' +
  'td.yes { color: #065f46; font-weight: 600; }' +
  'td.no { color: #6b7280; }' +
  '.mandate-text { font-size: 9.5pt; line-height: 1.55; color: #374151; background: #f0f6fe; border-left: 3px solid #1e56a0; padding: 10px 12px; border-radius: 4px; margin: 8px 0 12px; }' +
  '.signatures { display: flex; gap: 28px; margin-top: 14px; }' +
  '.sig { flex: 1; }' +
  '.sig-box { border: 1px solid #cbd5e0; border-radius: 6px; background: #fafbfc; height: 90px; padding: 6px; display: flex; align-items: center; justify-content: center; }' +
  '.sig-box img { max-width: 100%; max-height: 100%; }' +
  '.sig-label { font-size: 9pt; color: #374151; margin-top: 6px; text-align: center; }' +
  '.sig-meta { color: #9ca3af; font-size: 8.5pt; }' +
  '.audit { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 8.5pt; color: #6b7280; line-height: 1.55; }' +
  '.audit strong { color: #374151; }' +
  '</style></head><body>' +
  '<div class="head">' +
    '<div>' +
      '<h1>Mitgliedsantrag</h1>' +
      '<div class="sub">Tennisclub Blau-Weiss Attendorn e.V. · Schnellenberg 1 · 57439 Attendorn</div>' +
    '</div>' +
    '<div class="meta">' +
      '<strong>Eingegangen:</strong> ' + esc(eingegangen) + '<br>' +
      '<strong>Mandatsreferenz:</strong> <code>' + esc(mandateRef) + '</code>' +
    '</div>' +
  '</div>' +

  pdfSection('Persönliche Daten',
    pdfRow('Vorname', body.vorname) +
    pdfRow('Nachname', body.nachname) +
    pdfRow('Geburtsdatum', body.geburtsdatum) +
    pdfRow('Adresse', body.strasse + ', ' + body.plz + ' ' + body.ort) +
    pdfRow('E-Mail', body.email) +
    pdfRow('Telefon', body.telefon || '–')
  ) +

  guardianPdfSection +

  pdfSection('Mitgliedschaft',
    pdfRow('Kategorie', body.kategorie) +
    pdfRow('Beginn', body.beginn)
  ) +

  '<h2>SEPA-Lastschriftmandat</h2>' +
  '<p class="mandate-text">Hiermit ermächtige ich den <strong>Tennisclub Blau-Weiss Attendorn e.V.</strong> ' +
  '(Gläubiger-ID: DE96ZZZ00001146527), Zahlungen von meinem Konto mittels Lastschrift einzuziehen. ' +
  'Zugleich weise ich mein Kreditinstitut an, die vom TC Blau-Weiss Attendorn e.V. auf mein Konto gezogenen ' +
  'Lastschriften einzulösen. Ich kann innerhalb von acht Wochen, beginnend mit dem Belastungsdatum, ' +
  'die Erstattung des belasteten Betrages verlangen.</p>' +
  '<table class="kv">' +
    pdfRow('Kontoinhaber:in', body.kontoinhaber) +
    pdfRow('IBAN', iban) +
    pdfRow('Mandat erteilt', body.sepa_consent === 'on' ? '☒ ja' : '☐ nein') +
  '</table>' +

  pdfConsentSection +

  '<h2>Datenschutz</h2>' +
  '<table class="kv">' +
    pdfRow('Datenschutzerklärung gelesen und akzeptiert', body.privacy_consent === 'on' ? '☒ ja' : '☐ nein') +
  '</table>' +

  sigSection +

  '<div class="audit">' +
    '<strong>Audit-Stempel</strong><br>' +
    'Elektronisch erteilt am ' + esc(eingegangen) + ' (Europe/Berlin) · Mandatsreferenz: <strong>' + esc(mandateRef) + '</strong><br>' +
    'User-Agent: ' + esc(body.user_agent || '–') +
  '</div>' +

  '</body></html>';

// Sicherer Datei-Name für den Anhang
const safeName = asciify(body.nachname + '_' + body.vorname).replace(/[^A-Za-z0-9_-]/g, '');
const pdfFilename = 'Mitgliedsantrag_' + safeName + '_' + mandateRef + '.pdf';

return [{ json: { ok: true, body, mandateRef, eingegangen, vorstandHtml, applicantHtml, pdfHtml, pdfFilename, iban, isMinor } }];
