#!/usr/bin/env python3
"""Generate a PDF overview of the new TC BW Attendorn homepage for the board."""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    HRFlowable,
)

# Colors
BLUE = colors.HexColor("#003366")
LIGHT_BLUE = colors.HexColor("#e8eef5")
DARK = colors.HexColor("#212121")
GRAY = colors.HexColor("#666666")
GREEN = colors.HexColor("#1a7a1a")
RED = colors.HexColor("#b42828")
WHITE = colors.white

WIDTH, HEIGHT = A4


def build_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        "TitleMain",
        parent=styles["Title"],
        fontSize=26,
        textColor=BLUE,
        spaceAfter=6,
        alignment=1,
    ))
    styles.add(ParagraphStyle(
        "SubTitle",
        parent=styles["Normal"],
        fontSize=16,
        textColor=DARK,
        alignment=1,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        "SectionHead",
        parent=styles["Heading1"],
        fontSize=14,
        textColor=BLUE,
        spaceBefore=14,
        spaceAfter=6,
        borderWidth=0,
    ))
    styles.add(ParagraphStyle(
        "SubHead",
        parent=styles["Heading2"],
        fontSize=11,
        textColor=DARK,
        spaceBefore=10,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        textColor=DARK,
        leading=14,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        "BulletCustom",
        parent=styles["Normal"],
        fontSize=10,
        textColor=DARK,
        leading=14,
        leftIndent=12,
        spaceAfter=3,
    ))
    styles.add(ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontSize=9,
        textColor=DARK,
        leading=12,
    ))
    styles.add(ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontSize=9,
        textColor=DARK,
        leading=12,
        fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontSize=9,
        textColor=WHITE,
        leading=12,
        fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "CenterGray",
        parent=styles["Normal"],
        fontSize=11,
        textColor=GRAY,
        alignment=1,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        "GreenCell",
        parent=styles["Normal"],
        fontSize=9,
        textColor=GREEN,
        leading=12,
    ))
    styles.add(ParagraphStyle(
        "RedCell",
        parent=styles["Normal"],
        fontSize=9,
        textColor=RED,
        leading=12,
    ))
    return styles


def make_comparison_table(styles):
    header = [
        Paragraph("Thema", styles["TableHeader"]),
        Paragraph("Alte Seite", styles["TableHeader"]),
        Paragraph("Neue Seite", styles["TableHeader"]),
    ]
    rows = [
        ("Sicherheit", "Note 6 \u2013 kein HTTPS, veraltetes PHP", "Note 1-2 \u2013 unangreifbar"),
        ("Google-Auffindbarkeit", "Note 6 \u2013 komplett blockiert!", "Note 2 \u2013 gut optimiert"),
        ("Design", "Note 5 \u2013 Theme von 2015, kein Logo", "Note 1-2 \u2013 modern, Vereinsfarben"),
        ("Inhalte aktuell", "Note 5 \u2013 letzter Stand April 2024", "Note 2 \u2013 Saison 2026 drin"),
        ("Navigation", "Note 5 \u2013 11 Men\u00fcpunkte", "Note 2 \u2013 5 klare Punkte"),
        ("Handy-Darstellung", "Note 3 \u2013 nur grundlegend", "Note 2 \u2013 optimiert"),
        ("Ladegeschwindigkeit", "Note 3-4 \u2013 langsam", "Note 1 \u2013 unter 1 Sekunde"),
        ("Wartungsaufwand", "Note 4 \u2013 st\u00e4ndig Updates", "Note 1-2 \u2013 kein Server"),
        ("Laufende Kosten", "5\u201310 \u20ac/Monat", "0 \u20ac/Monat"),
        ("Gesamtnote", "5 (mangelhaft)", "~1,5 (sehr gut)"),
    ]

    data = [header]
    for topic, old, new in rows:
        data.append([
            Paragraph(topic, styles["TableCellBold"]),
            Paragraph(old, styles["RedCell"]),
            Paragraph(new, styles["GreenCell"]),
        ])

    col_widths = [55 * mm, 55 * mm, 55 * mm]
    table = Table(data, colWidths=col_widths)

    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    # Zebra striping
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), LIGHT_BLUE))

    table.setStyle(TableStyle(style_cmds))
    return table


