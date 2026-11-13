"""Build the Chapters playtest PDF from the digital content snapshot."""
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
CONTENT = json.loads((ROOT / "src/data/chapters-content.json").read_text(encoding="utf8"))
OUTPUT = ROOT / "print/outputs"
OUTPUT.mkdir(parents=True, exist_ok=True)

from reportlab import __file__ as reportlab_file
font = Path(reportlab_file).parent / "fonts/Vera.ttf"
bold = font.with_name("VeraBd.ttf")
pdfmetrics.registerFont(TTFont("Vera", str(font)))
pdfmetrics.registerFont(TTFont("Vera-Bold", str(bold)))
INK = HexColor("#251f18")
COLORS = {
    "Voyages": HexColor("#1e5c68"),
    "Epics": HexColor("#8e451c"),
    "Gothic Horror": HexColor("#623d65"),
}
TITLE = "Mightier than the Sword"


def paragraph(c, text, x, top, width, height, size=10, bold=False, center=False):
    for i in range(12):
        style = ParagraphStyle(
            "component", fontName="Vera-Bold" if bold else "Vera", fontSize=size,
            leading=size * 1.25, textColor=INK, alignment=TA_CENTER if center else 0,
        )
        words = escape(text).replace("\n", "<br/>")
        p = Paragraph(words, style)
        _, h = p.wrap(width, height)
        if h <= height:
            p.drawOn(c, x, top - h)
            return
        size -= .35
    raise ValueError(f"Text exceeds print box: {text}")


def outline(c, x, y, w, h, color):
    c.setFillColor(white)
    c.setStrokeColor(color)
    c.setLineWidth(.55)
    c.rect(x, y, w, h, stroke=1, fill=1)


def icon(c, x, y, combat):
    c.setStrokeColor(INK)
    c.setLineWidth(1.2)
    if combat:
        for direction in (-1, 1):
            c.line(x - 5 * direction, y - 5, x + 5 * direction, y + 5)
            c.line(x - 6 * direction, y - 2, x - 2 * direction, y - 6)
    else:
        path = c.beginPath()
        path.moveTo(x - 5, y)
        path.lineTo(x, y + 5)
        path.lineTo(x + 5, y)
        path.lineTo(x, y - 5)
        path.close()
        c.drawPath(path)


def rules(c):
    page_top = 744
    top = page_top
    source = (ROOT / "docs/PLAYTEST_RULES.md").read_text(encoding="utf8")
    for block in source.strip().split("\n\n"):
        block = block.replace("[special ◇]", "[special]").replace("◇", "diamond").replace("⚔", "swords")
        heading = block.startswith("#")
        block = block.lstrip("# ").replace("\n", " ")
        size = 19 if top == page_top and heading else 12 if heading else 9.5
        style = ParagraphStyle(
            "rule", fontName="Vera-Bold" if heading else "Vera", fontSize=size,
            leading=size * 1.4, textColor=INK,
        )
        p = Paragraph(escape(block), style)
        _, h = p.wrap(528, 680)
        if top - h < 50:
            c.showPage()
            top = page_top
        p.drawOn(c, 42, top - h)
        top -= h + 8
    c.showPage()


