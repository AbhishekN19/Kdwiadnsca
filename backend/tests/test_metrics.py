import pytest
import math
from backend.app.analysis.metrics import (
    calculate_mae,
    calculate_rmse,
    calculate_mbe,
    calculate_nmae,
    calculate_mape,
    calculate_pearson_correlation,
    calculate_accuracy_metrics,
    calculate_error_distribution,
)

def test_metrics_with_sample_values():
    """
    Test using the prompt's illustrative example:
    Period 1: Forecast = 5000, Actual = 4800 (Error = +200)
    Period 2: Forecast = 5500, Actual = 5700 (Error = -200)
    Period 3: Forecast = 6000, Actual = 5200 (Error = +800)
    """
    actuals = [4800.0, 5700.0, 5200.0]
    forecasts = [5000.0, 5500.0, 6000.0]
    errors = [f - a for a, f in zip(actuals, forecasts)]  # [+200, -200, +800]

    # MAE = (200 + 200 + 800) / 3 = 400.0
    mae = calculate_mae(errors)
    assert pytest.approx(mae, 0.01) == 400.0

    # RMSE = sqrt((200^2 + (-200)^2 + 800^2) / 3) = sqrt(720000 / 3) = sqrt(240000) ~= 489.8979
    rmse = calculate_rmse(errors)
    assert pytest.approx(rmse, 0.01) == 489.90

    # MBE = (200 - 200 + 800) / 3 = 266.67 (systemic overestimation)
    mbe = calculate_mbe(errors)
    assert pytest.approx(mbe, 0.01) == 266.67

    # Full suite
    metrics = calculate_accuracy_metrics(actuals, forecasts)
    assert metrics.count == 3
    assert metrics.mae == 400.0
    assert metrics.rmse == 489.90
    assert metrics.mbe == 266.67
    assert metrics.maxPositiveError == 800.0
    assert metrics.maxNegativeError == -200.0

def test_perfect_forecast():
    """When forecast == actual, all error metrics should be zero and correlation 1.0."""
    actuals = [1000.0, 2000.0, 3000.0]
    forecasts = [1000.0, 2000.0, 3000.0]
    metrics = calculate_accuracy_metrics(actuals, forecasts)
    assert metrics.mae == 0.0
    assert metrics.rmse == 0.0
    assert metrics.mbe == 0.0
    assert metrics.nmae == 0.0
    assert metrics.correlation == 1.0

def test_negative_bias():
    """Test consistent underestimation (Forecast < Actual)."""
    actuals = [5000.0, 6000.0, 7000.0]
    forecasts = [4500.0, 5500.0, 6500.0]
    metrics = calculate_accuracy_metrics(actuals, forecasts)
    assert metrics.mae == 500.0
    assert metrics.rmse == 500.0
    assert metrics.mbe == -500.0  # Signed negative

def test_empty_inputs():
    """Empty arrays should return safe default metrics without crashing."""
    metrics = calculate_accuracy_metrics([], [])
    assert metrics.count == 0
    assert metrics.mae == 0.0
    assert metrics.rmse == 0.0
    assert metrics.mbe == 0.0

def test_error_distribution():
    """Error distribution bins correctly categorizes errors."""
    errors = [-3500.0, -1500.0, -200.0, 300.0, 1200.0, 4500.0]
    bins = calculate_error_distribution(errors)
    assert len(bins) > 0
    total_count = sum(b.count for b in bins)
    assert total_count == len(errors)
