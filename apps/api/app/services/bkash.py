"""bKash Tokenized Checkout client (D-3 payment rail).

Flow: grant token -> create payment (returns bkashURL) -> payer approves ->
execute payment (webhook/callback) -> verify via query.

The httpx client is injectable for testing (MockTransport).
"""

import time
from dataclasses import dataclass

import httpx

from app.config import get_settings


@dataclass
class BkashConfig:
    base_url: str
    app_key: str
    app_secret: str
    username: str
    password: str

    @classmethod
    def from_settings(cls) -> "BkashConfig":
        s = get_settings()
        return cls(
            base_url=s.bkash_base_url.rstrip("/"),
            app_key=s.bkash_app_key,
            app_secret=s.bkash_app_secret,
            username=s.bkash_username,
            password=s.bkash_password,
        )


def bkash_configured(cfg: BkashConfig | None = None) -> bool:
    c = cfg or BkashConfig.from_settings()
    return all([c.app_key, c.app_secret, c.username, c.password])


class BkashClient:
    def __init__(self, cfg: BkashConfig | None = None, http: httpx.Client | None = None):
        self.cfg = cfg or BkashConfig.from_settings()
        self.http = http or httpx.Client(timeout=20)
        self._token: str = ""
        self._token_expires_at: float = 0.0
        self._refresh_token: str = ""

    def _headers(self, id_token: str | None = None) -> dict:
        headers = {
            "Content-Type": "application/json",
            "X-APP-Key": self.cfg.app_key,
        }
        if id_token:
            headers["Authorization"] = f"Bearer {id_token}"
        return headers

    @property
    def token(self) -> str:
        if not self._token or time.time() >= self._token_expires_at - 60:
            self._grant_or_refresh()
        return self._token

    def _grant_or_refresh(self) -> None:
        if self._refresh_token:
            payload = {
                "app_key": self.cfg.app_key,
                "app_secret": self.cfg.app_secret,
                "refresh_token": self._refresh_token,
            }
            path = "/tokenized/checkout/token/refresh"
        else:
            payload = {
                "app_key": self.cfg.app_key,
                "app_secret": self.cfg.app_secret,
                "username": self.cfg.username,
                "password": self.cfg.password,
            }
            path = "/tokenized/checkout/token/grant"

        response = self.http.post(
            f"{self.cfg.base_url}{path}",
            json=payload,
            headers=self._headers(id_token=None),
        )
        response.raise_for_status()
        body = response.json()
        if "id_token" not in body:
            raise RuntimeError(f"bKash token error: {body.get('status_message', body)}")
        self._token = body["id_token"]
        self._refresh_token = body.get("refresh_token", "")
        expires = body.get("expires_in", 3600)
        self._token_expires_at = time.time() + int(expires)

    def create_payment(self, amount_bdt: float, invoice_no: str, months: int) -> dict:
        """Returns {paymentID, bkashURL, ...}. Amount for N months is N x monthly price."""
        body = {
            "mode": "0011",
            "payerReference": invoice_no,
            "callbackURL": _callback_url(),
            "amount": f"{amount_bdt:.2f}",
            "currency": "BDT",
            "intent": "sale",
            "merchantInvoiceNumber": invoice_no[:50],
        }
        response = self.http.post(
            f"{self.cfg.base_url}/tokenized/checkout/create",
            json=body,
            headers=self._headers(self.token),
        )
        return _checked(response)

    def execute_payment(self, payment_id: str) -> dict:
        response = self.http.post(
            f"{self.cfg.base_url}/tokenized/checkout/execute",
            json={"paymentID": payment_id},
            headers=self._headers(self.token),
        )
        return _checked(response)

    def query_payment(self, payment_id: str) -> dict:
        response = self.http.post(
            f"{self.cfg.base_url}/tokenized/checkout/payment/status",
            json={"paymentID": payment_id},
            headers=self._headers(self.token),
        )
        return _checked(response)


def _callback_url() -> str:
    s = get_settings()
    return f"{s.public_base_url.rstrip('/')}/workspace?payment=bkash"


def _checked(response: httpx.Response) -> dict:
    response.raise_for_status()
    body = response.json()
    status_code = str(body.get("statusCode", body.get("status_code", "")))
    if status_code and status_code != "0000":
        raise RuntimeError(f"bKash error {status_code}: {body.get('statusMessage')}")
    return body


def execution_succeeded(payload: dict) -> bool:
    """Interpret an execute/query payload's transaction status."""
    status = str(payload.get("transactionStatus", "")).lower()
    if status in ("completed",):
        return True
    return str(payload.get("paymentStatus", payload.get("statusCode", ""))).lower() == "0000"
