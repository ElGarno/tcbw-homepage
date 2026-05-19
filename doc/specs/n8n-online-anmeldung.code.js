// "Validate & Build" Code-Node für den Online-Anmeldung-Workflow.
// Lesbare Version — die JSON-escaped Variante steckt in n8n-online-anmeldung.json.
//
// Unterstützt drei Anmelde-Modi (body.modus):
//   - "einzel": eine Person, optional Erziehungsberechtigte/r bei Minderjährigen
//   - "familie": 1-2 Erwachsene + 0-N Kinder, Staffelung nach Familien-Konstellation
//   - "kind":    Eltern bereits Mitglied, melden ein weiteres Kind nach
//
// Produziert vorstandHtml + applicantHtml (für die Mail-Nodes) sowie pdfHtml
// (an Cloudflare Browser Rendering geschickt → PDF-Anhang).

const body = $input.first().json.body ?? $input.first().json;

const modus = body.modus || 'einzel';
const required = ['vorname','nachname','geburtsdatum','strasse','plz','ort','email','beginn','kontoinhaber','iban','sepa_consent','privacy_consent','signature'];
if (modus === 'einzel') required.push('kategorie');
const missing = required.filter(k => !body[k]);
if (missing.length) {
  return [{ json: { ok: false, error: 'missing fields: ' + missing.join(', ') } }];
}

const kinder = Array.isArray(body.kinder) ? body.kinder : [];
const partnerJoining = body.partner_join === 'on';
const bothParentsMember = (modus === 'familie' && partnerJoining) || (modus === 'kind' && body.both_parents_member === 'on');

if (modus === 'familie' && partnerJoining) {
  for (const k of ['partner_vorname','partner_nachname','partner_geburtsdatum','partner_signature']) {
    if (!body[k]) return [{ json: { ok: false, error: 'partner data missing: ' + k } }];
  }
}
if (modus === 'kind' && kinder.length === 0) {
  return [{ json: { ok: false, error: 'no child specified for kind-modus' } }];
}

const birth = new Date(body.geburtsdatum);
const cutoff = new Date();
cutoff.setFullYear(cutoff.getFullYear() - 18);
const isMinor = birth > cutoff;
if (modus === 'einzel' && isMinor && (!body.guardian_signature || !String(body.guardian_signature).startsWith('data:image'))) {
  return [{ json: { ok: false, error: 'guardian_signature required for minors' } }];
}
if (!String(body.signature).startsWith('data:image')) {
  return [{ json: { ok: false, error: 'invalid signature data' } }];
}

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

const asciify = s => String(s ?? '')
  .replace(/ä/g, 'ae').replace(/Ä/g, 'Ae')
  .replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
  .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue')
  .replace(/ß/g, 'ss');

const mandateRef = 'TCBW-' + nowIso.replace(/[-:T.Z]/g,'').slice(0,12) + '-' + asciify(body.nachname).replace(/[^A-Za-z]/g,'').slice(0,8).toUpperCase();

// ── Beitragsberechnung ──────────────────────────────────────────────────────
const ADULT_FEES = { aktiv: 200, zweit: 100, schueler: 100, grundschulkind: 40, passiv: 40 };
const KIND_STAFFEL_ONE_PARENT  = [50, 40, 30, 20];
const KIND_STAFFEL_BOTH_PARENTS = [40, 30, 20, 10];
const KATEGORIE_LABEL = {
  aktiv: 'Aktives Mitglied',
  zweit: 'Zweitmitgliedschaft',
  schueler: 'Schüler / Student',
  grundschulkind: 'Vorschul- / Grundschulkind',
  passiv: 'Passives Mitglied',
};
function calcKindFee(status, positionInFamily, bothParents) {
  if (status === 'grundschule') return 40;
  const staffel = bothParents ? KIND_STAFFEL_BOTH_PARENTS : KIND_STAFFEL_ONE_PARENT;
  const i = Math.min(Math.max(positionInFamily, 1), 4) - 1;
  return staffel[i];
}

