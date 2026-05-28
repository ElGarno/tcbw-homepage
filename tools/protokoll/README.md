# Vorstandsprotokolle — Markdown → styled HTML

Renderer für Vorstandssitzungsprotokolle des TC Blau-Weiss Attendorn. Du schreibst
in Markdown (z. B. in Obsidian), das Skript erzeugt eine ordnerbasierte HTML-Version
im TC-BW-Designsystem (Blau/Weiß, DM Sans + Playfair Display, Wappen-Stripe,
Beschluss-Callouts, Aufgabenliste mit Personen-Cards).

## Quick start

```bash
cd tools/protokoll
uv run render.py samples/2026-05-27.md
open output/2026-05-27/index.html
```

Output ist ein eigenständiger Ordner unter `output/<YYYY-MM-DD>/` mit `index.html`,
`colors_and_type.css`, `assets/wappen.png` und `fonts/`. Direkt versendbar als ZIP
oder unter einen geschützten Bereich (z. B. `intern.tc-bw-attendorn.de/protokolle/2026-05-27/`)
deploybar.

## Verzeichnisstruktur

```
tools/protokoll/
├── render.py                  # CLI-Skript (uv-managed, inline deps)
├── personen.yaml              # Vorstandsmitglieder + Rollen + Avatare
├── template/
│   ├── template.html.j2       # Jinja2-Template (HTML + inline CSS)
│   ├── colors_and_type.css    # Design-Tokens (DM Sans / Playfair / Blau-Palette)
│   ├── assets/wappen.png
│   └── fonts/*.ttf
├── samples/
│   ├── 2026-05-27.md          # Beispielprotokoll, dient als Referenz
│   └── 2026-05-27_original.html  # Original-Renderausgabe (Regressionstest)
└── output/                    # Generierte Protokolle (per Datum)
```

## Markdown-Konventionen

### Frontmatter (YAML)

```yaml
---
title: Vorstandssitzung           # optional, default "Vorstandssitzung"
date: 2026-05-27                  # Pflichtfeld
beginn: 20:09 Uhr
ende: 21:20 Uhr
ort: Clubhaus des Tennisclub „Blau-Weiss" Attendorn e.V.
ort_kurz: Clubhaus                # optional, für den Untertitel
anwesende: Aaron Heseler, Felix Kersting, ...
entschuldigt: Marc Horlacher
protokollfuehrung: Fabian Wörenkämper
---
```

Die Sitzungsdauer (`dauer`) wird automatisch aus `beginn`/`ende` berechnet, kann
aber manuell überschrieben werden.

### TOP-Sektionen

```markdown
## TOP 1 — Social Media

- Listenpunkt
- ...
```

Erkannt wird `## TOP <N> — <Titel>` (Em-Dash, En-Dash oder Bindestrich erlaubt).

### Unter-Punkte (für TOP 4 „Verschiedenes" etc.)

```markdown
## TOP 4 — Verschiedenes

### 4.1 Sonnensegel

- ...

### 4.2 Clubhaus — Entsorgungen

- ...
```

Erkannt wird `### <N>.<M> <Titel>`.

### Beschluss-Callout

Blockquote mit Marker `**Beschluss:**`:

```markdown
> **Beschluss:** Neuer Getränkewart ist **Felix Kersting**,
> unterstützt von **Carsten Heimes**.
```

→ wird zur blauen Callout-Box mit Label „BESCHLUSS". Beschlüsse können sowohl
direkt unter einem TOP als auch innerhalb eines Sub-Blocks (4.1 etc.) stehen.

### Frist-Pille

Inline `📅 YYYY-MM-DD`:

```markdown
- **Antrag muss bis 31.05.2026 gestellt sein** 📅 2026-05-31
- [ ] Antrag Jugendarbeit stellen 📅 2026-05-31 #martina
```

→ wird zur orangefarbenen Pille „Frist 31.05." (Tag/Monat aus dem ISO-Datum).

### Tabellen

Standard-Markdown-Tabellen werden mit dem `opt-table`-Stil gerendert. Eine Zeile
mit `★ ` am Anfang der ersten Spalte wird als „empfohlen" markiert (blau + Stern):

```markdown
| Option | Charakter |
|---|---|
| Clubmeisterschaft | kompetitiver, klassisch |
| ★ Tenniscamp-Revival | gesellig, offen für alle Spielstärken |
```

### Aufgabenliste

Die Sektion `## Aufgabenliste` wird in Personen-Cards umgewandelt:

```markdown
## Aufgabenliste

### Fabian Wörenkämper

- [ ] n8n-Workflow erweitern: nuLiga-Ergebnis → Benachrichtigung an Feli #fabian
- [ ] Homepage: Impressum korrigieren #fabian

### Martina Franz

- [ ] Antrag Jugendarbeit stellen 📅 2026-05-31 #martina

### Stefan Hütte → Bastian Gerlach

- [ ] Bedarfsweise Übergabe von Aufgaben und Akten #stefan-huette
```

- Personennamen werden gegen `personen.yaml` gematcht (per Name oder Alias).
  Match → Rolle, Initialen, Avatar-Farbe werden übernommen.
- `#hashtags` werden vom Anzeige-Text gestrippt (sie dienen nur als Marker in
  Obsidian).
- Ein Heading der Form `### Name1 → Name2` (oder `/`) wird automatisch als
  Übergabe-Card mit Pfeil dargestellt.
- Personen mit ≥ 5 Aufgaben (oder Übergabe-Cards) werden über die volle
  Breite (`wide`) gerendert.
- Reihenfolge im Output = Reihenfolge im Markdown.

### Personen-Datei (`personen.yaml`)

```yaml
- key: fabian-woerenkaemper
  name: Fabian Wörenkämper
  initials: FW
  role: Webmaster · Protokoll
  avatar_style: blue        # oder "gray" für externe / nicht-aktive
  aliases:
    - Fabian
    - Fabian W.
```

Neue Person → einfach Eintrag hinzufügen, dann im Markdown den Namen verwenden.
Unbekannte Personen werden mit aus dem Namen abgeleiteten Initialen und ohne
Rolle gerendert (keine Fehler).

## Workflow für ein neues Protokoll

1. **Notizen während der Sitzung** in Obsidian.
2. **Markdown-Datei anlegen**, z. B. `protokolle/2026-08-15.md`, mit
   Frontmatter (oder Kopie eines früheren Protokolls als Basis).
3. **Rendern**: `uv run render.py protokolle/2026-08-15.md`
4. **Prüfen** im Browser: `open output/2026-08-15/index.html`
5. **Versenden / Deployen**: Ordner als ZIP, oder Sync in den internen
   Web-Bereich.

## Abhängigkeiten

`render.py` verwendet uv-Inline-Script-Metadaten — die Dependencies (`jinja2`,
`markdown`, `python-frontmatter`, `pyyaml`) werden beim ersten Lauf automatisch
in einer isolierten venv installiert. Kein `pip install`, kein `pyproject.toml`
nötig.

Python ≥ 3.12 wird vorausgesetzt.
