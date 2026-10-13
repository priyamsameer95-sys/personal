"""Rebuild the visitor-facing case-study PDFs from the authored work registry.

Run with Python and ReportLab after changing content/work/case-studies.json.
Only curated public copy is included; private research/source ledgers are not inputs.
"""

import html
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "content/work/case-studies.json"
FONT = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
if FONT.exists():
    pdfmetrics.registerFont(TTFont("WorkBody", str(FONT)))
    font_name = "WorkBody"
else:
    font_name = "Helvetica"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="WorkTitle", fontName=font_name, fontSize=27, leading=33, spaceAfter=18))
styles.add(ParagraphStyle(name="WorkDeck", fontName=font_name, fontSize=12, leading=18, textColor=colors.HexColor("#454545"), spaceAfter=18))
styles.add(ParagraphStyle(name="WorkBody", fontName=font_name, fontSize=10.5, leading=16, spaceAfter=11))
styles.add(ParagraphStyle(name="WorkHeading", fontName=font_name, fontSize=16, leading=21, spaceBefore=16, spaceAfter=10, keepWithNext=True))
styles.add(ParagraphStyle(name="WorkSmall", fontName=font_name, fontSize=8.5, leading=13, textColor=colors.HexColor("#555555"), spaceAfter=7))


def para(text, style="WorkBody"):
    if font_name == "Helvetica":
        text = text.replace("₹", "INR ").replace("→", " to ").replace("–", "-").replace("—", "-")
    return Paragraph(html.escape(text), styles[style])


def page(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#111111"))
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, 0.57 * inch, doc.pagesize[0] - doc.rightMargin, 0.57 * inch)
    canvas.setFont(font_name, 8)
    canvas.drawString(doc.leftMargin, 0.37 * inch, "Priyam Sameer / My Work")
    canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, 0.37 * inch, str(doc.page))
    canvas.restoreState()


def build():
    data = json.loads(DATA.read_text())
    companies = {item["id"]: item for item in data["companies"]}
    count = 0
    for study in data["caseStudies"]:
        if study.get("status", "published") != "published":
            continue
        folder = ROOT / "public/work/case-studies"
        folder.mkdir(parents=True, exist_ok=True)
        filename = f"Priyam-Sameer-{study['slug']}-case-study.pdf"
        path = folder / filename
        doc = SimpleDocTemplate(str(path), pagesize=(595.28, 841.89), leftMargin=48, rightMargin=48, topMargin=46, bottomMargin=60,
                                title=study["title"], author="Priyam Sameer", subject="Product case study")
        flow = [para(companies[study["companyId"]]["name"].upper(), "WorkSmall"), para(study["title"], "WorkTitle"),
                para(study["summary"], "WorkDeck"), para(f"Role: {study['role']} | Period: {study['period']}", "WorkSmall"), Spacer(1, 12)]
        if study["outcomes"]:
            flow.append(para("Reported outcomes and scope", "WorkHeading"))
            for outcome in study["outcomes"]:
                text = " · ".join(item for item in [outcome.get("value"), outcome["label"]] if item)
                flow.append(KeepTogether([para(text), para(outcome.get("detail", ""), "WorkSmall")]))
        for section in study["sections"]:
            flow.append(para(section["title"], "WorkHeading"))
            flow.extend(para(text) for text in section["body"])
            flow.extend(para(f"• {text}") for text in section.get("bullets", []))
        if study.get("media"):
            flow.append(para("Visual references and walkthroughs", "WorkHeading"))
            for media in study["media"]:
                flow.append(para(media.get("title", media.get("alt", "Visual reference"))))
                flow.append(para(media["caption"], "WorkSmall"))
            flow.append(para("View the online case study for the full image gallery and playable videos.", "WorkSmall"))
        if study.get("sourceNotes"):
            flow.append(para("Evidence and attribution", "WorkHeading"))
            flow.extend(para(note, "WorkSmall") for note in study["sourceNotes"])
        doc.build(flow, onFirstPage=page, onLaterPages=page)
        downloads = [d for d in study["downloads"] if d.get("mime") != "application/pdf" or not d.get("filename", "").startswith("Priyam-Sameer-")]
        downloads.insert(0, {"label": "Download this case study", "url": f"/work/case-studies/{filename}", "filename": filename,
                             "mime": "application/pdf", "description": "The complete written case study, including outcomes and attribution notes.", "bytes": path.stat().st_size})
        study["downloads"] = downloads
        count += 1
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"Built {count} public case-study PDFs")


if __name__ == "__main__":
    build()
