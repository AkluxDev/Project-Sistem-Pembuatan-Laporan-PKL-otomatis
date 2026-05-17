import base64
import datetime as _dt
import io
import re
from typing import Any, Iterable, Optional

from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm

try:
    from PIL import Image as PILImage
except ImportError:  # pragma: no cover
    PILImage = None


BULAN_ID = [
    "",
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
]


def cm_to_twips(value_cm: float) -> int:
    return int(value_cm * 567)


def set_run_fonts(run, font_name: str, size=None, bold=False, italic=False, underline=False):
    run.font.name = font_name
    if size is not None:
        run.font.size = size
    run.bold = bold
    run.italic = italic
    run.underline = underline
    r_pr = run._r.get_or_add_rPr()
    r_fonts = r_pr.find(qn("w:rFonts"))
    if r_fonts is None:
        r_fonts = OxmlElement("w:rFonts")
        r_pr.insert(0, r_fonts)
    for attr in ("ascii", "hAnsi", "cs", "eastAsia"):
        r_fonts.set(qn(f"w:{attr}"), font_name)


def clear_paragraph(paragraph):
    element = paragraph._element
    for child in list(element):
        element.remove(child)


def add_field_run(paragraph, instruction: str, font_name: str, size=None, display_text: str = ""):
    run = paragraph.add_run()
    set_run_fonts(run, font_name=font_name, size=size)
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    fld_begin.set(qn("w:dirty"), "true")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = f" {instruction} "
    fld_separate = OxmlElement("w:fldChar")
    fld_separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = display_text
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_separate)
    if display_text:
        run._r.append(text)
    run._r.append(fld_end)
    return run


def add_tc_entry(paragraph, entry_text: str, level: int = 3, identifier: str = "C", font_name: str = "Times New Roman", size=None):
    safe_text = (entry_text or "").replace('"', "'").strip()
    if not safe_text:
        return None
    instruction = f'TC "{safe_text}" \\l {level} \\f {identifier}'
    return add_field_run(paragraph, instruction, font_name=font_name, size=size)


def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_borders = tc_pr.first_child_found_in("w:tcBorders")
    if tc_borders is None:
        tc_borders = OxmlElement("w:tcBorders")
        tc_pr.append(tc_borders)
    for edge, edge_data in kwargs.items():
        tag = f"w:{edge}"
        element = tc_borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            tc_borders.append(element)
        for key, value in edge_data.items():
            element.set(qn(f"w:{key}"), str(value))


def set_table_borders_none(table):
    for row in table.rows:
        for cell in row.cells:
            set_cell_border(
                cell,
                top={"val": "nil"},
                left={"val": "nil"},
                bottom={"val": "nil"},
                right={"val": "nil"},
            )


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    repeat = tr_pr.find(qn("w:tblHeader"))
    if repeat is None:
        repeat = OxmlElement("w:tblHeader")
        repeat.set(qn("w:val"), "true")
        tr_pr.append(repeat)


def set_cell_width(cell, width_cm: float):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_w = tc_pr.find(qn("w:tcW"))
    if tc_w is None:
        tc_w = OxmlElement("w:tcW")
        tc_pr.append(tc_w)
    tc_w.set(qn("w:w"), str(cm_to_twips(width_cm)))
    tc_w.set(qn("w:type"), "dxa")
    cell.width = Cm(width_cm)


def sanitize_inline_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple, set)):
        parts = [sanitize_inline_text(item) for item in value]
        return " ".join(part for part in parts if part).strip()
    text = str(value)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def sanitize_paragraph_lines(value: Any) -> list[str]:
    text = sanitize_inline_text(value)
    if not text:
        return []
    blocks = []
    for line in re.split(r"\n{2,}", text):
        cleaned = re.sub(r"\s*\n\s*", " ", line).strip()
        if cleaned:
            blocks.append(cleaned)
    return blocks


def decode_image_stream(image_value: Any) -> Optional[io.BytesIO | str]:
    if isinstance(image_value, str):
        image_value = image_value.strip()
        if not image_value:
            return None
        if image_value.startswith("data:image"):
            try:
                _, payload = image_value.split(",", 1)
                return io.BytesIO(base64.b64decode(payload))
            except Exception:
                return None
        return image_value
    return None


def get_image_dimensions_cm(image_source: io.BytesIO | str) -> Optional[tuple[float, float]]:
    if PILImage is None:
        return None
    try:
        if isinstance(image_source, io.BytesIO):
            image_source.seek(0)
            with PILImage.open(image_source) as image:
                dpi = image.info.get("dpi", (96, 96))
                width_cm = (image.width / max(dpi[0], 1)) * 2.54
                height_cm = (image.height / max(dpi[1], 1)) * 2.54
            image_source.seek(0)
            return width_cm, height_cm
        with PILImage.open(image_source) as image:
            dpi = image.info.get("dpi", (96, 96))
            width_cm = (image.width / max(dpi[0], 1)) * 2.54
            height_cm = (image.height / max(dpi[1], 1)) * 2.54
        return width_cm, height_cm
    except Exception:
        if isinstance(image_source, io.BytesIO):
            image_source.seek(0)
        return None


def format_indonesian_date(date_value: str) -> str:
    date_value = sanitize_inline_text(date_value)
    if not date_value:
        return ""
    try:
        dt = _dt.datetime.strptime(date_value, "%Y-%m-%d")
        return f"{dt.day} {BULAN_ID[dt.month]} {dt.year}"
    except ValueError:
        return date_value


def ensure_update_fields_on_open(document):
    settings = document.settings.element
    update_fields = settings.find(qn("w:updateFields"))
    if update_fields is None:
        update_fields = OxmlElement("w:updateFields")
        settings.append(update_fields)
    update_fields.set(qn("w:val"), "true")


def coerce_dict_list(items: Any) -> list[dict]:
    if not isinstance(items, list):
        return []
    return [item for item in items if isinstance(item, dict)]


def take_first_non_empty(values: Iterable[Any]) -> str:
    for value in values:
        text = sanitize_inline_text(value)
        if text:
            return text
    return ""
