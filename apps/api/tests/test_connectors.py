

from app.services.inbound_email import (
    clean_filename,
    parse_raw_email,
    subject_to_doc_type,
)
from app.services.parsers import ALLOWED_EXTENSIONS, extension_allowed


def build_multipart_email(
    attachments: list[tuple[str, bytes]],
    subject="Factory docs",
    sender="manager@factory.com",
) -> bytes:
    from email.message import EmailMessage

    message = EmailMessage()
    message["From"] = sender
    message["Subject"] = subject
    message.set_content("Please find attached documents.")

    for filename, content in attachments:
        maintype, _, subtype = "application", "", "octet-stream"
        if filename.endswith(".pdf"):
            maintype, subtype = "application", "pdf"
        elif filename.endswith(".txt"):
            maintype, subtype = "text", "plain"
        elif filename.endswith(".xlsx"):
            maintype = "application"
            subtype = "vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        message.add_attachment(
            content,
            maintype=maintype,
            subtype=subtype,
            filename=filename,
        )
    return message.as_bytes()


def test_parse_simple_text_email():
    raw = build_multipart_email([], subject="hello")
    email = parse_raw_email(raw)
    assert email.sender == "manager@factory.com"
    assert email.subject == "hello"
    assert "attached" in email.body_text


def test_parse_extracts_ingestible_attachments():
    pdf_bytes = b"%PDF-1.4 fake pdf content"
    txt_bytes = "নমস্কার এটা বাংলা SOP".encode()
    raw = build_multipart_email([("audit-report.pdf", pdf_bytes), ("sop.txt", txt_bytes)])
    email = parse_raw_email(raw)
    assert len(email.attachments) == 2
    assert all(a.ingestible for a in email.attachments)
    assert {a.filename for a in email.ingestible_attachments} == {"audit-report.pdf", "sop.txt"}
    assert email.ingestible_attachments[1].content.decode() == "নমস্কার এটা বাংলা SOP"


def test_non_ingestible_attachments_filtered():
    raw = build_multipart_email(
        [("photo.png", b"\x89PNG fake"), ("archive.exe", b"MZ fake"), ("empty.pdf", b"")]
    )
    email = parse_raw_email(raw)
    names = [a.filename for a in email.ingestible_attachments]
    assert "photo.png" in names  # png is allowed by extension table
    assert "archive.exe" not in names
    assert "empty.pdf" not in names  # zero-byte attachments skipped


def test_clean_filename_blocks_traversal_and_keeps_bangla():
    assert clean_filename("../../etc/passwd") == "passwd"
    assert clean_filename("সিপিএল রিপোর্ট.pdf") == "সিপিএল_রিপোর্ট.pdf"
    assert clean_filename(None) == "attachment"
    assert clean_filename("") == "attachment"


def test_subject_to_doc_type_classification():
    assert subject_to_doc_type("SMETA CAP follow-up") == "compliance"
    assert subject_to_doc_type("Sewing line SOP v3") == "sop"
    assert subject_to_doc_type("Production report August W3") == "production"
    assert subject_to_doc_type("LC copy for PI 4021") == "commercial"
    assert subject_to_doc_type("Lunch menu") == "other"


def test_extension_table_covers_factory_formats():
    for ext in (".pdf", ".xlsx", ".csv", ".docx", ".png"):
        assert extension_allowed(f"file{ext}")
    assert not extension_allowed("file.exe")
    assert ".pdf" in ALLOWED_EXTENSIONS
