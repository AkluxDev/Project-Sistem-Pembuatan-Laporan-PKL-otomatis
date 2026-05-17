from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.shared import Cm, Pt

from .docx_utils import set_run_fonts


FONT_NAME = "Times New Roman"
BODY_SIZE = Pt(12)
HEADING_SIZE = Pt(14)
SUBHEADING_SIZE = Pt(12)
CAPTION_SIZE = Pt(11)

MARGIN_LEFT_CM = 4.0
MARGIN_TOP_CM = 4.0
MARGIN_RIGHT_CM = 3.0
MARGIN_BOTTOM_CM = 3.0
TEXT_WIDTH_CM = 21.0 - MARGIN_LEFT_CM - MARGIN_RIGHT_CM


def configure_document_defaults(document):
    """
    Konfigurasi dasar dokumen: Margin, Style Default, dan Heading.
    Memastikan Times New Roman 12pt merata ke seluruh style.
    """
    # ── Default Style (Normal) ──
    normal = document.styles["Normal"]
    normal.font.name = FONT_NAME
    normal.font.size = BODY_SIZE
    normal.font.bold = False
    normal.font.italic = False
    normal.font.color.rgb = None
    
    fmt = normal.paragraph_format
    fmt.space_before = Pt(0)
    fmt.space_after = Pt(0)
    fmt.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    fmt.first_line_indent = Cm(1.27)
    fmt.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    # ── Heading Styles (1-3) ──
    _configure_heading_style(document.styles["Heading 1"], level=1)
    _configure_heading_style(document.styles["Heading 2"], level=2)
    _configure_heading_style(document.styles["Heading 3"], level=3)
    
    # ── TOC Styles (1-3) ──
    # Word menggunakan style 'TOC 1', 'TOC 2', dst. untuk render daftar isi.
    for i in range(1, 4):
        style_name = f"TOC {i}"
        if style_name not in document.styles:
            document.styles.add_style(style_name, WD_STYLE_TYPE.PARAGRAPH)
        _configure_toc_style(document.styles[style_name], level=i)

    # ── Custom PKL Styles ──
    _ensure_pkl_styles(document)


def _ensure_pkl_styles(document):
    """Pastikan style khusus PKL tersedia dan terkonfigurasi."""
    styles = {
        "PKL Body": {"size": BODY_SIZE, "bold": False, "indent": 1.27},
        "PKL List": {"size": BODY_SIZE, "bold": False, "indent": 1.27},
        "PKL Caption": {"size": CAPTION_SIZE, "italic": True, "align": WD_ALIGN_PARAGRAPH.CENTER},
        "PKL Table Caption": {"size": CAPTION_SIZE, "italic": True, "align": WD_ALIGN_PARAGRAPH.CENTER},
        "PKL Figure Caption": {"size": CAPTION_SIZE, "italic": True, "align": WD_ALIGN_PARAGRAPH.CENTER},
        "PKL Signature": {"size": BODY_SIZE, "align": WD_ALIGN_PARAGRAPH.CENTER, "indent": 0},
    }
    for name, cfg in styles.items():
        if name not in document.styles:
            s = document.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
            s.font.name = FONT_NAME
            s.font.size = cfg.get("size", BODY_SIZE)
            s.font.bold = cfg.get("bold", False)
            s.font.italic = cfg.get("italic", False)
            
            fmt = s.paragraph_format
            fmt.alignment = cfg.get("align", WD_ALIGN_PARAGRAPH.JUSTIFY)
            fmt.first_line_indent = Cm(cfg.get("indent", 0))
            fmt.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE


def _ensure_style(document, style_name: str):
    if style_name not in document.styles:
        try:
            document.styles.add_style(style_name, WD_STYLE_TYPE.PARAGRAPH)
        except Exception:
            pass


def _configure_heading_style(style, level: int):
    style.font.name = FONT_NAME
    style.font.italic = False
    style.font.bold = True
    style.font.color.rgb = None  # Auto/Black
    
    # Ensure styles inherit from Normal but override sizes
    if level == 1:
        style.font.size = HEADING_SIZE
        style.paragraph_format.space_before = Pt(0)
        style.paragraph_format.space_after = Pt(12)
        style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        style.paragraph_format.first_line_indent = Cm(0)
        style.paragraph_format.left_indent = Cm(0)
        style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        style.paragraph_format.keep_with_next = True
    elif level == 2:
        style.font.size = SUBHEADING_SIZE
        style.paragraph_format.space_before = Pt(12)
        style.paragraph_format.space_after = Pt(6)
        style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        style.paragraph_format.first_line_indent = Cm(0)
        style.paragraph_format.left_indent = Cm(0)
        style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
        style.paragraph_format.keep_with_next = True
    elif level == 3:
        style.font.size = SUBHEADING_SIZE
        style.paragraph_format.space_before = Pt(6)
        style.paragraph_format.space_after = Pt(4)
        style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        style.paragraph_format.first_line_indent = Cm(0)
        style.paragraph_format.left_indent = Cm(1.0)
        style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
        style.paragraph_format.keep_with_next = True
    else:
        style.font.size = BODY_SIZE
        style.paragraph_format.space_before = Pt(4)
        style.paragraph_format.space_after = Pt(2)
        style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        style.paragraph_format.first_line_indent = Cm(0)
        style.paragraph_format.left_indent = Cm(1.5)
        style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT


