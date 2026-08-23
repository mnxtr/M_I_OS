from datetime import datetime

import pytest

from app.services.plans import (
    ALL_METRICS,
    DEFAULT_PLAN,
    PLANS,
    QuotaExceeded,
    enforce_quota,
    estimate_minutes_saved,
    limit_for,
    period_key,
)


class FakeDB:
    def __init__(self, used: int):
        self.used = used
        self.recorded = None

    def execute(self, _sql, params):
        if "ON CONFLICT" in str(_sql):
            self.recorded = params
            return None

        class Result:
            def scalar(self, *_a, **_k):
                return fake_db.used

        fake_db = self
        return Result()


def test_period_key_format():
    assert period_key(datetime(2026, 8, 24)) == "2026-08"
    assert len(period_key()) == 7


def test_plan_limits_are_consistent():
    required = {
        "code",
        "name",
        "monthly_chat_queries",
        "monthly_analytics_queries",
        "monthly_pages",
    }
    for code, plan in PLANS.items():
        data = plan.__dict__
        assert required.issubset(data.keys()), f"{code} missing fields"
        assert plan.code == code
    assert DEFAULT_PLAN in PLANS


def test_tier_ordering_on_chat_allowance():
    assert PLANS["trial"].monthly_chat_queries < PLANS["starter"].monthly_chat_queries
    assert PLANS["growth"].monthly_chat_queries == -1  # unlimited
    assert PLANS["enterprise"].price_usd >= PLANS["growth"].price_usd


def test_limit_for_unknown_plan_falls_back_to_default():
    assert limit_for("nonexistent", "chat_queries") == limit_for(DEFAULT_PLAN, "chat_queries")


def test_limit_for_all_metrics():
    for metric in ALL_METRICS:
        value = limit_for("starter", metric)
        assert value > 0


def test_enforce_quota_passes_under_limit():
    db = FakeDB(used=99)
    enforce_quota(db, "00000000-0000-0000-0000-000000000000", "trial", "chat_queries")
    assert db.recorded is None  # not recorded by enforce, only checked


def test_enforce_quota_raises_at_limit():
    db = FakeDB(used=200)  # trial chat allowance
    with pytest.raises(QuotaExceeded) as exc_info:
        enforce_quota(db, "00000000-0000-0000-0000-000000000000", "trial", "chat_queries")
    detail = exc_info.value.detail
    assert detail["error"] == "quota_exceeded"
    assert detail["plan"] == "trial"
    assert detail["limit"] == 200


def test_unlimited_plans_never_raise():
    db = FakeDB(used=10**9)
    enforce_quota(db, "00000000-0000-0000-0000-000000000000", "growth", "chat_queries")


def test_estimate_minutes_saved():
    saved = estimate_minutes_saved({"chat_queries": 100, "analytics_queries": 10})
    assert saved == 100 * 3 + 10 * 8
    assert estimate_minutes_saved({}) == 0
