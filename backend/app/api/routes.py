from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List

from ..config import settings
from ..services.data_manager import data_manager
from ..models.schemas import (
    ComparisonResponse,
    SummaryResponse,
    DailyAccuracy,
    IntradayProfile,
    ForecastEvolution,
    ActualRecord,
)

router = APIRouter(prefix="/api", tags=["Wind Monitoring & Accuracy"])

@router.get("/health")
def get_health():
    """Health check and dataset status."""
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "isDataLoaded": data_manager.is_loaded,
        "totalActuals": len(data_manager.actuals),
        "totalForecasts": len(data_manager.forecasts),
    }

@router.get("/dates")
def get_available_dates():
    """Get date boundaries and days available in dataset."""
    return data_manager.get_date_bounds()

@router.get("/comparison", response_model=ComparisonResponse)
def get_comparison(
    dateFrom: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    dateTo: str = Query("2026-01-31", description="End date (YYYY-MM-DD)"),
    cutoffMode: str = Query("d_minus_1_1200", description="Decision cutoff preset"),
    customTime: str = Query("12:00", description="Custom cutoff time on D-1 if cutoffMode=custom"),
    alignmentMode: str = Query("block_hourly", description="Matching mode: 'block_hourly' (48 SP/day) or 'exact' (24 SP/day)"),
):
    """
    Retrieve matched actual and forecasted wind generation time-series
    along with error metrics and distribution histogram for the selected period.
    """
    if dateFrom > dateTo:
        raise HTTPException(status_code=400, detail="dateFrom cannot be later than dateTo")

    return data_manager.get_comparison(
        date_from=dateFrom,
        date_to=dateTo,
        cutoff_mode=cutoffMode,
        custom_time=customTime,
        alignment_mode=alignmentMode,
    )

@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    dateFrom: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    dateTo: str = Query("2026-01-31", description="End date (YYYY-MM-DD)"),
    cutoffMode: str = Query("d_minus_1_1200", description="Decision cutoff preset"),
    customTime: str = Query("12:00", description="Custom cutoff time on D-1 if cutoffMode=custom"),
    alignmentMode: str = Query("block_hourly", description="Matching mode: 'block_hourly' or 'exact'"),
):
    """
    Get top-level KPI metrics summary, including best/worst performing days
    and maximum overestimation/underestimation periods.
    """
    return data_manager.get_summary(
        date_from=dateFrom,
        date_to=dateTo,
        cutoff_mode=cutoffMode,
        custom_time=customTime,
        alignment_mode=alignmentMode,
    )

@router.get("/daily-accuracy", response_model=List[DailyAccuracy])
def get_daily_accuracy(
    dateFrom: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    dateTo: str = Query("2026-01-31", description="End date (YYYY-MM-DD)"),
    cutoffMode: str = Query("d_minus_1_1200", description="Decision cutoff preset"),
    customTime: str = Query("12:00", description="Custom cutoff time on D-1 if cutoffMode=custom"),
    alignmentMode: str = Query("block_hourly", description="Matching mode: 'block_hourly' or 'exact'"),
):
    """Daily breakdown of forecast error statistics across the month."""
    return data_manager.get_daily_breakdown(
        date_from=dateFrom,
        date_to=dateTo,
        cutoff_mode=cutoffMode,
        custom_time=customTime,
        alignment_mode=alignmentMode,
    )

@router.get("/intraday-profile", response_model=List[IntradayProfile])
def get_intraday_profile(
    dateFrom: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    dateTo: str = Query("2026-01-31", description="End date (YYYY-MM-DD)"),
    cutoffMode: str = Query("d_minus_1_1200", description="Decision cutoff preset"),
    customTime: str = Query("12:00", description="Custom cutoff time on D-1 if cutoffMode=custom"),
    alignmentMode: str = Query("block_hourly", description="Matching mode: 'block_hourly' or 'exact'"),
):
    """Intraday accuracy profile by settlement period (1 to 48 / 00:00 to 23:30)."""
    return data_manager.get_intraday_profile(
        date_from=dateFrom,
        date_to=dateTo,
        cutoff_mode=cutoffMode,
        custom_time=customTime,
        alignment_mode=alignmentMode,
    )

@router.get("/forecast-evolution", response_model=ForecastEvolution)
def get_forecast_evolution(
    targetStartTime: str = Query(..., description="Target delivery start time in ISO format (e.g. 2026-01-15T12:00:00Z)"),
    cutoffMode: str = Query("d_minus_1_1200", description="Decision cutoff preset"),
    customTime: str = Query("12:00", description="Custom cutoff time on D-1"),
):
    """
    Inspect the evolution of forecasts published across different lead times
    for a specific delivery half-hour.
    """
    return data_manager.get_forecast_evolution(
        target_start_time=targetStartTime,
        cutoff_mode=cutoffMode,
        custom_time=customTime,
    )