def _configure_toc_style(style, level: int):
    """
    Konfigurasi style TOC 1, TOC 2, TOC 3 agar muncul cantik di Word.
    PENTING: Gunakan tab stop di kanan (~13.5cm - 14cm) untuk nomor halaman.
    """
    style.font.name = FONT_NAME
    style.font.size = BODY_SIZE
    style.font.italic = False
    style.font.bold = (level == 1)
    
    fmt = style.paragraph_format
    fmt.space_before = Pt(0)
    fmt.space_after = Pt(0)
    fmt.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    fmt.first_line_indent = Cm(0)
    
    # Indentasi hierarki TOC
    # TOC 1: 0cm
    # TOC 2: 0.75cm
    # TOC 3: 1.5cm
    fmt.left_indent = Cm(0.75 * (level - 1))
    
    # Tambahkan Tab Stop untuk nomor halaman (rata kanan dengan titik leader)
    # Posisi ideal sekitar 14cm dari kiri (untuk kertas A4 dengan margin 3cm kanan)
    # Margin kiri 4cm + teks area 14cm = 18cm (sisa 3cm margin kanan)
    from docx.enum.text import WD_TAB_ALIGNMENT, WD_TAB_LEADER
    fmt.tab_stops.add_tab_stop(Cm(14), alignment=WD_TAB_ALIGNMENT.RIGHT, leader=WD_TAB_LEADER.DOTS)
    
    style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT


def apply_normal_style(paragraph):
    paragraph.style = "PKL Body"
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(0)
    fmt.space_after = Pt(0)
    fmt.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    fmt.first_line_indent = Cm(1.27)
    fmt.left_indent = Cm(0)
    fmt.right_indent = Cm(0)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    return paragraph


def apply_heading_style(paragraph, level: int = 1):
    paragraph.style = f"Heading {level}"
    fmt = paragraph.paragraph_format
    if level == 1:
        fmt.space_before = Pt(0)
        fmt.space_after = Pt(12)
        fmt.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        fmt.first_line_indent = Cm(0)
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif level == 2:
        fmt.space_before = Pt(12)
        fmt.space_after = Pt(6)
        fmt.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        fmt.first_line_indent = Cm(0)
        paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    elif level == 3:
        fmt.space_before = Pt(6)
        fmt.space_after = Pt(4)
        fmt.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        fmt.first_line_indent = Cm(0)
        fmt.left_indent = Cm(1.0)
        paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    else:
        fmt.space_before = Pt(4)
        fmt.space_after = Pt(2)
        fmt.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        fmt.first_line_indent = Cm(0)
        fmt.left_indent = Cm(1.5)
        paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    return paragraph


def apply_subheading_style(paragraph, level: int = 2):
    return apply_heading_style(paragraph, level=level)


def apply_caption_style(paragraph):
    paragraph.style = "PKL Caption"
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(3)
    fmt.space_after = Pt(6)
    fmt.line_spacing_rule = WD_LINE_SPACING.SINGLE
    fmt.first_line_indent = Cm(0)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    return paragraph


def apply_signature_style(paragraph):
    paragraph.style = "PKL Signature"
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(0)
    fmt.space_after = Pt(0)
    fmt.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    fmt.first_line_indent = Cm(0)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    return paragraph


def apply_list_style(paragraph, level: int = 0):
    paragraph.style = "PKL List"
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(0)
    fmt.space_after = Pt(0)
    fmt.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    fmt.first_line_indent = Cm(-0.75)
    fmt.left_indent = Cm(1.27 + (level * 0.9))
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    return paragraph


def format_run(run, *, bold=False, italic=False, size=None, underline=False):
    set_run_fonts(
        run,
        font_name=FONT_NAME,
        size=size or BODY_SIZE,
        bold=bold,
        italic=italic,
        underline=underline,
    )
    return run