const schnupperjahr = body.schnupperjahr === 'on';
const feeItems = [];
if (modus === 'einzel') {
  const kat = body.kategorie;
  feeItems.push({ label: KATEGORIE_LABEL[kat] || kat, unit: ADULT_FEES[kat] || 0, who: body.vorname + ' ' + body.nachname });
} else if (modus === 'familie') {
  feeItems.push({ label: 'Aktives Mitglied', unit: 200, who: body.vorname + ' ' + body.nachname + ' (Hauptanmelder)' });
  if (partnerJoining) {
    feeItems.push({ label: 'Aktives Mitglied', unit: 200, who: body.partner_vorname + ' ' + body.partner_nachname + ' (Partner/in)' });
  }
  kinder.forEach((k, i) => {
    const fee = calcKindFee(k.status, i + 1, bothParentsMember);
    feeItems.push({ label: `${i + 1}. Kind`, unit: fee, who: k.vorname || '–' });
  });
} else if (modus === 'kind') {
  const existing = parseInt(body.existing_children_count || '0', 10);
  kinder.forEach((k, i) => {
    const position = existing + i + 1;
    const fee = calcKindFee(k.status, position, bothParentsMember);
    feeItems.push({ label: `${position}. Kind in der Familie`, unit: fee, who: k.vorname || '–' });
  });
}
const subtotal = feeItems.reduce((s, x) => s + x.unit, 0);
const total = schnupperjahr ? subtotal / 2 : subtotal;
const fmtEur = n => n.toFixed(2).replace('.', ',') + ' €';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ── Mail-Templates (HTML) ───────────────────────────────────────────────────
const row = (label, value) =>
  '<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:200px;vertical-align:top;">' + esc(label) +
  '</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">' + esc(value) + '</td></tr>';
const section = (title, rowsHtml) =>
  '<h2 style="color:#1e56a0;font-size:18px;margin:32px 0 12px;">' + title + '</h2>' +
  '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;font-family:Helvetica,Arial,sans-serif;font-size:14px;">' + rowsHtml + '</table>';

const modusLabel = { einzel: 'Einzelperson', familie: 'Familie', kind: 'Kind-Nachmeldung' }[modus];

const feeMailRows = feeItems.map(item => {
  const final = schnupperjahr ? item.unit / 2 : item.unit;
  return row(item.label + ' — ' + (item.who || ''), fmtEur(final) + (schnupperjahr ? ' (50 %)' : ''));
}).join('');

const yn = v => (v === 'on' || v === true || v === 'true') ? '✓ erteilt' : '– nicht erteilt';
const consentSection = section('Foto- &amp; Datenfreigaben (freiwillig)',
  row('Kontaktdaten an Mitglieder weitergeben', yn(body.share_contact)) +
  row('Foto/Video auf Homepage', yn(body.foto_homepage)) +
  row('Foto/Video auf Facebook', yn(body.foto_facebook)) +
  row('Foto/Video auf Instagram', yn(body.foto_instagram)) +
  row('Foto/Video in regionaler Presse', yn(body.foto_presse))
);

const personalSection = section('Antragsteller' + (modus !== 'einzel' ? ' (Hauptanmelder)' : ''),
  row('Modus', modusLabel) +
  row('Vorname', body.vorname) +
  row('Nachname', body.nachname) +
  row('Geburtsdatum', body.geburtsdatum) +
  row('Adresse', body.strasse + ', ' + body.plz + ' ' + body.ort) +
  row('E-Mail', body.email) +
  row('Telefon', body.telefon || '–')
);

const partnerSection_html = (modus === 'familie' && partnerJoining) ? section('Partner/in',
  row('Vorname', body.partner_vorname) +
  row('Nachname', body.partner_nachname) +
  row('Geburtsdatum', body.partner_geburtsdatum) +
  row('E-Mail', body.partner_email || '–') +
  row('Telefon', body.partner_telefon || '–')
) : '';

const kinderSection_html = kinder.length ? section('Kinder',
  kinder.map((k, i) => row(`${i+1}. Kind`, `${k.vorname || '–'} · geb. ${k.geburtsdatum || '–'} · ${k.status || '–'}`)).join('')
) : '';

const feeBlock = section('Beiträge' + (schnupperjahr ? ' (Schnupperjahr — 50 %)' : ''),
  feeMailRows + row('<strong>Gesamtbeitrag pro Jahr</strong>', '<strong>' + fmtEur(total) + '</strong>')
);

