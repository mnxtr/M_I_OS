"""Deterministic analysis of submitted observations; not persisted production truth."""

from collections import defaultdict
from datetime import timedelta
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Response
from pydantic import AwareDatetime, BaseModel, Field, model_validator

from app.deps import CurrentUser

router = APIRouter(prefix="/v1/operations", tags=["operations"])
DHAKA = ZoneInfo("Asia/Dhaka")


class Observation(BaseModel):
    line: str = Field(min_length=1, max_length=80, pattern=r".*\S.*")
    start: AwareDatetime
    target: int = Field(ge=0, le=1000000)
    actual: int | None = Field(default=None, ge=0, le=1000000)


class GapRequest(BaseModel):
    interval_minutes: int = Field(default=60, ge=15, le=240)
    observations: Annotated[list[Observation], Field(min_length=1, max_length=500)]

    @model_validator(mode="after")
    def reject_overlaps(self):
        previous = {}
        for row in sorted(self.observations, key=lambda x: (x.line, x.start)):
            if row.line in previous and row.start < previous[row.line] + timedelta(
                minutes=self.interval_minutes
            ):
                raise ValueError("Duplicate or overlapping intervals for the same line")
            previous[row.line] = row.start
        return self


def analyze_gaps(payload: GapRequest) -> dict:
    points, cycles = [], []
    buckets = defaultdict(list)
    line_totals = defaultdict(
        lambda: {"target": 0, "actual": 0, "gap": 0, "observed": 0, "missing": 0}
    )
    daily_totals = defaultdict(lambda: {"target": 0, "actual": 0, "gap": 0, "observed": 0})
    active = None
    target_sum = actual_sum = gap_sum = observed = 0
    for row in sorted(payload.observations, key=lambda x: (x.line, x.start)):
        eligible = row.actual is not None and row.target > 0
        gap = max(0, row.target - row.actual) if eligible else None
        end = row.start + timedelta(minutes=payload.interval_minutes)
        points.append({**row.model_dump(mode="json"), "gap": gap})
        if eligible:
            observed += 1
            target_sum += row.target
            actual_sum += row.actual
            gap_sum += gap
            local = row.start.astimezone(DHAKA)
            buckets[(row.line, local.strftime("%H:%M"))].append((local.date(), gap > 0))
            line_totals[row.line]["target"] += row.target
            line_totals[row.line]["actual"] += row.actual
            line_totals[row.line]["gap"] += gap
            line_totals[row.line]["observed"] += 1
            day = local.date().isoformat()
            daily_totals[day]["target"] += row.target
            daily_totals[day]["actual"] += row.actual
            daily_totals[day]["gap"] += gap
            daily_totals[day]["observed"] += 1
        else:
            line_totals[row.line]["missing"] += row.actual is None
        if gap is not None and gap > 0:
            if active and active["line"] == row.line and active["end"] == row.start:
                active["end"] = end
                active["intervals"] += 1
                active["gap_units"] += gap
            else:
                active = {
                    "line": row.line,
                    "start": row.start,
                    "end": end,
                    "intervals": 1,
                    "gap_units": gap,
                }
                cycles.append(active)
        else:
            active = None
    recurring = []
    for (line, slot), samples in buckets.items():
        days = len({date for date, _ in samples})
        gap_days = len({date for date, gap in samples if gap})
        if days >= 3 and gap_days / days >= 0.6:
            recurring.append(
                {
                    "line": line,
                    "slot_dhaka": slot,
                    "observed_days": days,
                    "gap_days": gap_days,
                    "gap_frequency": gap_days / days,
                }
            )
    by_line = []
    for line, totals in line_totals.items():
        target = totals["target"]
        actual = totals["actual"]
        by_line.append(
            {
                "line": line,
                "target_units": target,
                "actual_units": actual,
                "gap_units": totals["gap"],
                "attainment_percent": round(actual * 100 / target, 1) if target else None,
                "observed_intervals": totals["observed"],
                "missing_actual_intervals": totals["missing"],
            }
        )
    by_line.sort(key=lambda item: (-item["gap_units"], item["line"]))

    daily = []
    for date, totals in sorted(daily_totals.items()):
        target = totals["target"]
        actual = totals["actual"]
        daily.append(
            {
                "date": date,
                "target_units": target,
                "actual_units": actual,
                "gap_units": totals["gap"],
                "attainment_percent": round(actual * 100 / target, 1) if target else None,
                "observed_intervals": totals["observed"],
            }
        )

    priority_actions = []
    for summary in by_line[:5]:
        if summary["gap_units"] > 0:
            priority_actions.append(
                {
                    "line": summary["line"],
                    "kind": "shortfall",
                    "message": (
                        f"Review {summary['line']}: "
                        f"{summary['gap_units']} pieces of gross shortfall."
                    ),
                }
            )
        if summary["missing_actual_intervals"] > 0:
            priority_actions.append(
                {
                    "line": summary["line"],
                    "kind": "data",
                    "message": (
                        f"Complete {summary['missing_actual_intervals']} missing actual-output "
                        f"record(s) for {summary['line']}."
                    ),
                }
            )
    if not priority_actions:
        priority_actions.append(
            {
                "line": None,
                "kind": "monitor",
                "message": (
                    "No shortfall was found in the submitted intervals. "
                    "Keep collecting a full shift "
                    "before treating this as a stable result."
                ),
            }
        )
    return {
        "basis": "submitted observations; pieces; not saved as production truth",
        "submitted_intervals": len(payload.observations),
        "observed_intervals": observed,
        "missing_actual_intervals": sum(r.actual is None for r in payload.observations),
        "unscheduled_intervals": sum(r.target == 0 for r in payload.observations),
        "data_coverage_percent": round(observed * 100 / len(payload.observations), 1),
        "target_units": target_sum,
        "actual_units": actual_sum,
        "gap_units": gap_sum,
        "attainment_percent": round(actual_sum * 100 / target_sum, 1) if target_sum else None,
        "cycles": cycles,
        "recurring_slots": recurring,
        "points": points,
        "by_line": by_line,
        "daily": daily,
        "priority_actions": priority_actions[:6],
    }


@router.post("/gaps")
def production_gaps(payload: GapRequest, user: CurrentUser, response: Response) -> dict:
    response.headers["Cache-Control"] = "private, no-store"
    return analyze_gaps(payload)
