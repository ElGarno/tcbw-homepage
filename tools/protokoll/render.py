#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "jinja2>=3.1",
#   "markdown>=3.5",
#   "python-frontmatter>=1.1",
#   "pyyaml>=6.0",
# ]
# ///
"""Render a TC-BW Vorstand protocol Markdown file to a styled HTML directory.

Usage:
    uv run render.py samples/2026-05-27.md [--output-dir output/]

Markdown conventions (see README.md for full list):
    - Frontmatter: date, beginn, ende, ort, anwesende, entschuldigt, protokollfuehrung, title
    - ## TOP N — Title              → new TOP section
    - ### N.M Title                 → sub-block inside current TOP (e.g. 4.1, 4.2)
    - > **Beschluss:** content      → blue callout box
    - 📅 YYYY-MM-DD                  → orange "Frist DD.MM." pill
    - ★ Row in table                → recommended row (blue + star)
    - ## Aufgabenliste              → tasks section follows
    - ### Personenname              → person card (matched against personen.yaml)
    - - [ ] task #tag               → checkbox task (hashtags stripped)
"""
from __future__ import annotations

import argparse
import re
import shutil
import unicodedata
from dataclasses import dataclass, field
from datetime import date as date_cls, datetime
from pathlib import Path
from typing import Any

import frontmatter
import markdown as md
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape


SCRIPT_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = SCRIPT_DIR / "template"
PERSONEN_FILE = SCRIPT_DIR / "personen.yaml"


GERMAN_WEEKDAYS = [
    "Montag", "Dienstag", "Mittwoch", "Donnerstag",
    "Freitag", "Samstag", "Sonntag",
]
GERMAN_MONTHS = [
    "", "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
]


# ─────────────── Data classes ───────────────

@dataclass
class SubBlock:
    num: str
    title: str
    content_html: str = ""
    beschluss_html: str | None = None


@dataclass
class Top:
    num: str
    title: str
    content_html: str = ""
    beschluss_html: str | None = None
    subs: list[SubBlock] = field(default_factory=list)


@dataclass
class Task:
    id: str
    text_html: str


@dataclass
class Person:
    key: str
    display_name: str
    initials: str
    role: str
    avatar_style: str
    tasks: list[Task] = field(default_factory=list)
    wide: bool = False


# ─────────────── Date helpers ───────────────

def parse_date(value: Any) -> date_cls:
    if isinstance(value, date_cls):
        return value
    if isinstance(value, datetime):
        return value.date()
    return datetime.strptime(str(value), "%Y-%m-%d").date()


def format_german_date(d: date_cls) -> str:
    return f"{d.day:02d}.{d.month:02d}.{d.year}"


def format_long_date(d: date_cls) -> str:
    weekday = GERMAN_WEEKDAYS[d.weekday()]
    month = GERMAN_MONTHS[d.month]
    return f"{weekday}, {d.day}. {month} {d.year}"