def make_feature_table(styles):
    header = [
        Paragraph("Bereich", styles["TableHeader"]),
        Paragraph("Inhalt", styles["TableHeader"]),
    ]
    features = [
        ("Startseite", "Modernes Design in Blau/Weiss mit Vereinswappen"),
        ("Quick-Info", "N\u00e4chster Termin + Platzbuchung sofort sichtbar"),
        ("Aktuelles", "News & Berichte (Saisonstart, Aufrufe, Platzpflege)"),
        ("Mannschaften", "Alle 7 Teams mit Spielpl\u00e4nen, Kapit\u00e4nen & Liga-Links"),
        ("Termine", "18 Heimspiele & Events, vergangene automatisch ausgeblendet"),
        ("Galerie", "Bildergalerie f\u00fcr Vereinsfotos"),
        ("Instagram", "Feed-Einbindung auf der Startseite (in Vorbereitung)"),
        ("Verein", "Historie (seit 1931), Vorstand, Mitgliedschaft & Beitr\u00e4ge"),
        ("Anfahrt", "Google Maps mit Adresse & Clubhaus-Telefon"),
        ("Platzbuchung", "Direktlink zu courtbooking.de in der Navigation"),
        ("Rechtliches", "Impressum & Datenschutz korrekt im Footer"),
    ]

    data = [header]
    for area, desc in features:
        data.append([
            Paragraph(area, styles["TableCellBold"]),
            Paragraph(desc, styles["TableCell"]),
        ])

    col_widths = [38 * mm, 127 * mm]
    table = Table(data, colWidths=col_widths)

    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), LIGHT_BLUE))

    table.setStyle(TableStyle(style_cmds))
    return table


def make_cost_table(styles):
    header = [
        Paragraph("Posten", styles["TableHeader"]),
        Paragraph("Agenturpreis", styles["TableHeader"]),
    ]
    costs = [
        ("Konzept & Beratung", "800 \u2013 1.500 \u20ac"),
        ("Design (Wireframes + Mockup)", "1.600 \u2013 3.000 \u20ac"),
        ("Entwicklung (Templates, CSS, JS)", "2.400 \u2013 5.000 \u20ac"),
        ("Content-Aufbereitung", "800 \u2013 2.000 \u20ac"),
        ("CMS-Setup", "400 \u2013 1.000 \u20ac"),
        ("Deployment & Domain-Setup", "400 \u2013 750 \u20ac"),
        ("Testing & Bugfixing", "800 \u2013 1.500 \u20ac"),
    ]

    data = [header]
    for posten, preis in costs:
        data.append([
            Paragraph(posten, styles["TableCell"]),
            Paragraph(preis, styles["TableCell"]),
        ])
    # Total row
    data.append([
        Paragraph("Gesamt", styles["TableHeader"]),
        Paragraph("7.000 \u2013 15.000 \u20ac", styles["TableHeader"]),
    ])

    col_widths = [70 * mm, 50 * mm]
    table = Table(data, colWidths=col_widths)

    n = len(data)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("BACKGROUND", (0, n - 1), (-1, n - 1), BLUE),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    for i in range(1, n - 1):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), LIGHT_BLUE))

    table.setStyle(TableStyle(style_cmds))
    return table


