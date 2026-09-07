from decimal import Decimal

import httpx
import pytest

from app.services.sslcommerz import SSLCommerzSandbox


@pytest.mark.parametrize(
    "changes,expected",
    [
        ({}, True),
        ({"status": "VALIDATED"}, True),
        ({"status": "FAILED"}, False),
        ({"amount": "101.00"}, False),
        ({"currency": "USD"}, False),
        ({"tran_id": "another"}, False),
        ({"risk_level": "1"}, False),
        ({"risk_level": None}, False),
        ({"amount": "bad"}, False),
    ],
)
def test_validation_checks_gateway_proof(changes, expected):
    data = {
        "status": "VALID",
        "tran_id": "T1",
        "amount": "100.00",
        "currency": "BDT",
        "risk_level": "0",
        **changes,
    }
    with httpx.Client(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, json=data))
    ) as http:
        client = SSLCommerzSandbox("sandbox-store", "test-password", http)
        assert client.validate("validation-id", "T1", Decimal("100.00")) is expected


def test_create_requires_sandbox_checkout_url():
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda req: httpx.Response(
                200, json={"status": "SUCCESS", "GatewayPageURL": "https://evil.example/checkout"}
            )
        )
    ) as http:
        client = SSLCommerzSandbox("store", "password", http)
        with pytest.raises(ValueError, match="destination"):
            client.create(
                "T1",
                Decimal("100.00"),
                {},
                "https://example.invalid/return",
                "https://example.invalid/ipn",
            )
