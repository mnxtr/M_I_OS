from datetime import date, timedelta

from app.routers.dashboard import DashboardFactory, build_seed_dashboard


def factory() -> DashboardFactory:
    return DashboardFactory(
        id="00000000-0000-0000-0000-000000000001",
        name="Pilot Factory",
        timezone="Asia/Dhaka",
        currency="BDT",
    )


def test_dashboard_is_bounded_and_totals_match_series() -> None:
    selected_factory = factory()
    snapshot = build_seed_dashboard(
        factory=selected_factory,
        factories=[selected_factory],
        role="owner",
        capabilities=[
            "dashboard",
            "production",
            "quality",
            "compliance",
            "maintenance",
            "actions",
            "evidence",
        ],
        date_from=date(2026, 7, 1),
        date_to=date(2026, 8, 31),
        granularity="day",
        line_id=None,
        shift=None,
    )

    assert snapshot.production_series is not None
    assert len(snapshot.production_series) == 31
    output = next(metric for metric in snapshot.kpis if metric.key == "output")
    assert output.value == sum(point.actual for point in snapshot.production_series)


def test_dashboard_omits_unauthorized_modules() -> None:
    selected_factory = factory()
    snapshot = build_seed_dashboard(
        factory=selected_factory,
        factories=[selected_factory],
        role="auditor",
        capabilities=["dashboard", "compliance", "evidence"],
        date_from=date.today() - timedelta(days=6),
        date_to=date.today(),
        granularity="day",
        line_id=None,
        shift=None,
    )

    assert snapshot.production_series is None
    assert snapshot.line_rankings is None
    assert snapshot.quality_pareto is None
    assert snapshot.maintenance_health is None
    assert snapshot.action_pipeline is None
    assert snapshot.compliance_coverage is not None
    assert all(metric.module in {"dashboard", "compliance"} for metric in snapshot.kpis)
