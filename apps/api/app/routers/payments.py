import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.config import get_settings
from app.deps import CurrentUser, DbDep
from app.models import Payment, Tenant
from app.services.bkash import BkashClient, bkash_configured, execution_succeeded
from app.services.invoice_pdf import build_invoice_pdf
from app.services.plans import DEFAULT_PLAN, PLANS

router = APIRouter(prefix="/v1/payments", tags=["payments"])


class PaymentOut(BaseModel):
    id: str
    provider: str
    invoice_no: str
    plan: str
    months: int
    amount_bdt: float
    status: str
    created_at: str


class CreatePaymentIn(BaseModel):
    plan: str = Field(min_length=1, max_length=30)
    months: int = Field(default=1, ge=1, le=12)


def _amount_bdt(plan_code: str, months: int) -> tuple[float, str]:
    settings = get_settings()
    plan = PLANS.get(plan_code)
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown plan {plan_code}")
    amount = round(plan.price_usd * settings.usd_to_bdt_rate * months, 2)
    return amount, plan.name


def _invoice_no() -> str:
    return f"MIOS-{datetime.now(UTC).strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"


def _payment_out(payment: Payment) -> PaymentOut:
    return PaymentOut(
        id=str(payment.id),
        provider=payment.provider,
        invoice_no=payment.invoice_no,
        plan=payment.plan,
        months=payment.months,
        amount_bdt=payment.amount_bdt,
        status=payment.status,
        created_at=payment.created_at.isoformat(),
    )


def _tenant_of(db, user: CurrentUser) -> Tenant:
    tenant = db.get(Tenant, user.tenant_id)
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    return tenant


@router.post("/bkash/create")
def create_bkash_payment(
    payload: CreatePaymentIn, user: CurrentUser, db: DbDep
) -> dict:
    if user.role not in ("owner", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Owner or admin required")
    if not bkash_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "bKash credentials not configured (BKASH_APP_KEY etc.)",
        )

    amount, _plan_name = _amount_bdt(payload.plan, payload.months)
    invoice_no = _invoice_no()
    payment = Payment(
        tenant_id=user.tenant_id,
        provider="bkash",
        invoice_no=invoice_no,
        plan=payload.plan,
        months=payload.months,
        amount_bdt=amount,
        status="initiated",
    )
    db.add(payment)
    db.flush()

    client = BkashClient()
    try:
        result = client.create_payment(amount, invoice_no, payload.months)
    except Exception as exc:  # noqa: BLE001 — surface gateway errors to payer UI
        payment.status = "failed"
        payment.raw_response = {"error": str(exc)[:500]}
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"bKash create failed: {exc}") from exc

    payment.bkash_payment_id = str(result.get("paymentID", ""))
    payment.raw_response = {"create": result}
    db.flush()
    return {
        "payment_id": str(payment.id),
        "bkash_payment_id": payment.bkash_payment_id,
        "bkash_url": result.get("bkashURL", ""),
        "amount_bdt": amount,
        "invoice_no": invoice_no,
    }


@router.get("/bkash/callback")
def bkash_callback(
    db: DbDep,
    paymentID: str = Query(default="", alias="paymentID"),
    paymentStatus: str = Query(default=""),
) -> Response:
    """bKash redirects the payer here; we verify server-side then activate."""
    if not paymentID:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Missing paymentID")
    payment = (
        db.query(Payment).filter(Payment.bkash_payment_id == paymentID).one_or_none()
    )
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown payment")

    client = BkashClient()
    try:
        executed = client.execute_payment(paymentID)
    except Exception as exc:  # noqa: BLE001 — payer may cancel before execute
        payment.status = "failed" if paymentStatus != "cancel" else "canceled"
        payment.raw_response = {"execute_error": str(exc)[:500]}
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "bKash execute failed") from exc

    if execution_succeeded(executed):
        payment.status = "succeeded"
        payment.completed_at = datetime.now(UTC)
        tenant = db.get(Tenant, payment.tenant_id)
        if tenant is not None:
            tenant.plan = payment.plan
    else:
        payment.status = "failed"
    payment.raw_response = {**(payment.raw_response or {}), "execute": executed}
    db.flush()

    redirect_target = (
        f"/dashboard?payment=success&invoice={payment.invoice_no}"
        if payment.status == "succeeded"
        else f"/dashboard?payment={payment.status}"
    )
    return Response(status_code=status.HTTP_302_FOUND, headers={"Location": redirect_target})


@router.get("", response_model=list[PaymentOut])
def list_payments(user: CurrentUser, db: DbDep) -> list[PaymentOut]:
    payments = (
        db.query(Payment).order_by(Payment.created_at.desc()).limit(100).all()
    )
    return [_payment_out(p) for p in payments]


@router.get("/{payment_id}/invoice")
def download_invoice(payment_id: uuid.UUID, user: CurrentUser, db: DbDep) -> Response:
    payment = db.get(Payment, payment_id)
    if payment is None or payment.tenant_id != user.tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")

    tenant = db.get(Tenant, payment.tenant_id)
    plan = PLANS.get(payment.plan, PLANS[DEFAULT_PLAN])
    pdf = build_invoice_pdf(
        invoice_no=payment.invoice_no,
        date_str=payment.created_at.strftime("%Y-%m-%d"),
        company_name=tenant.name if tenant else "",
        plan_name=plan.name,
        months=payment.months,
        unit_price_usd=float(plan.price_usd),
        usd_to_bdt=get_settings().usd_to_bdt_rate,
    )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{payment.invoice_no}.pdf"'},
    )


@router.post("/{payment_id}/mark-paid", response_model=PaymentOut)
def mark_bank_transfer_paid(payment_id: uuid.UUID, user: CurrentUser, db: DbDep) -> PaymentOut:
    """Manual reconciliation for bank transfers (owner confirms money received)."""
    if user.role != "owner":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Owner required")
    payment = db.get(Payment, payment_id)
    if payment is None or payment.tenant_id != user.tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
    payment.provider = "bank_transfer"
    payment.status = "succeeded"
    payment.completed_at = datetime.now(UTC)
    tenant = db.get(Tenant, payment.tenant_id)
    if tenant is not None:
        tenant.plan = payment.plan
    db.flush()
    return _payment_out(payment)