const vorstandHtml =
  '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>' +
  '<body style="margin:0;padding:24px;background:#f9fafb;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">' +
  '<div style="max-width:680px;margin:0 auto;background:white;border-radius:12px;padding:32px;">' +
  '<h1 style="color:#0a1628;font-size:24px;margin:0 0 8px;border-bottom:2px solid #1e56a0;padding-bottom:12px;">Neuer Mitgliedsantrag</h1>' +
  '<p style="color:#6b7280;font-size:14px;margin:12px 0;">' +
  '<strong>Eingegangen:</strong> ' + esc(eingegangen) + '<br>' +
  '<strong>Modus:</strong> ' + esc(modusLabel) + '<br>' +
  '<strong>Mandatsreferenz:</strong> <code style="background:#f0f6fe;padding:2px 6px;border-radius:4px;font-size:13px;">' + esc(mandateRef) + '</code></p>' +
  '<p style="background:#ecfdf5;border-left:4px solid #10b981;padding:10px 14px;border-radius:6px;font-size:14px;margin:18px 0;">📎 Der vollständige unterschriebene Antrag liegt als PDF im Anhang.</p>' +
  (modus === 'einzel' && body.partner_already_member === 'on'
    ? '<p style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;font-size:14px;margin:18px 0;"><strong>⚠ Aktion erforderlich:</strong> Antragsteller gibt an, dass der/die Ehepartner/in bereits Mitglied ist. Bitte die <strong>Beiträge der bereits gemeldeten Kinder</strong> auf die Staffelung „beide Eltern Mitglied" (40 € / 30 € / 20 € / 10 €) anpassen.</p>'
    : '') +
  personalSection + partnerSection_html + kinderSection_html + feeBlock +
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
  '<strong>Modus:</strong> ' + esc(modusLabel) + '<br>' +
  '<strong>Deine Mandatsreferenz:</strong> <code style="background:white;padding:2px 6px;border-radius:4px;font-size:13px;">' + esc(mandateRef) + '</code><br>' +
  '<strong>Gesamtbeitrag pro Jahr:</strong> ' + esc(fmtEur(total)) + (schnupperjahr ? ' (Schnupperjahr-Rabatt 50 %)' : '') + '</p></div>' +
  '<p style="background:#ecfdf5;border-left:4px solid #10b981;padding:10px 14px;border-radius:6px;font-size:14px;">📎 Im Anhang findest du eine PDF-Kopie deines unterschriebenen Antrags fürs eigene Archiv.</p>' +
  '<h2 style="color:#1e56a0;font-size:18px;margin:24px 0 12px;">Wie es weitergeht</h2>' +
  '<ol style="line-height:1.7;padding-left:20px;">' +
  '<li>Der Vorstand prüft deinen Antrag in den nächsten Tagen.</li>' +
  '<li>Du bekommst eine Bestätigung per Mail, sobald der Beitritt aktiv ist.</li>' +
  '<li>Der Mitgliedsbeitrag wird per SEPA-Lastschrift von dem angegebenen Konto eingezogen.</li>' +
  (schnupperjahr ? '<li>Schnupperjahr läuft bis 31.12.; ohne Kündigung bis 30.09. wechselt es automatisch in die reguläre Mitgliedschaft.</li>' : '') +
  '</ol>' +
  consentSection +
  '<p style="line-height:1.6;font-size:13px;color:#6b7280;margin-top:18px;">Hinweis: Die oben angekreuzten Foto- und Datenfreigaben sind freiwillig und jederzeit per Mail an <a href="mailto:vorstand@tc-bw-attendorn.de" style="color:#1a4080;">vorstand@tc-bw-attendorn.de</a> widerrufbar.</p>' +
  '<p style="line-height:1.6;margin-top:24px;">Bei Fragen schreib uns einfach an <a href="mailto:vorstand@tc-bw-attendorn.de" style="color:#1a4080;">vorstand@tc-bw-attendorn.de</a>.</p>' +
  '<p style="margin-top:32px;line-height:1.6;">Viele Grüße<br><strong>TC Blau-Weiss Attendorn e.V.</strong></p>' +
  '</div></body></html>';

// ── PDF-HTML ────────────────────────────────────────────────────────────────
const pdfRow = (label, value) => '<tr><td class="lbl">' + esc(label) + '</td><td>' + esc(value) + '</td></tr>';
const pdfSection = (title, rowsHtml) => '<h2>' + title + '</h2><table class="kv">' + rowsHtml + '</table>';

