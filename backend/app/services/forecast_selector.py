from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dateutil import parser
from ..models.schemas import ForecastRecord, MatchedRecord

CUTOFF_DESCRIPTIONS = {
    "d_minus_1_1200": "D-1 12:00 UTC (UK EPEX SPOT Day-Ahead Auction Gate Closure)",
    "d_minus_1_1700": "D-1 17:00 UTC (Day-Ahead Afternoon Planning Cutoff)",
    "d_minus_1_2359": "D-1 23:59 UTC (Day-Ahead Final Midnight Cutoff)",
    "intraday_latest": "Intraday (Latest forecast published prior to delivery start)",
    "custom": "Custom D-1 Cutoff Time",
}

def get_cutoff_timestamp(
    delivery_date: datetime.date,
    cutoff_mode: str = "d_minus_1_1200",
    custom_time_str: str = "12:00",
) -> datetime:
    """Compute the UTC cutoff datetime before which forecasts must be published."""
    d_minus_1 = delivery_date - timedelta(days=1)
    
    if cutoff_mode == "d_minus_1_1200":
        return datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, 12, 0, 0)
    elif cutoff_mode == "d_minus_1_1700":
        return datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, 17, 0, 0)
    elif cutoff_mode == "d_minus_1_2359":
        return datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, 23, 59, 59)
    elif cutoff_mode == "custom":
        try:
            hour, minute = [int(p) for p in custom_time_str.split(":")]
        except Exception:
            hour, minute = 12, 0
        return datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, hour, minute, 0)
    else:
        # Default fallback
        return datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, 12, 0, 0)

def select_day_ahead_forecast(
    target_start_time_iso: str,
    candidate_forecasts: List[Dict],
    cutoff_mode: str = "d_minus_1_1200",
    custom_time_str: str = "12:00",
) -> Optional[Dict]:
    """
    Select the appropriate forecast available at the decision cutoff.
    Avoids lookahead bias by strictly requiring publishTime <= cutoff.
    """
    if not candidate_forecasts:
        return None

    dt_target = parser.isoparse(target_start_time_iso)
    if dt_target.tzinfo:
        dt_target_naive = dt_target.replace(tzinfo=None)
    else:
        dt_target_naive = dt_target

    if cutoff_mode == "intraday_latest":
        cutoff_dt = dt_target_naive
    else:
        cutoff_dt = get_cutoff_timestamp(dt_target_naive.date(), cutoff_mode, custom_time_str)

    # Filter forecasts published at or before cutoff
    valid_revisions = []
    for fc in candidate_forecasts:
        fc_pub = parser.isoparse(fc["publishTime"])
        if fc_pub.tzinfo:
            fc_pub_naive = fc_pub.replace(tzinfo=None)
        else:
            fc_pub_naive = fc_pub
        
        if fc_pub_naive <= cutoff_dt:
            valid_revisions.append((fc_pub_naive, fc))

    if not valid_revisions:
        # If no forecast was published before cutoff, return earliest available
        sorted_all = sorted(candidate_forecasts, key=lambda x: parser.isoparse(x["publishTime"]))
        return sorted_all[0]

    # Select the latest forecast revision published on or before cutoff
    valid_revisions.sort(key=lambda x: x[0])
    return valid_revisions[-1][1]

def match_actuals_and_forecasts(
    actuals: List[Dict],
    forecasts_by_start: Dict[str, List[Dict]],
    cutoff_mode: str = "d_minus_1_1200",
    custom_time_str: str = "12:00",
    alignment_mode: str = "block_hourly",
) -> List[MatchedRecord]:
    """
    Aligns and pairs actual outturn generation with the relevant forecast.
    
    alignment_mode:
      - 'exact': Matches exact startTime (only :00 timestamps, 24 periods/day).
      - 'block_hourly': Maps :30 settlement periods to the hour's forecast (48 periods/day).
    """
    matched_records: List[MatchedRecord] = []

    for act in actuals:
        start_time_str = act["startTime"]
        dt_start = parser.isoparse(start_time_str)

        # Determine target forecast lookup key
        candidates = forecasts_by_start.get(start_time_str)
        if not candidates and alignment_mode == "block_hourly":
            # If period is :30:00Z, map to the hourly forecast key at :00:00Z
            hour_block_dt = dt_start.replace(minute=0, second=0)
            hour_block_key = hour_block_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            candidates = forecasts_by_start.get(hour_block_key)

        if not candidates:
            continue

        selected_fc = select_day_ahead_forecast(
            start_time_str,
            candidates,
            cutoff_mode=cutoff_mode,
            custom_time_str=custom_time_str,
        )

        if not selected_fc:
            continue

        actual_gen = float(act["generation"])
        fc_gen = float(selected_fc["generation"])
        signed_error = fc_gen - actual_gen
        abs_error = abs(signed_error)

        pct_error = None
        if actual_gen > 10.0:  # Avoid division by zero
            pct_error = round((signed_error / actual_gen) * 100.0, 2)

        dt_pub = parser.isoparse(selected_fc["publishTime"])
        lead_time_seconds = (dt_start - dt_pub).total_seconds()
        lead_time_hours = round(max(0.0, lead_time_seconds / 3600.0), 2)

        matched_records.append(
            MatchedRecord(
                startTime=start_time_str,
                settlementDate=act.get("settlementDate", dt_start.strftime("%Y-%m-%d")),
                settlementPeriod=act.get("settlementPeriod"),
                actualGeneration=actual_gen,
                forecastGeneration=fc_gen,
                publishTime=selected_fc["publishTime"],
                leadTimeHours=lead_time_hours,
                error=round(signed_error, 2),
                absoluteError=round(abs_error, 2),
                percentageError=pct_error,
            )
        )

    # Sort chronologically by startTime
    matched_records.sort(key=lambda r: r.startTime)
    return matched_records
