"""File validation and text extraction (digital PDF text, or OCR for scans/images)."""
from __future__ import annotations
import io, logging, shutil
from dataclasses import dataclass
from PIL import Image, UnidentifiedImageError
from .. import config

log = logging.getLogger("mediscan.extract")


class ReportError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        self.code, self.message, self.status = code, message, status
        super().__init__(message)


@dataclass
class ExtractionResult:
    text: str
    kind: str           # pdf_text | pdf_ocr | image_ocr
    pages: int
    ocr_used: bool


def ocr_available() -> bool:
    if not config.ENABLE_OCR:
        return False
    try:
        import pytesseract  # noqa: F401
        import cv2  # noqa: F401
    except Exception:
        return False
    return shutil.which("tesseract") is not None


def sniff_type(data: bytes) -> str | None:
    if data[:5] == b"%PDF-": return "pdf"
    if data[:8] == b"\x89PNG\r\n\x1a\n": return "png"
    if data[:3] == b"\xff\xd8\xff": return "jpeg"
    return None


def validate_upload(data: bytes, filename: str | None) -> str:
    if not data:
        raise ReportError("empty_file", "The uploaded file is empty.", 400)
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise ReportError("file_too_large", f"File exceeds the {config.MAX_UPLOAD_MB:g} MB limit.", 413)
    kind = sniff_type(data)
    if kind is None:
        raise ReportError("unsupported_type", "Unsupported file type. Please upload a PDF, JPG or PNG file.", 415)
    return kind


def _rows_from_words(words) -> list[str]:
    words = sorted(words, key=lambda w: ((w[1] + w[3]) / 2, w[0]))
    rows: list[list] = []
    for w in words:
        yc = (w[1] + w[3]) / 2
        if rows and abs(rows[-1][0] - yc) < 4:
            rows[-1][1].append(w)
        else:
            rows.append([yc, [w]])
    out = []
    for _, ws in rows:
        ws.sort(key=lambda w: w[0])
        line, prev = "", None
        for w in ws:
            if prev is not None:
                line += "  " if w[0] - prev[2] > 10 else " "
            line += w[4]
            prev = w
        out.append(line)
    return out


def _preprocess_for_ocr(img: Image.Image) -> Image.Image:
    import cv2, numpy as np
    arr = np.array(img.convert("L"))
    h, w = arr.shape
    if max(h, w) < 1600:
        s = 1600 / max(h, w)
        arr = cv2.resize(arr, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC)
    arr = cv2.fastNlMeansDenoising(arr, None, 10, 7, 21)
    arr = cv2.threshold(arr, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    return Image.fromarray(arr)


def _ocr(img: Image.Image) -> str:
    import pytesseract
    try:
        return pytesseract.image_to_string(_preprocess_for_ocr(img), config="--psm 6")
    except Exception as exc:  # tesseract runtime failure
        log.warning("OCR failed: %s", type(exc).__name__)
        raise ReportError("ocr_failed", "OCR could not process this file. Try a clearer image or enter values manually.", 422)


def extract(data: bytes, kind: str) -> ExtractionResult:
    if kind == "pdf":
        try:
            import pymupdf
        except ImportError:
            raise ReportError("pdf_engine_unavailable", "PDF reading library is currently installing. Please try again in a moment, or use 'Enter tests manually'.", 503)
        try:
            doc = pymupdf.open(stream=data, filetype="pdf")
        except Exception:
            raise ReportError("corrupt_file", "The PDF could not be opened; it may be corrupted.", 422)
        if doc.needs_pass:
            raise ReportError("encrypted_pdf", "This PDF is password-protected and cannot be read.", 422)
        if doc.page_count == 0:
            raise ReportError("corrupt_file", "The PDF contains no pages.", 422)
        if doc.page_count > config.MAX_PDF_PAGES:
            raise ReportError("too_many_pages", f"PDF has more than {config.MAX_PDF_PAGES} pages.", 413)
        lines: list[str] = []
        for page in doc:
            lines += _rows_from_words(page.get_text("words"))
        text = "\n".join(lines)
        if len("".join(text.split())) >= 40:
            return ExtractionResult(text, "pdf_text", doc.page_count, False)
        # scanned PDF -> OCR
        if not ocr_available():
            raise ReportError("ocr_unavailable", "This PDF looks scanned (no selectable text) and OCR is not available on this server. Please enter the values manually.", 503)
        parts = []
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            parts.append(_ocr(Image.open(io.BytesIO(pix.tobytes("png")))))
        return ExtractionResult("\n".join(parts), "pdf_ocr", doc.page_count, True)
    # images
    try:
        img = Image.open(io.BytesIO(data)); img.verify()
        img = Image.open(io.BytesIO(data)); img.load()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise ReportError("corrupt_file", "The image could not be read; it may be corrupted.", 422)
    if not ocr_available():
        raise ReportError("ocr_unavailable", "OCR is not available on this server, so images cannot be read automatically. Please enter the values manually.", 503)
    return ExtractionResult(_ocr(img), "image_ocr", 1, True)