const personalPdf = pdfSection('Antragsteller' + (modus !== 'einzel' ? ' (Hauptanmelder)' : ''),
  pdfRow('Vorname', body.vorname) +
  pdfRow('Nachname', body.nachname) +
  pdfRow('Geburtsdatum', body.geburtsdatum) +
  pdfRow('Adresse', body.strasse + ', ' + body.plz + ' ' + body.ort) +
  pdfRow('E-Mail', body.email) +
  pdfRow('Telefon', body.telefon || '–')
);

const partnerPdf = (modus === 'familie' && partnerJoining) ? pdfSection('Partner/in',
  pdfRow('Vorname', body.partner_vorname) +
  pdfRow('Nachname', body.partner_nachname) +
  pdfRow('Geburtsdatum', body.partner_geburtsdatum) +
  pdfRow('E-Mail', body.partner_email || '–') +
  pdfRow('Telefon', body.partner_telefon || '–')
) : '';

const kinderPdf = kinder.length ? pdfSection('Kinder',
  kinder.map((k, i) => pdfRow(`${i+1}. Kind`, `${k.vorname || '–'} · geb. ${k.geburtsdatum || '–'} · ${k.status || '–'}`)).join('')
) : '';

const feePdfRows = feeItems.map(item => {
  const final = schnupperjahr ? item.unit / 2 : item.unit;
  return `<tr><td class="lbl">${esc(item.label)} — ${esc(item.who)}</td><td>${esc(fmtEur(final))}${schnupperjahr ? ' (50 %)' : ''}</td></tr>`;
}).join('') + `<tr><td class="lbl" style="font-weight:700;padding-top:10px;">Gesamtbeitrag pro Jahr</td><td style="font-weight:700;padding-top:10px;">${esc(fmtEur(total))}</td></tr>`;

const consentPdfRow = (label, val) => `<tr><td class="lbl">${esc(label)}</td><td class="${val ? 'yes' : 'no'}">${val ? '☒ erteilt' : '☐ nicht erteilt'}</td></tr>`;
const consentPdf = pdfSection('Foto- & Datenfreigaben (freiwillig)',
  consentPdfRow('Kontaktdaten an Mitglieder weitergeben', body.share_contact === 'on') +
  consentPdfRow('Foto/Video auf Homepage', body.foto_homepage === 'on') +
  consentPdfRow('Foto/Video auf Facebook', body.foto_facebook === 'on') +
  consentPdfRow('Foto/Video auf Instagram', body.foto_instagram === 'on') +
  consentPdfRow('Foto/Video in regionaler Presse', body.foto_presse === 'on')
);

const sigEntries = [];
sigEntries.push({ img: body.signature, label: `${body.vorname} ${body.nachname} (Antragsteller)` });
if (modus === 'familie' && partnerJoining && body.partner_signature) {
  sigEntries.push({ img: body.partner_signature, label: `${body.partner_vorname} ${body.partner_nachname} (Partner/in)` });
}
if (modus === 'einzel' && isMinor && body.guardian_signature) {
  sigEntries.push({ img: body.guardian_signature, label: `${body.guardian_name || ''} (Erziehungsberechtigte/r)` });
}
const sigHtml = '<h2>Unterschrift' + (sigEntries.length > 1 ? 'en' : '') + '</h2><div class="signatures">' +
  sigEntries.map(s =>
    '<div class="sig">' +
      '<div class="sig-box"><img src="' + s.img + '" alt="Unterschrift"></div>' +
      '<div class="sig-label">' + esc(s.label) + '<br><span class="sig-meta">' + esc(eingegangen) + '</span></div>' +
    '</div>'
  ).join('') + '</div>';