def compute_duration(beginn: str, ende: str) -> str:
    """Return 'X Std Y Min' from HH:MM strings; fallback to empty on parse error."""
    try:
        b = datetime.strptime(beginn.replace(" Uhr", "").strip(), "%H:%M")
        e = datetime.strptime(ende.replace(" Uhr", "").strip(), "%H:%M")
        delta = e - b
        total_min = int(delta.total_seconds() // 60)
        hours, mins = divmod(total_min, 60)
        if hours and mins:
            return f"{hours} Std {mins} Min"
        if hours:
            return f"{hours} Std"
        return f"{mins} Min"
    except (ValueError, AttributeError):
        return ""


# ─────────────── Personen ───────────────

def load_personen() -> dict[str, dict]:
    data = yaml.safe_load(PERSONEN_FILE.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("personen.yaml must be a list of person dicts")
    return data


def normalise(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii").lower().strip()


def find_person(personen: list[dict], heading: str) -> dict | None:
    """Match the markdown heading against a personen.yaml entry (name + aliases)."""
    norm_heading = normalise(heading)
    candidates: list[tuple[int, dict]] = []
    for p in personen:
        names = [p["name"]] + p.get("aliases", [])
        for n in names:
            norm = normalise(n)
            if norm == norm_heading:
                return p
            if norm and norm in norm_heading:
                candidates.append((len(norm), p))
    if candidates:
        candidates.sort(reverse=True)
        return candidates[0][1]
    return None


def derive_initials(name: str) -> str:
    parts = [p for p in re.split(r"\s+", name.strip()) if p and not p.startswith("(")]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][0].upper()
    return (parts[0][0] + parts[-1][0]).upper()


# ─────────────── Markdown post-processing ───────────────

DEADLINE_RE = re.compile(r"📅\s*(\d{4}-\d{2}-\d{2})")


def render_deadline_pill(iso_date: str) -> str:
    try:
        d = datetime.strptime(iso_date, "%Y-%m-%d").date()
        label = f"Frist {d.day:02d}.{d.month:02d}."
    except ValueError:
        label = f"Frist {iso_date}"
    return f'<span class="deadline">{label}</span>'


def substitute_deadlines(html: str) -> str:
    return DEADLINE_RE.sub(lambda m: render_deadline_pill(m.group(1)), html)


def post_process_tables(html: str) -> str:
    """Add opt-table class and mark ★-prefixed rows as recommended."""
    html = html.replace("<table>", '<table class="opt-table">')

    def fix_row(match: re.Match) -> str:
        row = match.group(0)
        first_cell = re.search(r"<td>([^<]*)</td>", row)
        if first_cell and first_cell.group(1).lstrip().startswith("★"):
            row = row.replace("<tr>", '<tr class="recommend">', 1)
            row = row.replace(first_cell.group(0), f"<td>{first_cell.group(1).lstrip('★ ').strip()}</td>", 1)
        return row

    return re.sub(r"<tr>.*?</tr>", fix_row, html, flags=re.DOTALL)


def render_markdown_block(text: str) -> str:
    """Render a chunk of markdown to HTML with all custom post-processing."""
    if not text.strip():
        return ""
    html = md.markdown(text, extensions=["tables", "sane_lists"])
    html = post_process_tables(html)
    html = substitute_deadlines(html)
    return html


BESCHLUSS_RE = re.compile(
    r"(?:^|\n)((?:>[^\n]*\n?)+)",
    re.MULTILINE,
)
BESCHLUSS_LABEL_RE = re.compile(r"^\s*\*\*Beschluss\s*:?\*\*\s*", re.IGNORECASE)


def extract_beschluss(text: str) -> tuple[str, str | None]:
    """Extract a `> **Beschluss:** ...` blockquote. Returns (remaining_md, beschluss_html|None)."""
    for match in BESCHLUSS_RE.finditer(text):
        block = match.group(1)
        # Strip leading "> " from each line.
        unquoted = "\n".join(line[2:] if line.startswith("> ") else line.lstrip("> ") for line in block.splitlines())
        if BESCHLUSS_LABEL_RE.match(unquoted):
            content = BESCHLUSS_LABEL_RE.sub("", unquoted).strip()
            html = md.markdown(content, extensions=["sane_lists"])
            # Strip wrapping <p>...</p> if it's a single paragraph.
            html = re.sub(r"^<p>(.*)</p>$", r"\1", html.strip(), flags=re.DOTALL)
            html = substitute_deadlines(html)
            remaining = text[:match.start()] + text[match.end():]
            return remaining, html
    return text, None


# ─────────────── Body parsing ───────────────

TOP_HEADING_RE = re.compile(r"^##\s+TOP\s+(\d+)\s*[—–-]\s*(.+?)\s*$", re.MULTILINE)
SUB_HEADING_RE = re.compile(r"^###\s+(\d+\.\d+)\s+(.+?)\s*$", re.MULTILINE)


def split_body_into_tops(body: str) -> list[Top]:
    matches = list(TOP_HEADING_RE.finditer(body))
    tops: list[Top] = []
    for idx, m in enumerate(matches):
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(body)
        block_text = body[start:end].strip()
        top = Top(num=m.group(1), title=m.group(2).strip())

        # Split sub-blocks (e.g. ### 4.1 …).
        sub_matches = list(SUB_HEADING_RE.finditer(block_text))
        if sub_matches:
            head_text = block_text[:sub_matches[0].start()].strip()
            top.content_html, top.beschluss_html = _process_block(head_text)
            for s_idx, sm in enumerate(sub_matches):
                s_start = sm.end()
                s_end = sub_matches[s_idx + 1].start() if s_idx + 1 < len(sub_matches) else len(block_text)
                sub_text = block_text[s_start:s_end].strip()
                content_html, beschluss_html = _process_block(sub_text)
                top.subs.append(SubBlock(
                    num=sm.group(1),
                    title=sm.group(2).strip(),
                    content_html=content_html,
                    beschluss_html=beschluss_html,
                ))
        else:
            top.content_html, top.beschluss_html = _process_block(block_text)
        tops.append(top)
    return tops


def _process_block(text: str) -> tuple[str, str | None]:
    """Extract beschluss from a chunk, render the remaining markdown."""
    text, beschluss_html = extract_beschluss(text)
    return render_markdown_block(text), beschluss_html


# ─────────────── Aufgabenliste parsing ───────────────

AUFGABEN_RE = re.compile(r"^##\s+Aufgabenliste.*?$", re.MULTILINE)
PERSON_HEADING_RE = re.compile(r"^###\s+(.+?)\s*$", re.MULTILINE)
TASK_LINE_RE = re.compile(r"^\s*-\s*\[\s*\]\s*(.+?)\s*$", re.MULTILINE)
HASHTAG_RE = re.compile(r"\s*#[\w-]+\b")


def extract_aufgaben_section(body: str) -> str | None:
    m = AUFGABEN_RE.search(body)
    if not m:
        return None
    rest = body[m.end():]
    # Cut off at next `## ` heading (e.g. ## Related).
    next_h2 = re.search(r"^##\s+(?!#)", rest, re.MULTILINE)
    if next_h2:
        rest = rest[:next_h2.start()]
    return rest


def render_person_display_name(heading: str, matched_name: str | None) -> str:
    """Build the rendered display name for a person card.

    - Headings with '→' or '/' (transition) get the arrow span and keep the heading text.
    - Otherwise: use the canonical name from personen.yaml if matched, else clean heading.
    """
    cleaned = re.sub(r"\s*\(n\.a\.\)", "", heading).strip()
    arrow_match = re.match(r"^(.+?)\s*(?:→|->|/)\s*(.+)$", cleaned)
    if arrow_match:
        first, second = arrow_match.group(1).strip(), arrow_match.group(2).strip()
        return (f'{first} <span style="color:var(--gray-400); font-weight:400; '
                f'font-size:0.85em;">→ {second}</span>')
    return matched_name or cleaned


def parse_aufgaben(body: str, personen: list[dict]) -> list[Person]:
    section = extract_aufgaben_section(body)
    if not section:
        return []

    person_matches = list(PERSON_HEADING_RE.finditer(section))
    persons: list[Person] = []
    for idx, m in enumerate(person_matches):
        heading = m.group(1).strip()
        start = m.end()
        end = person_matches[idx + 1].start() if idx + 1 < len(person_matches) else len(section)
        person_block = section[start:end]

        cleaned_heading = re.sub(r"\s*\(n\.a\.\)", "", heading).split("→")[0].split("/")[0].strip()
        match_person = find_person(personen, cleaned_heading)

        if match_person:
            key = match_person["key"]
            initials = match_person["initials"]
            role = match_person.get("role", "")
            avatar_style = match_person.get("avatar_style", "blue")
        else:
            key = re.sub(r"[^a-z0-9]+", "-", normalise(cleaned_heading)).strip("-") or "unknown"
            initials = derive_initials(cleaned_heading)
            role = ""
            avatar_style = "blue"

        tasks: list[Task] = []
        for t_idx, tm in enumerate(TASK_LINE_RE.finditer(person_block), start=1):
            raw = tm.group(1).strip()
            stripped = HASHTAG_RE.sub("", raw).strip()
            # Inline markdown (bold, italic) within task text.
            html = md.markdown(stripped, extensions=["tables"])
            html = re.sub(r"^<p>(.*)</p>$", r"\1", html.strip(), flags=re.DOTALL)
            html = substitute_deadlines(html)
            tasks.append(Task(id=f"{key}-{t_idx}", text_html=html))

        if not tasks:
            continue

        matched_name = match_person["name"] if match_person else None
        display_name = render_person_display_name(heading, matched_name)
        wide = len(tasks) >= 5 or "→" in heading or "/" in heading.split("(", 1)[0]
        persons.append(Person(
            key=key,
            display_name=display_name,
            initials=initials,
            role=role,
            avatar_style=avatar_style,
            tasks=tasks,
            wide=wide,
        ))
    return persons


# ─────────────── Main ───────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Render Vorstandsprotokoll-Markdown zu styled HTML.")
    parser.add_argument("input", type=Path, help="Path to the .md source")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=SCRIPT_DIR / "output",
        help="Base output directory (default: tools/protokoll/output)",
    )
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"Input not found: {args.input}")

    post = frontmatter.loads(args.input.read_text(encoding="utf-8"))
    fm = post.metadata
    body = post.content

    sitzung_date = parse_date(fm["date"])
    meta = {
        "title": fm.get("title", "Vorstandssitzung"),
        "date_iso": sitzung_date.isoformat(),
        "date_de": format_german_date(sitzung_date),
        "subtitle": f"{format_long_date(sitzung_date)} · {fm.get('ort_kurz', 'Clubhaus')}",
        "beginn": fm.get("beginn", ""),
        "ende": fm.get("ende", ""),
        "dauer": fm.get("dauer") or compute_duration(fm.get("beginn", ""), fm.get("ende", "")),
        "ort": fm.get("ort", ""),
        "anwesende": fm.get("anwesende", ""),
        "entschuldigt": fm.get("entschuldigt", ""),
        "protokollfuehrung": fm.get("protokollfuehrung", ""),
    }

    # Cut tasks section from body for TOP parsing.
    aufgaben_match = AUFGABEN_RE.search(body)
    body_for_tops = body[: aufgaben_match.start()] if aufgaben_match else body

    tops = split_body_into_tops(body_for_tops)
    personen = load_personen()
    persons = parse_aufgaben(body, personen)

    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        autoescape=select_autoescape(["html", "j2"]),
        trim_blocks=False,
        lstrip_blocks=False,
    )
    template = env.get_template("template.html.j2")
    html = template.render(
        meta=meta,
        tops=tops,
        persons=persons,
        storage_key=f"tcbw-protokoll-{meta['date_iso']}-tasks",
    )

    out_dir = args.output_dir / meta["date_iso"]
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.html").write_text(html, encoding="utf-8")

    # Copy assets (overwrite existing).
    for name in ("colors_and_type.css",):
        shutil.copy2(TEMPLATE_DIR / name, out_dir / name)
    for sub in ("assets", "fonts"):
        target = out_dir / sub
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(TEMPLATE_DIR / sub, target)

    print(f"✓ Rendered to {out_dir}/index.html")


if __name__ == "__main__":
    main()
