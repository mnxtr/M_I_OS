"""Regression tests: tenant actions never self-verify paid subscriptions."""

from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.models import Tenant
from app.routers import payments
from app.routers.tenant import PlanSwitchIn, switch_plan


class FakeDb:
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
        self.flush_count = 0

    def get(self, model, ident):
        assert model is Tenant
        return self.tenant if ident == self.tenant.id else None

    def flush(self):
        self.flush_count += 1


def owner(tenant_id):
    return SimpleNamespace(tenant_id=tenant_id, role="owner")


def test_bank_transfer_self_confirmation_route_is_not_exposed():
    app = FastAPI()
    app.include_router(payments.router)

    assert not any("mark-paid" in route.path for route in payments.router.routes)
    response = TestClient(app).post(f"/v1/payments/{uuid4()}/mark-paid")
    assert response.status_code == 404


@pytest.mark.parametrize("paid_plan", ["starter", "growth", "enterprise"])
def test_owner_cannot_self_activate_paid_plan(paid_plan):
    workspace = Tenant(id=uuid4(), name="Factory", plan="trial")
    db = FakeDb(workspace)

    with pytest.raises(HTTPException) as error:
        switch_plan(PlanSwitchIn(plan=paid_plan), owner(workspace.id), db)

    assert error.value.status_code == 403
    assert workspace.plan == "trial"
    assert db.flush_count == 0


def test_owner_cannot_switch_between_paid_plans_without_verification():
    workspace = Tenant(id=uuid4(), name="Factory", plan="starter")
    db = FakeDb(workspace)

    with pytest.raises(HTTPException) as error:
        switch_plan(PlanSwitchIn(plan="growth"), owner(workspace.id), db)

    assert error.value.status_code == 403
    assert workspace.plan == "starter"
    assert db.flush_count == 0


def test_owner_can_downgrade_to_trial():
    workspace = Tenant(id=uuid4(), name="Factory", plan="growth")
    db = FakeDb(workspace)

    result = switch_plan(PlanSwitchIn(plan="trial"), owner(workspace.id), db)

    assert result.code == "trial"
    assert workspace.plan == "trial"
    assert db.flush_count == 1


def test_owner_can_repeat_existing_plan_without_activation():
    workspace = Tenant(id=uuid4(), name="Factory", plan="starter")
    db = FakeDb(workspace)

    result = switch_plan(PlanSwitchIn(plan="starter"), owner(workspace.id), db)

    assert result.code == "starter"
    assert db.flush_count == 1