const pdfHtml =
  '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Mitgliedsantrag ' + esc(body.vorname) + ' ' + esc(body.nachname) + '</title>' +
  '<style>' +
  '@page { size: A4; margin: 16mm 14mm; }' +
  '* { box-sizing: border-box; }' +
  'body { font-family: Helvetica, Arial, sans-serif; color: #1f2937; font-size: 10.5pt; line-height: 1.45; margin: 0; }' +
  '.head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e56a0; padding-bottom: 10px; margin-bottom: 16px; }' +
  '.head h1 { color: #0a1628; font-size: 20pt; margin: 0; }' +
  '.head .sub { color: #6b7280; font-size: 10pt; margin-top: 2px; }' +
  '.meta { text-align: right; font-size: 9.5pt; color: #374151; }' +
  '.meta code { background: #f0f6fe; padding: 1px 5px; border-radius: 3px; font-size: 9pt; }' +
  '.modus-badge { display:inline-block; background:#1e56a0; color:white; padding:2px 8px; border-radius:4px; font-size:9pt; margin-top:4px; }' +
  'h2 { color: #1e56a0; font-size: 12.5pt; margin: 18px 0 7px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }' +
  'table.kv { width: 100%; border-collapse: collapse; margin: 0 0 4px; }' +
  'table.kv td { padding: 4px 8px; border-bottom: 1px solid #f0f2f5; vertical-align: top; }' +
  'table.kv td.lbl { color: #6b7280; width: 38%; }' +
  'td.yes { color: #065f46; font-weight: 600; }' +
  'td.no { color: #6b7280; }' +
  '.mandate-text { font-size: 9.5pt; line-height: 1.55; color: #374151; background: #f0f6fe; border-left: 3px solid #1e56a0; padding: 10px 12px; border-radius: 4px; margin: 8px 0 10px; }' +
  '.signatures { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 12px; }' +
  '.sig { flex: 1 1 220px; }' +
  '.sig-box { border: 1px solid #cbd5e0; border-radius: 6px; background: #fafbfc; height: 80px; padding: 4px; display: flex; align-items: center; justify-content: center; }' +
  '.sig-box img { max-width: 100%; max-height: 100%; }' +
  '.sig-label { font-size: 8.5pt; color: #374151; margin-top: 5px; text-align: center; }' +
  '.sig-meta { color: #9ca3af; font-size: 8pt; }' +
  '.audit { margin-top: 14px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 8.5pt; color: #6b7280; line-height: 1.5; }' +
  '.audit strong { color: #374151; }' +
  '</style></head><body>' +
  '<div class="head">' +
    '<div>' +
      '<h1>Mitgliedsantrag</h1>' +
      '<div class="sub">Tennisclub Blau-Weiss Attendorn e.V. · Schnellenberg 1 · 57439 Attendorn</div>' +
      '<div class="modus-badge">' + esc(modusLabel) + (schnupperjahr ? ' · Schnupperjahr' : '') + '</div>' +
    '</div>' +
    '<div class="meta">' +
      '<strong>Eingegangen:</strong> ' + esc(eingegangen) + '<br>' +
      '<strong>Mandatsreferenz:</strong> <code>' + esc(mandateRef) + '</code>' +
    '</div>' +
  '</div>' +

  personalPdf + partnerPdf + kinderPdf +

  '<h2>Beiträge' + (schnupperjahr ? ' (Schnupperjahr — 50 %)' : '') + '</h2>' +
  '<table class="kv">' + feePdfRows + '</table>' +

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

  consentPdf +

  '<h2>Datenschutz</h2>' +
  '<table class="kv">' +
    pdfRow('Datenschutzerklärung gelesen und akzeptiert', body.privacy_consent === 'on' ? '☒ ja' : '☐ nein') +
  '</table>' +

  sigHtml +

  (modus === 'einzel' && body.partner_already_member === 'on'
    ? '<div style="margin-top:14px;background:#fef3c7;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:5px;font-size:10pt;line-height:1.5;color:#78350f;"><strong>Hinweis an den Vorstand:</strong> Antragsteller gibt an, dass der/die Ehepartner/in bereits aktives Mitglied ist. Beiträge der bereits gemeldeten Kinder bitte auf die Staffelung „beide Eltern Mitglied" anpassen (40 € / 30 € / 20 € / 10 €).</div>'
    : '') +

  '<div class="audit">' +
    '<strong>Audit-Stempel</strong><br>' +
    'Elektronisch erteilt am ' + esc(eingegangen) + ' (Europe/Berlin) · Mandatsreferenz: <strong>' + esc(mandateRef) + '</strong><br>' +
    'User-Agent: ' + esc(body.user_agent || '–') +
  '</div>' +

  '</body></html>';

const safeName = asciify(body.nachname + '_' + body.vorname).replace(/[^A-Za-z0-9_-]/g, '');
const pdfFilename = 'Mitgliedsantrag_' + safeName + '_' + mandateRef + '.pdf';

return [{ json: { ok: true, body, mandateRef, eingegangen, vorstandHtml, applicantHtml, pdfHtml, pdfFilename, iban, isMinor, modus, total, schnupperjahr } }];
