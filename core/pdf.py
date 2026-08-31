"""Shared branding/layout helpers for generating PDF documents (quotations, BOQs, ...)."""
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

LOGO_PATH = Path(__file__).resolve().parent / 'assets' / 'doves-logo.png'

BRAND = colors.HexColor('#084b9a')
BRAND_DARK = colors.HexColor('#042450')
BRAND_LIGHT = colors.HexColor('#eaf1fa')
INK = colors.HexColor('#111827')
MUTED = colors.HexColor('#6b7280')
FAINT = colors.HexColor('#9ca3af')
BORDER = colors.HexColor('#e5e7eb')

STATUS_COLORS = {
    'default': colors.HexColor('#6b7280'),
    'green': colors.HexColor('#15803d'),
    'yellow': colors.HexColor('#a16207'),
    'red': colors.HexColor('#b91c1c'),
    'blue': colors.HexColor('#1d4ed8'),
}

_styles = getSampleStyleSheet()
_RIGHT = ParagraphStyle('Right', parent=_styles['Normal'], alignment=TA_RIGHT)


def _company_block():
    text = (
        f'<font size=15 color="{BRAND_DARK.hexval()}"><b>Doves System</b></font><br/>'
        f'<font size=8 color="{MUTED.hexval()}">Event Management &amp; Logistics</font>'
    )
    para = Paragraph(text, _styles['Normal'])
    if LOGO_PATH.exists():
        logo = Image(str(LOGO_PATH), width=16 * mm, height=9.6 * mm)
    else:
        logo = Spacer(16 * mm, 9.6 * mm)
    inner = Table([[logo, para]], colWidths=[20 * mm, 80 * mm])
    inner.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('LEFTPADDING', (1, 0), (1, 0), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    return inner


def _title_block(title, doc_number, status_label, status_color):
    color_hex = STATUS_COLORS.get(status_color, STATUS_COLORS['default']).hexval()
    status_html = (
        f'<font size=9 color="{color_hex}"><b>{status_label.upper()}</b></font>' if status_label else ''
    )
    text = (
        f'<font size=18 color="{BRAND_DARK.hexval()}"><b>{title}</b></font><br/>'
        f'<font size=9 color="{MUTED.hexval()}">#{doc_number}</font>'
        + (f'<br/>{status_html}' if status_html else '')
    )
    return Paragraph(text, _RIGHT)


def _footer(canvas, doc, generated_at_label):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(20 * mm, 14 * mm, A4[0] - 20 * mm, 14 * mm)
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(FAINT)
    canvas.drawString(20 * mm, 10 * mm, generated_at_label)
    canvas.drawRightString(A4[0] - 20 * mm, 10 * mm, f'Page {doc.page}')
    canvas.restoreState()


def meta_grid(rows, cols_per_row=3):
    """rows: list of (label, value) pairs, laid out in a compact label/value grid."""
    grid_rows = []
    for i in range(0, len(rows), cols_per_row):
        chunk = rows[i:i + cols_per_row]
        cells = []
        for label, value in chunk:
            cells.append(Paragraph(
                f'<font size=8 color="{MUTED.hexval()}">{label}</font><br/>'
                f'<font size=10 color="{INK.hexval()}"><b>{value or "—"}</b></font>',
                _styles['Normal'],
            ))
        while len(cells) < cols_per_row:
            cells.append('')
        grid_rows.append(cells)
    col_width = (A4[0] - 40 * mm) / cols_per_row
    table = Table(grid_rows, colWidths=[col_width] * cols_per_row)
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return table


def items_table(head, rows, col_widths, right_align_cols=(), total_row=None):
    """total_row, if given, is appended as a bold row set off by a rule above it —
    excluded from the alternating-shade striping applied to the regular data rows."""
    data = [head] + rows + ([total_row] if total_row else [])
    last_data_row = len(rows)  # index of the last regular (non-total) row
    table = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), BRAND),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
        ('TOPPADDING', (0, 0), (-1, 0), 7),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 1), (-1, last_data_row), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, last_data_row), [colors.white, BRAND_LIGHT]),
        ('TEXTCOLOR', (0, 1), (-1, -1), INK),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    if total_row:
        total_idx = last_data_row + 1
        style += [
            ('LINEABOVE', (0, total_idx), (-1, total_idx), 1, BRAND),
            ('FONTNAME', (0, total_idx), (-1, total_idx), 'Helvetica-Bold'),
            ('TOPPADDING', (0, total_idx), (-1, total_idx), 8),
        ]
    for col in right_align_cols:
        style.append(('ALIGN', (col, 0), (col, -1), 'RIGHT'))
    table.setStyle(TableStyle(style))
    return table


def render_pdf(title, doc_number, status_label, status_color, meta_rows, body_elements, generated_at_label):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm, topMargin=16 * mm, bottomMargin=20 * mm,
        title=f'{title} #{doc_number}',
    )

    header = Table(
        [[_company_block(), _title_block(title, doc_number, status_label, status_color)]],
        colWidths=[100 * mm, 70 * mm],
    )
    header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))

    elements = [
        header,
        Spacer(1, 10),
        HRFlowable(width='100%', thickness=1.2, color=BRAND, spaceAfter=10),
        meta_grid(meta_rows),
        Spacer(1, 10),
        *body_elements,
    ]

    def _on_page(canvas, doc_):
        _footer(canvas, doc_, generated_at_label)

    doc.build(elements, onFirstPage=_on_page, onLaterPages=_on_page)
    buffer.seek(0)
    return buffer
