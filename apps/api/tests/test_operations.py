import pytest
from pydantic import ValidationError

from app.routers.operations import GapRequest, analyze_gaps


def observation(day=1, hour=9, actual=75, target=100, line="L1"):
    return {
        "line": line,
        "start": f"2026-09-{day:02}T{hour:02}:00:00+06:00",
        "target": target,
        "actual": actual,
    }


def test_missing_actual_is_not_zero_and_surplus_does_not_erase_gap():
    result = analyze_gaps(
        GapRequest(
            observations=[
                observation(actual=None),
                observation(hour=10, actual=120),
                observation(hour=11, actual=50),
            ]
        )
    )
    assert result["missing_actual_intervals"] == 1
    assert result["target_units"] == 200 and result["actual_units"] == 170
    assert result["gap_units"] == 50 and result["attainment_percent"] == 85


def test_contiguous_runs_break_on_missing_and_line_boundaries():
    result = analyze_gaps(
        GapRequest(
            observations=[
                observation(),
                observation(hour=10),
                observation(hour=11, actual=None),
                observation(hour=12),
                observation(line="L2"),
            ]
        )
    )
    assert [c["intervals"] for c in result["cycles"]] == [2, 1, 1]


def test_recurring_slots_need_three_distinct_observed_days():
    assert not analyze_gaps(GapRequest(observations=[observation(), observation(day=2)]))[
        "recurring_slots"
    ]
    result = analyze_gaps(
        GapRequest(
            observations=[
                observation(),
                observation(day=2),
                observation(day=3, actual=100),
                observation(day=4, actual=None),
            ]
        )
    )
    assert result["recurring_slots"][0]["observed_days"] == 3
    assert result["recurring_slots"][0]["gap_days"] == 2
    assert result["recurring_slots"][0]["slot_dhaka"] == "09:00"


def test_no_scheduled_observations_yields_unknown_attainment():
    result = analyze_gaps(GapRequest(observations=[observation(target=0)]))
    assert result["attainment_percent"] is None
    assert result["unscheduled_intervals"] == 1


@pytest.mark.parametrize(
    "rows",
    [
        [observation(), observation()],
        [{**observation(), "start": "2026-09-01T09:00:00"}],
        [observation(actual=-1)],
        [],
    ],
)
def test_invalid_data_rejected(rows):
    with pytest.raises(ValidationError):
        GapRequest(observations=rows)