def main():
    output_path = "/home/user/tcbw-homepage/doc/Homepage-Uebersicht-Vorstand.pdf"
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
    )

    styles = build_styles()
    story = []

    # === TITLE PAGE ===
    story.append(Spacer(1, 60 * mm))
    story.append(Paragraph("TC Blau-Weiss Attendorn", styles["TitleMain"]))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Neue Homepage", styles["SubTitle"]))
    story.append(Paragraph("Feature-\u00dcbersicht f\u00fcr den Vorstand", styles["SubTitle"]))
    story.append(Spacer(1, 25 * mm))
    story.append(Paragraph("tc-bw-attendorn.de", styles["CenterGray"]))
    story.append(Paragraph("Stand: April 2026", styles["CenterGray"]))
    story.append(PageBreak())

    # === PAGE 2: FEATURES ===
    story.append(Paragraph("Was bietet die neue Seite?", styles["SectionHead"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE, spaceAfter=8))
    story.append(make_feature_table(styles))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Besonderes Highlight: E-Mail \u2192 Homepage", styles["SubHead"]))
    story.append(Paragraph(
        "Vorstandsmitglieder k\u00f6nnen <b>per E-Mail</b> Artikel auf die Homepage bringen. "
        "Eine KI wandelt die Mail automatisch in einen Beitrag um und erstellt "
        "einen Entwurf. Die Seite wird t\u00e4glich um 6 Uhr automatisch aktualisiert.",
        styles["Body"],
    ))
    story.append(PageBreak())

    # === PAGE 3: COMPARISON ===
    story.append(Paragraph("Gegen\u00fcberstellung: Alt vs. Neu", styles["SectionHead"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE, spaceAfter=8))
    story.append(Paragraph(
        "Bewertung nach Schulnoten (1 = sehr gut, 6 = ungen\u00fcgend):",
        styles["Body"],
    ))
    story.append(Spacer(1, 3 * mm))
    story.append(make_comparison_table(styles))

    # Key improvements
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Die 6 wichtigsten Verbesserungen", styles["SectionHead"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE, spaceAfter=8))

    improvements = [
        ("<b>Sicher</b> \u2013 Kein hackbares WordPress mehr. Die alte Seite lief auf "
         "Software ohne Sicherheitsupdates seit 2022."),
        ("<b>Bei Google sichtbar</b> \u2013 Die alte Seite war aktiv aus Google "
         "ausgeschlossen. Die neue wird gefunden."),
        ("<b>Aktuell</b> \u2013 Alle 7 Mannschaften, Spielpl\u00e4ne und 18 Termine "
         "der Saison 2026 sind eingepflegt."),
        ("<b>Einfach zu pflegen</b> \u2013 Artikel k\u00f6nnen per E-Mail eingestellt "
         "werden. Kein WordPress-Login n\u00f6tig."),
        ("<b>Kostenlos</b> \u2013 Hosting kostet nichts mehr "
         "(Ersparnis ca. 60\u2013120 \u20ac/Jahr)."),
        ("<b>Modern</b> \u2013 Vereinswappen, Blau-Weiss-Design, schnell, mobilfreundlich."),
    ]
    for item in improvements:
        story.append(Paragraph("\u2022  " + item, styles["BulletCustom"]))
    story.append(PageBreak())

    # === PAGE 4: COSTS + OPEN ITEMS ===
    story.append(Paragraph("Was h\u00e4tte das bei einer Agentur gekostet?", styles["SectionHead"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE, spaceAfter=8))
    story.append(Paragraph(
        "Eine vergleichbare Website h\u00e4tte bei einer Agentur "
        "<b>8.000 \u2013 12.000 \u20ac</b> gekostet (72\u2013118 Stunden Arbeit).",
        styles["Body"],
    ))
    story.append(Spacer(1, 4 * mm))
    story.append(make_cost_table(styles))

    # Open items
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Was steht noch aus?", styles["SectionHead"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE, spaceAfter=8))

    open_items = [
        "<b>Echte Fotos</b> f\u00fcr Galerie und Vereins-Sektionen",
        "<b>Instagram-Feed</b> einbetten (braucht Meta Business Account)",
        "<b>Vorstandswechsel</b> einpflegen (sobald offiziell)",
        "<b>DecapCMS Login</b> f\u00fcr Content-Bearbeitung im Browser (Auth-L\u00f6sung offen)",
    ]
    for item in open_items:
        story.append(Paragraph("\u2022  " + item, styles["BulletCustom"]))

    # Footer info
    story.append(Spacer(1, 12 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BLUE, spaceAfter=6))
    story.append(Paragraph("Neue Homepage: tc-bw-attendorn.de", styles["CenterGray"]))
    story.append(Paragraph("Kontakt Digitales: Fabian W\u00f6renk\u00e4mper", styles["CenterGray"]))
    story.append(Paragraph("E-Mail: vorstand@tc-bw-attendorn.de", styles["CenterGray"]))

    doc.build(story)
    print(f"PDF erstellt: {output_path}")


if __name__ == "__main__":
    main()
