import json
import re

import httpx
import pytest

from app.services.bkash import BkashClient, BkashConfig, bkash_configured, execution_succeeded
from app.services.invoice_pdf import build_invoice_pdf


def make_config() -> BkashConfig:
    return BkashConfig(
        base_url="https://tokenized.sandbox.bka.sh/v1.2.0-beta",
        app_key="test-key",
        app_secret="test-secret",
        username="test-user",
        password="test-pass",
    )


def mock_transport(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler), timeout=10)


def test_bkash_configured_requires_all_credentials():
    assert bkash_configured(make_config())
    assert not bkash_configured(BkashConfig("", "", "", "", ""))


def test_grant_then_create_payment_request_shape(monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "api_public_base_url", "https://api.example.invalid")
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        calls.append((request.url.path, request.headers.get("X-APP-Key"), body))
        if request.url.path.endswith("/token/grant"):
            return httpx.Response(
                200, json={"id_token": "tok123", "refresh_token": "r1", "expires_in": 3600}
            )
        if request.url.path.endswith("/checkout/create"):
            return httpx.Response(
                200,
                json={
                    "statusCode": "0000",
                    "paymentID": "pay-001",
                    "bkashURL": "https://sandbox.payment.bka.sh/pay",
                },
            )
        return httpx.Response(500, json={})

    client = BkashClient(cfg=make_config(), http=mock_transport(handler))
    result = client.create_payment(35880.0, "MIOS-202608-ABC123", 3)

    assert result["bkashURL"].startswith("https://")
    grant_path, app_key, grant_body = calls[0]
    assert grant_path.endswith("/tokenized/checkout/token/grant")
    assert app_key == "test-key"
    assert grant_body["username"] == "test-user"
    create_path, _, create_body = calls[1]
    assert create_path.endswith("/tokenized/checkout/create")
    assert create_body["amount"] == "35880.00"
    assert create_body["currency"] == "BDT"
    assert create_body["intent"] == "sale"
    assert calls[1][2]["merchantInvoiceNumber"] == "MIOS-202608-ABC123"


def test_gateway_error_status_raises(monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "api_public_base_url", "https://api.example.invalid")
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/token/grant"):
            return httpx.Response(200, json={"id_token": "t", "expires_in": 3600})
        return httpx.Response(
            200, json={"statusCode": "5001", "statusMessage": "Something went wrong"}
        )

    client = BkashClient(cfg=make_config(), http=mock_transport(handler))
    with pytest.raises(RuntimeError, match="5001"):
        client.create_payment(100, "INV-1", 1)


def test_execution_succeeded_interpretations():
    assert execution_succeeded({"transactionStatus": "Completed"})
    assert not execution_succeeded({"transactionStatus": "Initiated"})
    assert not execution_succeeded({"statusCode": "0000"})
    assert not execution_succeeded({"statusCode": "5099"})


def test_invoice_pdf_is_valid_structure():
    pdf = build_invoice_pdf(
        invoice_no="MIOS-202608-ABC123",
        date_str="2026-08-24",
        company_name="Meghna Apparels Ltd",
        plan_name="Growth",
        months=3,
        unit_price_usd=299,
        usd_to_bdt=120,
    )
    assert pdf.startswith(b"%PDF-1.4")
    assert pdf.rstrip().endswith(b"%%EOF")
    assert b"(INVOICE)" in pdf
    assert b"MIOS-202608-ABC123" in pdf
    assert b"Growth subscription" in pdf
    # xref table present with correct start marker
    xref_match = re.search(rb"\nxref\n0 (\d+)\n", pdf)
    assert xref_match
    # total: 299 * 120 * 3
    assert b"107,640.00" in pdf


def test_invoice_pdf_escapes_parentheses():
    pdf = build_invoice_pdf(
        invoice_no="INV-(WEIRD)",
        date_str="2026-08-24",
        company_name="A (Test) Co",
        plan_name="Starter",
        months=1,
        unit_price_usd=99,
        usd_to_bdt=120,
    )
    assert rb"\(WEIRD\)" in pdf
