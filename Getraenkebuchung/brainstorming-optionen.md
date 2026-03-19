# Getraenkebuchungs-App -- Brainstorming Optionen

## Anforderungen (geklaert)

- **Zweck:** Digitale Strichliste fuer Vereinsbar-Getraenke
- **Nutzer:** 30-80 Mitglieder, sehr unterschiedlich technikaffin
- **Geraet:** Fest montiertes Tablet an der Wand (iPad oder Android -- noch zu klaeren)
- **Getraenke:** Feste Liste (Krombacher Pils Flasche, Krombacher Pils vom Fass, Coca Cola, Wasser, Erdinger Alkoholfrei) -- hardcoded
- **Abrechnung:** Mitglieder tracken selbst, einmal im Jahr rechnet der Kassenwart ab
- **Kontostand:** Jedes Mitglied sieht seinen offenen Betrag
- **Bezahlung:** PayPal + Apple Pay / Google Pay via Stripe (Nice-to-have, integriert)
- **Kassenwart-Bereich:** Uebersicht aller Mitglieder, PIN-Reset, Abrechnungsfunktion

## Offene Frage

- **Welches Tablet?** iPad oder Android -- bestimmt ob Ansatz C moeglich ist

---

## Ansatz A: Reine Client-Side PWA mit PIN (empfohlen wenn Tablet unklar)

Alles laeuft im Browser auf dem Tablet. Daten werden lokal in IndexedDB gespeichert.
Stripe Checkout fuer Bezahlung ueber eine minimale Serverless-Function.

- **Identifikation:** Namensliste + 4-stellige PIN
- **Tech:** HTML/CSS/JS (oder Vue/Svelte), IndexedDB, Stripe Checkout
- **Hosting:** Statische Dateien auf Cloudflare Pages
- **Kosten:** Keine laufenden Kosten (ausser Stripe-Gebuehren bei Bezahlung)

| Vorteile | Nachteile |
|----------|-----------|
| Kein Server, kein Backend, keine DB | Daten nur auf dem einen Geraet |
| Laeuft auf iPad und Android | Tablet kaputt = Daten weg (Backup noetig) |
| Extrem einfach und kostenlos | PIN-Vergessen bei wenig technikaffinen Nutzern |
| Schnell umgesetzt | |

## Ansatz B: PWA mit leichtgewichtigem Backend

Frontend als PWA, dazu ein kleines Backend (FastAPI auf Synology oder Cloudflare Workers)
mit PostgreSQL-Datenbank.

- **Identifikation:** Namensliste + 4-stellige PIN
- **Tech:** PWA-Frontend + Python/FastAPI Backend, PostgreSQL auf Synology
- **Hosting:** Frontend auf Cloudflare Pages, Backend auf Synology oder Cloudflare Workers

| Vorteile | Nachteile |
|----------|-----------|
| Daten sicher auf Server | Mehr Aufwand |
| Spaeter leicht erweiterbar (Handy-Zugriff) | Backend muss laufen und erreichbar sein |
| Zentrale Datenhaltung | Tablet braucht Netzwerk fuer jede Buchung |

## Ansatz C: Native iPad-App mit NFC (beste UX, wenn iPad sicher)

Native Swift-App mit CoreData/SwiftData fuer lokale Persistierung.
NFC-Tags als Schluesselanhaenger fuer Mitglieder.

- **Identifikation:** NFC-Tag an iPad halten -- kein Tippen, kein PIN merken
- **Tech:** Swift/SwiftUI, CoreData/SwiftData, Apple Pay nativ
- **Voraussetzung:** Apple Developer Account, iPad (kein Android)
- **NFC-Tags:** ca. 0,30-0,80 EUR/Stueck (NTAG215/216), gesamt 25-65 EUR fuer 80 Mitglieder

| Vorteile | Nachteile |
|----------|-----------|
| Beste UX (Tag antippen → Getraenk waehlen → fertig) | Nur iPad, kein Android |
| Kein PIN vergessen moeglich | Deutlich mehr Entwicklungsaufwand |
| Natives Offline, bombensicher | Xcode + Build + TestFlight noetig fuer Updates |
| iPad Kiosk-Modus ("Gefuehrter Zugriff") | NFC-Tags kaufen und verteilen |
| Apple Pay direkt integriert | Datenmigration bei Tablet-Wechsel |

---

## Empfehlung

- **Tablet unklar:** Ansatz A (PWA + PIN) -- funktioniert ueberall, geringster Aufwand
- **iPad sicher + Developer Account vorhanden:** Ansatz C (Native + NFC) -- beste User Experience