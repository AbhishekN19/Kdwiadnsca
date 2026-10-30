import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["isDataLoaded"] is True
    assert data["totalActuals"] > 0
    assert data["totalForecasts"] > 0

def test_dates_endpoint():
    response = client.get("/api/dates")
    assert response.status_code == 200
    data = response.json()
    assert data["minDate"] == "2026-01-01"
    assert data["maxDate"] == "2026-01-31"
    assert data["totalDays"] == 31

def test_comparison_endpoint():
    response = client.get("/api/comparison?dateFrom=2026-01-15&dateTo=2026-01-15&cutoffMode=d_minus_1_1200")
    assert response.status_code == 200
    data = response.json()
    assert data["dateFrom"] == "2026-01-15"
    assert data["dateTo"] == "2026-01-15"
    assert len(data["records"]) > 0
    assert "metrics" in data
    assert data["metrics"]["mae"] > 0
    assert data["metrics"]["rmse"] > 0
    assert "distribution" in data
    assert len(data["distribution"]) > 0

def test_summary_endpoint():
    response = client.get("/api/summary?dateFrom=2026-01-01&dateTo=2026-01-31")
    assert response.status_code == 200
    data = response.json()
    assert data["totalPeriods"] > 0
    assert data["totalDays"] == 31
    assert "bestDay" in data
    assert "worstDay" in data
    assert data["metrics"]["mae"] > 0

def test_daily_accuracy_endpoint():
    response = client.get("/api/daily-accuracy?dateFrom=2026-01-01&dateTo=2026-01-31")
    assert response.status_code == 200
    days = response.json()
    assert len(days) == 31
    assert days[0]["date"] == "2026-01-01"
    assert days[-1]["date"] == "2026-01-31"

def test_intraday_profile_endpoint():
    response = client.get("/api/intraday-profile?dateFrom=2026-01-01&dateTo=2026-01-31")
    assert response.status_code == 200
    profiles = response.json()
    assert len(profiles) == 48  # 48 settlement periods in a UK trading day
    assert profiles[0]["settlementPeriod"] == 1
    assert profiles[-1]["settlementPeriod"] == 48

def test_forecast_evolution_endpoint():
    response = client.get("/api/forecast-evolution?targetStartTime=2026-01-15T12:00:00Z")
    assert response.status_code == 200
    data = response.json()
    assert data["targetStartTime"] == "2026-01-15T12:00:00Z"
    assert len(data["revisions"]) > 0
    assert any(r["isCutoffSelected"] for r in data["revisions"])
