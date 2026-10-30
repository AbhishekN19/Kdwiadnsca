import json
import logging
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from dateutil import parser

from ..config import settings
from ..models.schemas import (
    MatchedRecord,
    DailyAccuracy,
    IntradayProfile,
    ForecastRevision,
    ForecastEvolution,
    SummaryResponse,
    ComparisonResponse,
)
from ..analysis.metrics import (
    calculate_accuracy_metrics,
    calculate_error_distribution,
    calculate_mae,
    calculate_rmse,
    calculate_mbe,
    calculate_nmae,
)
from .forecast_selector import (
    match_actuals_and_forecasts,
    CUTOFF_DESCRIPTIONS,
)
from .elexon_client import ElexonClient

logger = logging.getLogger(__name__)

class DataManager:
    """Central repository managing caching, matching, and statistical aggregations."""

    def __init__(self):
        self.actuals: List[Dict[str, Any]] = []
        self.forecasts: List[Dict[str, Any]] = []
        self.forecasts_by_start: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.client = ElexonClient()
        self.is_loaded = False
        self.load_seed_data()

    def load_seed_data(self):
        """Load January 2026 data from pre-fetched files into memory."""
        try:
            if settings.seed_actuals_path.exists():
                with open(settings.seed_actuals_path, "r", encoding="utf-8") as f:
                    self.actuals = json.load(f)
                logger.info(f"Loaded {len(self.actuals)} actual records from seed.")

            if settings.seed_forecasts_path.exists():
                with open(settings.seed_forecasts_path, "r", encoding="utf-8") as f:
                    self.forecasts = json.load(f)
                logger.info(f"Loaded {len(self.forecasts)} forecast records from seed.")

            self.index_forecasts()
            self.is_loaded = True
        except Exception as e:
            logger.error(f"Error loading seed data: {e}")

    def index_forecasts(self):
        """Index forecasts by startTime and sort revisions chronologically by publishTime."""
        self.forecasts_by_start.clear()
        for fc in self.forecasts:
            st = fc.get("startTime")
            if st:
                self.forecasts_by_start[st].append(fc)

        for st in self.forecasts_by_start:
            self.forecasts_by_start[st].sort(
                key=lambda x: parser.isoparse(x["publishTime"])
            )

    def get_date_bounds(self) -> Dict[str, str]:
        """Return available date range of data in memory."""
        if not self.actuals:
            return {"minDate": "2026-01-01", "maxDate": "2026-01-31"}
        dates = sorted(set(a.get("settlementDate") for a in self.actuals if a.get("settlementDate")))
        return {
            "minDate": dates[0] if dates else "2026-01-01",
            "maxDate": dates[-1] if dates else "2026-01-31",
            "totalDays": len(dates),
        }

    def filter_actuals(self, date_from: str, date_to: str) -> List[Dict[str, Any]]:
        """Filter actuals by settlementDate range (inclusive)."""
        return [
            a for a in self.actuals
            if date_from <= a.get("settlementDate", "") <= date_to
        ]

    def get_matched_series(
        self,
        date_from: str = "2026-01-01",
        date_to: str = "2026-01-31",
        cutoff_mode: str = "d_minus_1_1200",
        custom_time: str = "12:00",
        alignment_mode: str = "block_hourly",
    ) -> List[MatchedRecord]:
        """Pair actual generation with the relevant forecast for each delivery period."""
        filtered_actuals = self.filter_actuals(date_from, date_to)
        return match_actuals_and_forecasts(
            actuals=filtered_actuals,
            forecasts_by_start=self.forecasts_by_start,
            cutoff_mode=cutoff_mode,
            custom_time_str=custom_time,
            alignment_mode=alignment_mode,
        )

    def get_comparison(
        self,
        date_from: str = "2026-01-01",
        date_to: str = "2026-01-31",
        cutoff_mode: str = "d_minus_1_1200",
        custom_time: str = "12:00",
        alignment_mode: str = "block_hourly",
    ) -> ComparisonResponse:
        """Return matched series with computed summary metrics and error histogram."""
        records = self.get_matched_series(
            date_from=date_from,
            date_to=date_to,
            cutoff_mode=cutoff_mode,
            custom_time=custom_time,
            alignment_mode=alignment_mode,
        )

        actuals = [r.actualGeneration for r in records]
        forecasts = [r.forecastGeneration for r in records]
        errors = [r.error for r in records]

        metrics = calculate_accuracy_metrics(actuals, forecasts)
        distribution = calculate_error_distribution(errors)
        desc = CUTOFF_DESCRIPTIONS.get(cutoff_mode, cutoff_mode)

        return ComparisonResponse(
            dateFrom=date_from,
            dateTo=date_to,
            cutoffMode=cutoff_mode,
            cutoffDescription=desc,
            alignmentMode=alignment_mode,
            metrics=metrics,
            records=records,
            distribution=distribution,
        )

    def get_summary(
        self,
        date_from: str = "2026-01-01",
        date_to: str = "2026-01-31",
        cutoff_mode: str = "d_minus_1_1200",
        custom_time: str = "12:00",
        alignment_mode: str = "block_hourly",
    ) -> SummaryResponse:
        """Executive summary response with best/worst days and extreme deviations."""
        records = self.get_matched_series(
            date_from=date_from,
            date_to=date_to,
            cutoff_mode=cutoff_mode,
            custom_time=custom_time,
            alignment_mode=alignment_mode,
        )

        actuals = [r.actualGeneration for r in records]
        forecasts = [r.forecastGeneration for r in records]
        errors = [r.error for r in records]

        metrics = calculate_accuracy_metrics(actuals, forecasts)
        distribution = calculate_error_distribution(errors)
        daily_breakdown = self.get_daily_breakdown(
            date_from, date_to, cutoff_mode, custom_time, alignment_mode
        )

        best_day = min(daily_breakdown, key=lambda d: d.mae) if daily_breakdown else None
        worst_day = max(daily_breakdown, key=lambda d: d.mae) if daily_breakdown else None

        worst_over = max(records, key=lambda r: r.error) if records else None
        worst_under = min(records, key=lambda r: r.error) if records else None

        desc = CUTOFF_DESCRIPTIONS.get(cutoff_mode, cutoff_mode)

        return SummaryResponse(
            totalPeriods=len(records),
            totalDays=len(daily_breakdown),
            dateRange={"from": date_from, "to": date_to},
            cutoffMode=cutoff_mode,
            cutoffDescription=desc,
            alignmentMode=alignment_mode,
            metrics=metrics,
            bestDay=best_day,
            worstDay=worst_day,
            worstOverestimation=worst_over,
            worstUnderestimation=worst_under,
            distribution=distribution,
        )

    def get_daily_breakdown(
        self,
        date_from: str = "2026-01-01",
        date_to: str = "2026-01-31",
        cutoff_mode: str = "d_minus_1_1200",
        custom_time: str = "12:00",
        alignment_mode: str = "block_hourly",
    ) -> List[DailyAccuracy]:
        """Aggregate metrics per calendar day."""
        records = self.get_matched_series(
            date_from=date_from,
            date_to=date_to,
            cutoff_mode=cutoff_mode,
            custom_time=custom_time,
            alignment_mode=alignment_mode,
        )

        grouped = defaultdict(list)
        for r in records:
            grouped[r.settlementDate].append(r)

        daily_list = []
        for date_str in sorted(grouped.keys()):
            recs = grouped[date_str]
            actuals = [r.actualGeneration for r in recs]
            forecasts = [r.forecastGeneration for r in recs]
            errors = [r.error for r in recs]

            mae = calculate_mae(errors)
            rmse = calculate_rmse(errors)
            mbe = calculate_mbe(errors)
            avg_act = sum(actuals) / len(actuals) if actuals else 0.0
            avg_fc = sum(forecasts) / len(forecasts) if forecasts else 0.0
            nmae = calculate_nmae(mae, avg_act)

            daily_list.append(
                DailyAccuracy(
                    date=date_str,
                    count=len(recs),
                    mae=round(mae, 2),
                    rmse=round(rmse, 2),
                    mbe=round(mbe, 2),
                    nmae=round(nmae, 2),
                    avgActual=round(avg_act, 2),
                    avgForecast=round(avg_fc, 2),
                    maxPositiveError=round(max(errors), 2) if errors else 0.0,
                    maxNegativeError=round(min(errors), 2) if errors else 0.0,
                )
            )

        return daily_list

    def get_intraday_profile(
        self,
        date_from: str = "2026-01-01",
        date_to: str = "2026-01-31",
        cutoff_mode: str = "d_minus_1_1200",
        custom_time: str = "12:00",
        alignment_mode: str = "block_hourly",
    ) -> List[IntradayProfile]:
        """Intraday accuracy profile across settlement periods (1 to 48)."""
        records = self.get_matched_series(
            date_from=date_from,
            date_to=date_to,
            cutoff_mode=cutoff_mode,
            custom_time=custom_time,
            alignment_mode=alignment_mode,
        )

        by_sp = defaultdict(list)
        for r in records:
            sp = r.settlementPeriod
            if sp is not None:
                by_sp[sp].append(r)

        profiles = []
        for sp in sorted(by_sp.keys()):
            recs = by_sp[sp]
            actuals = [r.actualGeneration for r in recs]
            forecasts = [r.forecastGeneration for r in recs]
            errors = [r.error for r in recs]

            # Convert settlement period to time of day label
            # SP 1 = 00:00 - 00:30, SP 2 = 00:30 - 01:00
            total_minutes = (sp - 1) * 30
            hours = total_minutes // 60
            minutes = total_minutes % 60
            time_label = f"{hours:02d}:{minutes:02d}"

            mae = calculate_mae(errors)
            rmse = calculate_rmse(errors)
            mbe = calculate_mbe(errors)
            avg_act = sum(actuals) / len(actuals) if actuals else 0.0
            avg_fc = sum(forecasts) / len(forecasts) if forecasts else 0.0

            profiles.append(
                IntradayProfile(
                    settlementPeriod=sp,
                    timeOfDay=time_label,
                    count=len(recs),
                    mae=round(mae, 2),
                    rmse=round(rmse, 2),
                    mbe=round(mbe, 2),
                    avgActual=round(avg_act, 2),
                    avgForecast=round(avg_fc, 2),
                )
            )

        return profiles

    def get_forecast_evolution(
        self,
        target_start_time: str,
        cutoff_mode: str = "d_minus_1_1200",
        custom_time: str = "12:00",
    ) -> ForecastEvolution:
        """
        Inspect how forecasts evolved for a specific delivery period across different lead times.
        Shows every published revision and which one was chosen at cutoff.
        """
        dt_target = parser.isoparse(target_start_time)
        candidates = self.forecasts_by_start.get(target_start_time, [])

        if not candidates and dt_target.minute == 30:
            # If target was :30, map to hour block
            hour_key = dt_target.replace(minute=0, second=0).strftime("%Y-%m-%dT%H:%M:%SZ")
            candidates = self.forecasts_by_start.get(hour_key, [])

        # Find actual generation if available
        act_rec = next((a for a in self.actuals if a.get("startTime") == target_start_time), None)
        actual_gen = float(act_rec["generation"]) if act_rec else None

        # Determine cutoff selection
        from .forecast_selector import select_day_ahead_forecast
        selected_fc = select_day_ahead_forecast(
            target_start_time,
            candidates,
            cutoff_mode=cutoff_mode,
            custom_time_str=custom_time,
        )
        selected_pub = selected_fc["publishTime"] if selected_fc else None

        revisions: List[ForecastRevision] = []
        for fc in candidates:
            dt_pub = parser.isoparse(fc["publishTime"])
            lead_hours = round(max(0.0, (dt_target - dt_pub).total_seconds() / 3600.0), 2)
            gen = float(fc["generation"])
            err = round(gen - actual_gen, 2) if actual_gen is not None else None
            is_selected = (fc["publishTime"] == selected_pub)

            revisions.append(
                ForecastRevision(
                    publishTime=fc["publishTime"],
                    leadTimeHours=lead_hours,
                    forecastGeneration=gen,
                    error=err,
                    isCutoffSelected=is_selected,
                )
            )

        # Sort from earliest published to latest published
        revisions.sort(key=lambda r: parser.isoparse(r.publishTime))

        return ForecastEvolution(
            targetStartTime=target_start_time,
            actualGeneration=actual_gen,
            revisions=revisions,
        )

# Global singleton
data_manager = DataManager()
