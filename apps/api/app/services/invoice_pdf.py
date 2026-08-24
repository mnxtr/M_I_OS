"""Minimal dependency-free PDF invoice generator (bank-transfer path).

ASCII-only Helvetica single-page A4. Bangla text is transliterated/omitted —
invoices upgrade to reportlab+Bangla fonts in Phase B if tenants demand.
"""

from typing import Any


def _escape(text: str) -> str:
    return text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def _line(stream: list[bytes], x: int, y: int, size: int, text: str) -> None:
    font = "F2" if size >= 14 else "F1"
    stream.append(f"BT /{font} {size} Tf {x} {y} Td ({_escape(text)}) Tj ET".encode())


def build_invoice_pdf(
    *,
    invoice_no: str,
    date_str: str,
    company_name: str = "",
    plan_name: str,
    months: int,
    unit_price_usd: float,
    usd_to_bdt: float,
    pay_to: dict[str, Any] | None = None,
) -> bytes:
    total_bdt = round(unit_price_usd * usd_to_bdt * months, 2)
    pay_lines = pay_to or {
        "Bank": "MIOS Technologies Ltd",
        "bKash Merchant": "01700-000000",
    }

    stream: list[bytes] = []
    _line(stream, 50, 790, 20, "INVOICE")
    _line(stream, 50, 762, 11, f"Invoice No: {invoice_no}")
    _line(stream, 380, 762, 11, f"Date: {date_str}")
    if company_name:
        _line(stream, 50, 720, 12, f"Billed to: {company_name}")

    y = 660
    _line(stream, 50, y, 10, "Description")
    _line(stream, 330, y, 10, "Months")
    _line(stream, 420, y, 10, "Amount (BDT)")
    y -= 24
    _line(stream, 50, y, 11, f"{plan_name} subscription")
    _line(stream, 330, y, 11, str(months))
    _line(stream, 420, y, 11, f"{total_bdt:,.2f}")
    y -= 30
    rate_line = f"(USD {unit_price_usd:,.2f}/month x {months} @ BDT {usd_to_bdt:.2f}/USD)"
    _line(stream, 50, y, 9, rate_line)
    y -= 40
    _line(stream, 330, y, 13, f"Total: BDT {total_bdt:,.2f}")

    y -= 50
    _line(stream, 50, y, 11, "Payment instructions:")
    for label, value in pay_lines.items():
        y -= 18
        _line(stream, 60, y, 10, f"{label}: {value}")
    y -= 30
    _line(
        stream,
        50,
        y,
        9,
        "Please share payment reference via email after transfer. VAT as applicable.",
    )

    content_bytes = b"\n".join(stream)
    content_len = len(content_bytes)

    objects: list[bytes] = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> "
        b"/Contents 4 0 R >>",
        b"<< /Length " + str(content_len).encode() + b" >>\nstream\n"
        + content_bytes
        + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsets: list[int] = []
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"

    xref_pos = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF"
    ).encode()

    return bytes(out)
