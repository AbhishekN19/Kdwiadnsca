import pytest
from datetime import datetime
from backend.app.services.forecast_selector import (
    select_day_ahead_forecast,
    match_actuals_and_forecasts,
    get_cutoff_timestamp,
)

def test_cutoff_timestamp_calculation():
    delivery_date = datetime(2026, 1, 15).date()
    
    # 12:00 cutoff should be 2026-01-14 12:00:00
    cutoff_12 = get_cutoff_timestamp(delivery_date, "d_minus_1_1200")
    assert cutoff_12 == datetime(2026, 1, 14, 12, 0, 0)

    # 17:00 cutoff
    cutoff_17 = get_cutoff_timestamp(delivery_date, "d_minus_1_1700")
    assert cutoff_17 == datetime(2026, 1, 14, 17, 0, 0)

    # 23:59 cutoff
    cutoff_24 = get_cutoff_timestamp(delivery_date, "d_minus_1_2359")
    assert cutoff_24 == datetime(2026, 1, 14, 23, 59, 59)

def test_select_day_ahead_forecast_no_lookahead():
    """
    Test scenario:
    Delivery time: 2026-01-15T10:00:00Z
    Candidate forecasts:
    - 2026-01-14T08:00:00Z -> 5200 MW
    - 2026-01-14T11:30:00Z -> 5500 MW
    - 2026-01-14T16:00:00Z -> 5100 MW (published after 12:00 cutoff!)
    - 2026-01-15T08:00:00Z -> 6000 MW (intraday!)
    
    With cutoff 'd_minus_1_1200' (Jan 14 12:00), it MUST pick 11:30 (5500 MW),
    never the 16:00 or Jan 15 forecast!
    """
    candidates = [
        {"publishTime": "2026-01-14T08:00:00Z", "startTime": "2026-01-15T10:00:00Z", "generation": 5200},
        {"publishTime": "2026-01-14T11:30:00Z", "startTime": "2026-01-15T10:00:00Z", "generation": 5500},
        {"publishTime": "2026-01-14T16:00:00Z", "startTime": "2026-01-15T10:00:00Z", "generation": 5100},
        {"publishTime": "2026-01-15T08:00:00Z", "startTime": "2026-01-15T10:00:00Z", "generation": 6000},
    ]

    selected = select_day_ahead_forecast(
        target_start_time_iso="2026-01-15T10:00:00Z",
        candidate_forecasts=candidates,
        cutoff_mode="d_minus_1_1200",
    )
    assert selected is not None
    assert selected["publishTime"] == "2026-01-14T11:30:00Z"
    assert selected["generation"] == 5500

    # If cutoff is 17:00, it SHOULD pick the 16:00 revision (5100 MW)
    selected_17 = select_day_ahead_forecast(
        target_start_time_iso="2026-01-15T10:00:00Z",
        candidate_forecasts=candidates,
        cutoff_mode="d_minus_1_1700",
    )
    assert selected_17["publishTime"] == "2026-01-14T16:00:00Z"
    assert selected_17["generation"] == 5100

    # If cutoff is intraday, it SHOULD pick the 2026-01-15T08:00:00Z revision (6000 MW)
    selected_intra = select_day_ahead_forecast(
        target_start_time_iso="2026-01-15T10:00:00Z",
        candidate_forecasts=candidates,
        cutoff_mode="intraday_latest",
    )
    assert selected_intra["publishTime"] == "2026-01-15T08:00:00Z"
    assert selected_intra["generation"] == 6000

def test_match_actuals_and_forecasts_block_hourly():
    actuals = [
        {"startTime": "2026-01-15T10:00:00Z", "settlementDate": "2026-01-15", "settlementPeriod": 21, "generation": 5000},
        {"startTime": "2026-01-15T10:30:00Z", "settlementDate": "2026-01-15", "settlementPeriod": 22, "generation": 5200},
    ]
    # Forecast only has 10:00:00Z
    forecasts_by_start = {
        "2026-01-15T10:00:00Z": [
            {"publishTime": "2026-01-14T11:30:00Z", "startTime": "2026-01-15T10:00:00Z", "generation": 5100}
        ]
    }

    # In block_hourly mode, both periods match to the 10:00 forecast
    matched = match_actuals_and_forecasts(
        actuals=actuals,
        forecasts_by_start=forecasts_by_start,
        cutoff_mode="d_minus_1_1200",
        alignment_mode="block_hourly",
    )
    assert len(matched) == 2
    assert matched[0].startTime == "2026-01-15T10:00:00Z"
    assert matched[0].error == 100.0  # 5100 - 5000
    assert matched[1].startTime == "2026-01-15T10:30:00Z"
    assert matched[1].error == -100.0  # 5100 - 5200

    # In exact mode, only the exact 10:00 matches
    matched_exact = match_actuals_and_forecasts(
        actuals=actuals,
        forecasts_by_start=forecasts_by_start,
        cutoff_mode="d_minus_1_1200",
        alignment_mode="exact",
    )
    assert len(matched_exact) == 1
    assert matched_exact[0].startTime == "2026-01-15T10:00:00Z"
