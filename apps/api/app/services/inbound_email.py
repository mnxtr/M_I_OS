"""Inbound email ingestion.

Factories already email SOPs, audit reports, and production sheets to managers
and buyers. A dedicated per-tenant mailbox (or forwarding rule) can point at
MIOS; this module parses RFC-822 messages and extracts ingestible attachments.
"""

import re
from dataclasses import dataclass, field
from email import policy
from email.parser import BytesParser
from pathlib import Path

from app.services.parsers import extension_allowed

_MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024
_SANITIZE_RE = re.compile(r"[^0-9a-zA-Z._\u0980-\u09FF-]+")


@dataclass
class InboundAttachment:
    filename: str
    content: bytes

    @property
    def ingestible(self) -> bool:
        return (
            bool(self.filename)
            and extension_allowed(self.filename)
            and 0 < len(self.content) <= _MAX_ATTACHMENT_BYTES
        )


@dataclass
class InboundEmail:
    sender: str = ""
    subject: str = ""
    body_text: str = ""
    attachments: list[InboundAttachment] = field(default_factory=list)

    @property
    def ingestible_attachments(self) -> list[InboundAttachment]:
        return [a for a in self.attachments if a.ingestible]


def parse_raw_email(raw: bytes) -> InboundEmail:
    message = BytesParser(policy=policy.default).parsebytes(raw)
    sender = str(message.get("From", "")).strip()
    subject = str(message.get("Subject", "")).strip()

    body_text = ""
    attachments: list[InboundAttachment] = []

    if message.is_multipart():
        for part in message.walk():
            disposition = part.get_content_disposition()
            filename = part.get_filename()
            payload = part.get_payload(decode=True)
            if disposition == "attachment" or (filename and payload):
                if payload is not None:
                    attachments.append(
                        InboundAttachment(filename=clean_filename(str(filename)), content=payload)
                    )
            elif part.get_content_type() == "text/plain" and payload is not None:
                body_text += payload.decode("utf-8", errors="replace")
    else:
        payload = message.get_payload(decode=True)
        if payload is not None:
            body_text = payload.decode("utf-8", errors="replace")

    return InboundEmail(
        sender=sender, subject=subject, body_text=body_text, attachments=attachments
    )


def clean_filename(name: str | None) -> str:
    """Sanitize untrusted attachment filenames (keep Bangla script)."""
    base = Path(name or "").name
    cleaned = _SANITIZE_RE.sub("_", base).strip("._")
    return cleaned[:200] or "attachment"


def subject_to_doc_type(subject: str) -> str:
    """Best-effort doc-type classification from the email subject line."""
    lowered = subject.lower()
    rules = [
        (("audit", "smeta", "bsci", "cap "), "compliance"),
        (("sop", "procedure", "নির্দেশ"), "sop"),
        (("invoice", "lc ", "pi "), "commercial"),
        (("production", "report", "output"), "production"),
    ]
    for needles, doc_type in rules:
        if any(needle in lowered for needle in needles):
            return doc_type
    return "other"
