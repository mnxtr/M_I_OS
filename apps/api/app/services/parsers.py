import re
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from xml.etree import ElementTree

from pypdf import PdfReader


@dataclass
class ParsedDocument:
    pages: list[str] = field(default_factory=list)


def parse_pdf(path: Path) -> ParsedDocument:
    reader = PdfReader(str(path))
    return ParsedDocument(pages=[(page.extract_text() or "") for page in reader.pages])


def parse_text_file(path: Path) -> ParsedDocument:
    text = path.read_text(encoding="utf-8", errors="replace")
    return ParsedDocument(pages=[text])


_W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def parse_docx(path: Path) -> ParsedDocument:
    """Extract paragraphs from .docx (OOXML) using stdlib zipfile + ElementTree.
    Paragraph boundaries act as soft page markers for chunk provenance."""
    with zipfile.ZipFile(path) as archive:
        xml_bytes = archive.read("word/document.xml")
    root = ElementTree.fromstring(xml_bytes)
    paragraphs: list[str] = []
    for paragraph in root.iter(f"{_W_NS}p"):
        runs = [node.text or "" for node in paragraph.iter(f"{_W_NS}t")]
        text = "".join(runs).strip()
        if text:
            paragraphs.append(text)
    return ParsedDocument(pages=_group(paragraphs, per_page=40))


def parse_image(path: Path) -> ParsedDocument:
    """OCR path — requires the tesseract binary with 'eng'+'ben' language packs."""
    from app.services.ocr import run_ocr

    text = run_ocr(path)
    return ParsedDocument(pages=[text])


def _group(lines: list[str], per_page: int) -> list[str]:
    if not lines:
        return []
    return ["\n".join(lines[i : i + per_page]) for i in range(0, len(lines), per_page)]


def detect_parser(suffix: str):
    mapping = {
        ".pdf": parse_pdf,
        ".txt": parse_text_file,
        ".md": parse_text_file,
        ".docx": parse_docx,
        ".png": parse_image,
        ".jpg": parse_image,
        ".jpeg": parse_image,
    }
    return mapping.get(suffix.lower())


def is_tabular_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in {".xlsx", ".xlsm", ".csv"}


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".txt",
    ".md",
    ".docx",
    ".xlsx",
    ".xlsm",
    ".csv",
    ".png",
    ".jpg",
    ".jpeg",
}


def extension_allowed(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def sanitize_identifier(name: str) -> str:
    cleaned = re.sub(r"[^0-9a-zA-Z_\u0980-\u09FF]+", "_", name.strip()).strip("_")
    lowered = re.sub(r"(?<!^)(?=[A-Z])", "_", cleaned).lower()
    collapsed = re.sub(r"_+", "_", lowered)
    return collapsed[:60] or "column"
