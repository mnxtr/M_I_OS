"""Authenticated SSLCOMMERZ sandbox flow; intentionally no production entitlements."""

import time
import uuid
from decimal import Decimal

import httpx
import jwt
from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from app.config import get_settings
from app.deps import CurrentUser
from app.services.sslcommerz import SSLCommerzSandbox

router = APIRouter(prefix="/v1/payments/sandbox/sslcommerz", tags=["payment sandbox"])


class Customer(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=150)
    phone: str = Field(min_length=6, max_length=30)
    address: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, max_length=80)


class ValidateIn(BaseModel):
    context: str = Field(min_length=1, max_length=4000)
    validation_id: str = Field(min_length=1, max_length=100)


def require_sandbox(user):
    settings = get_settings()
    if user.role not in {"owner", "admin"}:
        raise HTTPException(403, "Owner or admin required")
    if not settings.payment_sandbox_enabled or len(settings.jwt_secret) < 32:
        raise HTTPException(503, "Sandbox requires explicit enablement and a strong signing secret")
    if not settings.sslcommerz_store_id or not settings.sslcommerz_store_password:
        raise HTTPException(503, "SSLCOMMERZ sandbox credentials are not configured")
    return settings


@router.post("/session")
def create_session(customer: Customer, user: CurrentUser):
    settings = require_sandbox(user)
    transaction = "LO-" + uuid.uuid4().hex[:24]
    # Fixed nominal test amount; this endpoint cannot purchase a real plan.
    amount = Decimal("100.00")
    callback = settings.api_public_base_url.rstrip("/") + router.prefix + "/return"
    try:
        with httpx.Client(timeout=20) as http:
            client = SSLCommerzSandbox(
                settings.sslcommerz_store_id, settings.sslcommerz_store_password, http
            )
            result = client.create(
                transaction,
                amount,
                {
                    "cus_name": customer.name,
                    "cus_email": customer.email,
                    "cus_phone": customer.phone,
                    "cus_add1": customer.address,
                    "cus_city": customer.city,
                    "cus_country": "Bangladesh",
                },
                callback,
                callback,
            )
    except (ValueError, httpx.HTTPError):
        raise HTTPException(502, "Sandbox checkout unavailable") from None
    context = jwt.encode(
        {
            "purpose": "ssl-sandbox",
            "tenant": str(user.tenant_id),
            "transaction": transaction,
            "amount": str(amount),
            "exp": int(time.time()) + 1800,
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    return {**result, "context": context, "amount_bdt": str(amount), "sandbox": True}


@router.post("/validate")
def validate_session(payload: ValidateIn, user: CurrentUser):
    settings = require_sandbox(user)
    try:
        context = jwt.decode(
            payload.context,
            settings.jwt_secret,
            algorithms=["HS256"],
            options={"require": ["exp", "purpose", "tenant", "transaction", "amount"]},
        )
        if context["purpose"] != "ssl-sandbox" or context["tenant"] != str(user.tenant_id):
            raise HTTPException(403, "Checkout context does not belong to this workspace")
        with httpx.Client(timeout=20) as http:
            client = SSLCommerzSandbox(
                settings.sslcommerz_store_id, settings.sslcommerz_store_password, http
            )
            verified = client.validate(
                payload.validation_id, context["transaction"], Decimal(context["amount"])
            )
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired checkout context") from None
    except (ValueError, httpx.HTTPError):
        raise HTTPException(502, "Sandbox verification unavailable") from None
    return {"verified": verified, "sandbox": True, "entitlements_changed": False}


@router.post("/return", response_class=HTMLResponse)
def return_page(val_id: str = Form(default="", max_length=100)):
    # Notification acknowledgement only. The authenticated /validate path is authoritative.
    # Never echo untrusted payment fields into HTML or promote a subscription here.
    return (
        "<h1>Linora sandbox checkout returned</h1>"
        "<p>Return to your sandbox client and verify the transaction using the validation ID. "
        "No subscription has been activated.</p>"
    )
