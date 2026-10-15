#!/usr/bin/env python3
"""Build the public CV from the same reconciled JSON used by /cv.

Run with a Python environment containing ReportLab:
    python3 scripts/build-cv.py
The PDF path is stable so existing CV download links keep working.
"""
from __future__ import annotations

import argparse
import json
from html import escape
from pathlib import Path
from urllib.parse import quote

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate,
)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / 'public/cv/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf'
INK = colors.HexColor('#191714')
MUTED = colors.HexColor('#5b574f')
RULE = colors.HexColor('#d8d1c4')


def xml(text: str) -> str:
    return escape(text, quote=True)


def link(label: str, url: str) -> str:
    return f'<link href="{xml(url)}" color="#191714"><u>{xml(label)}</u></link>'


def build(output: Path) -> None:
    data = json.loads((ROOT / 'app/cv/content.json').read_text())
    contacts = data['contacts']
    styles = {
        'name': ParagraphStyle('Name', fontName='Helvetica-Bold', fontSize=27, leading=29, textColor=INK, spaceAfter=5),
        'subtitle': ParagraphStyle('Subtitle', fontName='Helvetica-Bold', fontSize=11.5, leading=14, textColor=INK, spaceAfter=4),
        'contact': ParagraphStyle('Contact', fontName='Helvetica', fontSize=10.5, leading=14, textColor=INK, spaceAfter=5),
        'body': ParagraphStyle('Body', fontName='Helvetica', fontSize=10.5, leading=13.4, textColor=INK, alignment=TA_LEFT, spaceAfter=5),
        'bullet': ParagraphStyle('Bullet', fontName='Helvetica', fontSize=10.5, leading=13.4, textColor=INK, alignment=TA_LEFT, leftIndent=10, firstLineIndent=-10, spaceAfter=5),
        'section': ParagraphStyle('Section', fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=INK, spaceBefore=9, spaceAfter=6, keepWithNext=True),
        'job': ParagraphStyle('Job', fontName='Helvetica-Bold', fontSize=11.5, leading=14, textColor=INK, spaceBefore=6, spaceAfter=3, keepWithNext=True),
        'roles': ParagraphStyle('Roles', fontName='Helvetica', fontSize=10.5, leading=13, textColor=INK, spaceAfter=5, keepWithNext=True),
        'cases': ParagraphStyle('Cases', fontName='Helvetica', fontSize=10.5, leading=13.5, textColor=INK, spaceAfter=7),
    }
    story = []

    def para(text: str, style: str = 'body') -> Paragraph:
        return Paragraph(text, styles[style])

    def case_link(case: dict) -> str:
        return link(case['label'], contacts['websiteUrl'].rstrip('/') + '/product/' + quote(case['slug'], safe=''))

    def cases(items: list[dict]) -> Paragraph:
        return para(' · '.join(case_link(item) for item in items), 'cases')

    story += [para(xml(data['name']), 'name'),
              para(xml(data['profession'] + ' · ' + data['location']), 'subtitle'),
              para(' · '.join([
                  link(contacts['website'], contacts['websiteUrl']),
                  link(contacts['email'], 'mailto:' + contacts['email']),
                  link(contacts['phone'], contacts['phoneHref']),
                  link('LinkedIn', contacts['linkedinUrl']),
              ]), 'contact'),
              para(xml(data['summary'])),
              HRFlowable(width='100%', thickness=.6, color=RULE, spaceBefore=3, spaceAfter=1),
              para('Experience', 'section')]

    for job in data['experience']:
        title = xml(job['company']) + ' <font name="Helvetica">| ' + xml(job['dates']) + '</font>'
        story.append(para(title, 'job'))
        roles = list(reversed(job['progression']))
        if len(roles) == 1:
            story.append(para('<b>' + xml(roles[0]['title']) + '</b>', 'roles'))
        else:
            story.append(para('<br/>'.join('<b>' + xml(role['title']) + '</b> · ' + xml(role['dates']) for role in roles), 'roles'))
        for responsibility in job['responsibilities']:
            story.append(para('• ' + xml(responsibility['text']), 'bullet'))
        story.append(cases(job['cases']))
        if job.get('ventureSupport'):
            support = job['ventureSupport']
            story.append(para(xml(support['text']) + ' ' + case_link(support['case']) + '.'))

    internship = data['internship']
    story.append(para('Earlier experience', 'section'))
    story.append(para('<b>' + xml(internship['company']) + '</b> · ' + xml(internship['title']) + ' · ' + xml(internship['dates']) + '<br/>' + xml(internship['description']) + ' ' + case_link({'slug': internship['caseSlug'], 'label': internship['caseLabel']}) + '.'))
    for entry in data['otherContexts']:
        title = xml(entry['organisation'])
        if entry['dates']:
            title += ' · ' + xml(entry['title']) + ' · ' + xml(entry['dates'])
        story.append(para('<b>' + title + '</b><br/>' + xml(entry['description']) + ' ' + case_link({'slug': entry['caseSlug'], 'label': entry['caseLabel']}) + '.'))

    education = data['education']
    story.append(para('Education & recognition', 'section'))
    story.append(para('<b>' + xml(education['institution']) + '</b> · ' + xml(education['degree']) + ' · ' + xml(education['dates']) + '<br/>' + xml(education['description']) + ' ' + case_link({'slug': education['caseSlug'], 'label': education['caseLabel']}) + '.'))
    for recognition in data['recognitionDetails']:
        story.append(para('<b>' + xml(recognition['title']) + '</b> · ' + xml(recognition['context'])))

    story.append(para('Core capabilities', 'section'))
    for skill in data['skills']:
        story.append(para('<b>' + xml(skill['area']) + ':</b> ' + xml(skill['description'])))

    story.append(para('Certifications & learning', 'section'))
    for certification in data['certifications']:
        story.append(para('<b>' + xml(certification['title']) + '</b> · ' + xml(certification['issuer']) + ' · ' + xml(certification['issued']) + ' · ' + link('View credential', certification['credentialUrl'])))

    output.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(output), pagesize=A4, rightMargin=42, leftMargin=42,
                            topMargin=35, bottomMargin=35, title='Priyam Sameer — Product leader',
                            author='Priyam Sameer', subject='Career, product leadership and selected portfolio evidence',
                            pageCompression=1, allowSplitting=1)

    def footer(canvas, document):
        canvas.saveState()
        canvas.setFillColor(MUTED)
        canvas.setFont('Helvetica', 8.5)
        canvas.drawString(42, 19, data['name'] + ' · ' + contacts['website'])
        canvas.drawRightString(A4[0] - 42, 19, str(document.page))
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    build(parser.parse_args().output)