def book_face(c, item, x, y, w, h):
    color = COLORS[item["genre"]]
    outline(c, x, y, w, h, color)
    top = y + h
    paragraph(c, item["genre"], x + 14, top - 11, w - 28, 14, 9)
    paragraph(c, item["name"], x + 14, top - 29, w - 28, 29, 17, True)
    icon(c, x + 20, top - 73, item["category"] == "combat")
    paragraph(c, item["effect"], x + 33, top - 65, w - 47, 39, 10)
    spaces = item["spaces"]
    slot_width = (w - 28) / len(spaces)
    for i, space in enumerate(spaces):
        sx = x + 14 + i * slot_width
        outline(c, sx, y + 45, slot_width, 71, color)
        paragraph(c, str(i + 1), sx + 3, y + 111, slot_width - 6, 13, 9, True, True)
        lines = space.split(" + ")
        for j, line in enumerate(lines):
            py = y + 92 - j * 17
            if line == "[special ◇]":
                icon(c, sx + slot_width / 2 - 24, py - 5, False)
                line = "special"
            paragraph(c, line, sx + 3, py, slot_width - 6, 16, 9, False, True)
    fold = x + 14 + slot_width * ((len(spaces) + 1) // 2)
    c.setStrokeColor(color)
    c.setDash(2, 2)
    c.line(fold, y + 34, fold, y + 116)
    c.setDash()
    paragraph(c, "Overflow", x + 14, y + 32, w - 28, 18, 10, True)
    c.roundRect(x + 76, y + 11, w - 90, 25, 4, stroke=1, fill=0)


def card_face(c, kind, item, x, y):
    width, height = 180, 252
    color = COLORS[item["genre"]]
    outline(c, x, y, width, height, color)
    top = y + height
    c.setFillColor(color)
    c.rect(x, top - 6, width, 6, fill=1, stroke=0)
    paragraph(c, f"{kind} · {item['genre']}", x + 12, top - 16, width - 24, 16, 8)
    paragraph(c, item["name"], x + 12, top - 35, width - 24, 45, 15, True)
    if kind == "Character":
        paragraph(c, item["abilityName"], x + 12, top - 87, width - 24, 24, 10, True)
        ability = item["ability"].replace("∞ ", "").replace("⚔ ", "")
        paragraph(c, ability, x + 12, top - 113, width - 24, 99)
        footer = f"Power {item['power']}" + (f" · {item['cost']} ink" if item["cost"] is not None else "")
    elif kind == "Twist":
        paragraph(c, item["effect"], x + 12, top - 95, width - 24, 120, 12)
        footer = f"{item['cost']} ink"
    else:
        paragraph(c, item["condition"], x + 12, top - 80, width - 24, 58)
        paragraph(c, "KEEP · " + item["ongoing"], x + 12, top - 141, width - 24, 41, 9)
        paragraph(c, "TAKE NOW · " + item["instant"], x + 12, top - 183, width - 24, 42, 9)
        footer = f"1 ink : +{item['power']} power"
    paragraph(c, footer, x + 12, y + 23, width - 24, 17, 9, True)


def expanded(key):
    return [item for item in CONTENT[key] for _ in range(item["quantity"])]


def build(path, include_rules):
    c = canvas.Canvas(str(path), pagesize=letter, pageCompression=1)
    c.setTitle(TITLE + " · Chapters")
    if include_rules:
        rules(c)
    for i, item in enumerate(expanded("books")):
        book_face(c, item, 36, 792 - 24 - (i % 3 + 1) * 244, 540, 244)
        if i % 3 == 2:
            c.showPage()
    cards = [(kind, item) for kind, key in (
        ("Character", "characters"), ("Twist", "twists"), ("Subplot", "subplots"),
    ) for item in expanded(key)]
    for i, (kind, item) in enumerate(cards):
        index = i % 9
        card_face(c, kind, item, 36 + index % 3 * 180, 774 - (index // 3 + 1) * 252)
        if index == 8 or i == len(cards) - 1:
            c.showPage()
    size = 90
    for i, item in enumerate(expanded("bookmarks")):
        col, row = i % 6, i // 6
        x, y = 36 + col * size, 789 - (row + 1) * size
        outline(c, x, y, size, size, INK)
        short = [
            "+4 protagonist power", "Draw 1 extra card", "Gain 2 extra ink",
            "Twists cost 1 less ink", "Conflict Subplots +2 power", "Gain a character",
            "Overflow Inklings +2 power", "Page Inklings +2 power", "2 cards per conflict space",
            "Character moves +3", "Bump to overflow on placement", "On loss, 2 ink per Inkling",
        ]
        paragraph(c, short[CONTENT["bookmarks"].index(item)], x + 6, y + 68, size - 12, 56, 10, True, True)
    for i in range(5):
        x, y = 36 + i % 2 * 270, 483 - i // 2 * 55
        outline(c, x, y, 270, 55, INK)
        paragraph(c, f"Player {i + 1} · Ink", x + 8, y + 50, 254, 16, 9, True)
        for n in range(8):
            sx = x + 8 + n * 32
            outline(c, sx, y + 7, 32, 23, INK)
            paragraph(c, str(n), sx, y + 24, 32, 16, 9, False, True)
    c.showPage()
    c.save()


if __name__ == "__main__":
    assert sum(item["quantity"] for item in CONTENT["twists"]) == 27
    assert sum(item["quantity"] for item in CONTENT["subplots"]) == 5
    for filename, full in (("MttS-Chapters-Print-and-Play.pdf", True), ("MttS-Chapters-Replacement-Only.pdf", False)):
        path = OUTPUT / filename
        build(path, full)
        pdf = PdfReader(path)
        assert all(tuple(map(float, page.mediabox[2:])) == letter for page in pdf.pages)
        text = " ".join(page.extract_text() for page in pdf.pages)
        for key in ("books", "characters", "twists", "subplots"):
            assert all(item["name"] in text.replace("\n", " ") for item in CONTENT[key])
        print(f"{filename}: {len(pdf.pages)} letter-size pages")
