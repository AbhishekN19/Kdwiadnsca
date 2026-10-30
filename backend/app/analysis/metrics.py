import math
from typing import List, Tuple, Optional
from ..models.schemas import AccuracyMetrics, ErrorBin

def calculate_mae(errors: List[float]) -> float:
    """Mean Absolute Error (MW): average magnitude of errors."""
    if not errors:
        return 0.0
    return sum(abs(e) for e in errors) / len(errors)

def calculate_rmse(errors: List[float]) -> float:
    """Root Mean Square Error (MW): penalizes larger deviations heavily."""
    if not errors:
        return 0.0
    mean_sq = sum(e ** 2 for e in errors) / len(errors)
    return math.sqrt(mean_sq)

def calculate_mbe(errors: List[float]) -> float:
    """
    Mean Bias Error (MW): indicates directional tendency.
    Positive = Systemic Overestimation (Forecast > Actual)
    Negative = Systemic Underestimation (Forecast < Actual)
    """
    if not errors:
        return 0.0
    return sum(errors) / len(errors)

def calculate_nmae(mae: float, avg_actual: float) -> float:
    """Normalized MAE as percentage of average actual generation."""
    if avg_actual <= 0:
        return 0.0
    return (mae / avg_actual) * 100.0

def calculate_mape(actuals: List[float], forecasts: List[float], min_actual_threshold: float = 100.0) -> Optional[float]:
    """
    Mean Absolute Percentage Error (%).
    Filters out near-zero actuals to prevent mathematical distortion.
    """
    valid_pairs = [(a, f) for a, f in zip(actuals, forecasts) if a >= min_actual_threshold]
    if not valid_pairs:
        return None
    pct_errors = [abs(f - a) / a for a, f in valid_pairs]
    return (sum(pct_errors) / len(pct_errors)) * 100.0

def calculate_pearson_correlation(actuals: List[float], forecasts: List[float]) -> Optional[float]:
    """Pearson correlation coefficient r between actual and forecast series."""
    n = len(actuals)
    if n < 2:
        return None
    mean_a = sum(actuals) / n
    mean_f = sum(forecasts) / n

    numerator = sum((a - mean_a) * (f - mean_f) for a, f in zip(actuals, forecasts))
    var_a = sum((a - mean_a) ** 2 for a in actuals)
    var_f = sum((f - mean_f) ** 2 for f in forecasts)

    denominator = math.sqrt(var_a * var_f)
    if denominator == 0:
        return 0.0
    return numerator / denominator

def calculate_accuracy_metrics(actuals: List[float], forecasts: List[float]) -> AccuracyMetrics:
    """Calculate comprehensive suite of quantitative forecast accuracy metrics."""
    if not actuals or not forecasts or len(actuals) != len(forecasts):
        return AccuracyMetrics(
            count=0,
            mae=0.0,
            rmse=0.0,
            mbe=0.0,
            nmae=0.0,
            mape=None,
            maxPositiveError=0.0,
            maxNegativeError=0.0,
            correlation=None,
            avgActual=0.0,
            avgForecast=0.0,
        )

    errors = [f - a for a, f in zip(actuals, forecasts)]
    mae = calculate_mae(errors)
    rmse = calculate_rmse(errors)
    mbe = calculate_mbe(errors)
    avg_actual = sum(actuals) / len(actuals)
    avg_forecast = sum(forecasts) / len(forecasts)
    nmae = calculate_nmae(mae, avg_actual)
    mape = calculate_mape(actuals, forecasts)
    correlation = calculate_pearson_correlation(actuals, forecasts)

    max_positive = max(errors) if errors else 0.0
    max_negative = min(errors) if errors else 0.0

    return AccuracyMetrics(
        count=len(actuals),
        mae=round(mae, 2),
        rmse=round(rmse, 2),
        mbe=round(mbe, 2),
        nmae=round(nmae, 2),
        mape=round(mape, 2) if mape is not None else None,
        maxPositiveError=round(max_positive, 2),
        maxNegativeError=round(max_negative, 2),
        correlation=round(correlation, 4) if correlation is not None else None,
        avgActual=round(avg_actual, 2),
        avgForecast=round(avg_forecast, 2),
    )

def calculate_error_distribution(errors: List[float]) -> List[ErrorBin]:
    """Group signed errors into intuitive power trading MW distribution bins."""
    if not errors:
        return []

    # Standard utility error bins for UK wind scale (0 to 25,000 MW system)
    brackets = [
        ("< -3000 MW", -float("inf"), -3000),
        ("-3000 to -2000 MW", -3000, -2000),
        ("-2000 to -1000 MW", -2000, -1000),
        ("-1000 to -500 MW", -1000, -500),
        ("-500 to 0 MW", -500, 0),
        ("0 to +500 MW", 0, 500),
        ("+500 to +1000 MW", 500, 1000),
        ("+1000 to +2000 MW", 1000, 2000),
        ("+2000 to +3000 MW", 2000, 3000),
        ("> +3000 MW", 3000, float("inf")),
    ]

    total = len(errors)
    bins = []
    for label, min_val, max_val in brackets:
        if max_val == float("inf"):
            cnt = sum(1 for e in errors if e >= min_val)
        elif min_val == -float("inf"):
            cnt = sum(1 for e in errors if e < max_val)
        else:
            cnt = sum(1 for e in errors if min_val <= e < max_val)
        
        pct = (cnt / total) * 100.0 if total > 0 else 0.0
        bins.append(
            ErrorBin(
                rangeLabel=label,
                minMW=min_val if min_val != -float("inf") else -99999.0,
                maxMW=max_val if max_val != float("inf") else 99999.0,
                count=cnt,
                percentage=round(pct, 2),
            )
        )

    return bins
