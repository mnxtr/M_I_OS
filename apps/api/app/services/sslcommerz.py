"""Sandbox-only hosted checkout. Never treat browser redirects as payment proof."""

from decimal import Decimal, InvalidOperation

import httpx

BASE_URL = "https://sandbox.sslcommerz.com"


class SSLCommerzSandbox:
    def __init__(self, store_id: str, password: str, http: httpx.Client):
        if not store_id or not password:
            raise ValueError("SSLCOMMERZ sandbox credentials are required")
        self.store_id, self.password, self.http = store_id, password, http

    def create(
        self, transaction_id: str, amount: Decimal, customer: dict, return_url: str, ipn_url: str
    ) -> dict:
        if not return_url.startswith("https://") or not ipn_url.startswith("https://"):
            raise ValueError("HTTPS callback URLs are required")
        payload = {
            "store_id": self.store_id,
            "store_passwd": self.password,
            "total_amount": f"{amount:.2f}",
            "currency": "BDT",
            "tran_id": transaction_id,
            "success_url": return_url,
            "fail_url": return_url,
            "cancel_url": return_url,
            "ipn_url": ipn_url,
            "shipping_method": "NO",
            "num_of_item": "1",
            "product_name": "Linora sandbox subscription",
            "product_category": "Software",
            "product_profile": "non-physical-goods",
            **customer,
        }
        # Credentials and server-controlled fields cannot be overridden by customer data.
        for key in customer:
            if key not in {
                "cus_name",
                "cus_email",
                "cus_phone",
                "cus_add1",
                "cus_city",
                "cus_country",
            }:
                raise ValueError("Unexpected customer field")
        response = self.http.post(f"{BASE_URL}/gwprocess/v4/api.php", data=payload)
        response.raise_for_status()
        data = response.json()
        if data.get("status") != "SUCCESS":
            raise ValueError("Sandbox session creation failed")
        checkout = data.get("GatewayPageURL", "")
        if not checkout.startswith(f"{BASE_URL}/"):
            raise ValueError("Unexpected checkout destination")
        return {"checkout_url": checkout, "session_key": data.get("sessionkey", "")}

    def validate(self, validation_id: str, transaction_id: str, amount: Decimal) -> bool:
        response = self.http.get(
            f"{BASE_URL}/validator/api/validationserverAPI.php",
            params={
                "val_id": validation_id,
                "store_id": self.store_id,
                "store_passwd": self.password,
                "format": "json",
            },
        )
        response.raise_for_status()
        data = response.json()
        try:
            amount_matches = Decimal(str(data.get("amount", ""))) == amount
        except InvalidOperation:
            return False
        return (
            data.get("status") in {"VALID", "VALIDATED"}
            and data.get("tran_id") == transaction_id
            and amount_matches
            and data.get("currency") == "BDT"
            and str(data.get("risk_level")) == "0"
        )
