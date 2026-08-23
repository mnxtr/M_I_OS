import shutil
import subprocess

from app.config import get_settings


class OcrUnavailableError(RuntimeError):
    pass


def tesseract_available() -> bool:
    return shutil.which("tesseract") is not None


def available_languages() -> list[str]:
    if not tesseract_available():
        return []
    try:
        output = subprocess.run(
            ["tesseract", "--list-langs"],
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        ).stdout
        return [line.strip() for line in output.splitlines()[1:] if line.strip()]
    except (subprocess.SubprocessError, IndexError):
        return []


def run_ocr(image_path) -> str:
    settings = get_settings()
    if not tesseract_available():
        raise OcrUnavailableError(
            "OCR backend unavailable: install tesseract with Bangla support "
            "(apt install tesseract-ocr tesseract-ocr-ben) to process scanned documents."
        )
    langs = available_languages()
    wanted = [lang for lang in ("eng", "ben") if lang in langs]
    lang = "+".join(wanted) or "eng"
    result = subprocess.run(
        [
            "tesseract",
            str(image_path),
            "stdout",
            "-l",
            lang,
            "--psm",
            "6",
            "--dpi",
            str(settings.ocr_dpi),
        ],
        capture_output=True,
        text=True,
        timeout=120,
        check=True,
    )
    return result.stdout.strip()
