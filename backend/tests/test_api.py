"""FastAPI integration tests for all dashboard endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_api_health():
    """Verify health endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "UK Renewable Wind Forecast Dashboard" in data["app"]
    assert data["fuelhh_cache_exists"] is True
    assert data["windfor_cache_exists"] is True


def test_api_cutoff_options():
    """Verify cutoff options endpoint returns authoritative references."""
    response = client.get("/api/cutoff-options")
    assert response.status_code == 200
    options = response.json()
    assert len(options) >= 4
    cutoffs = [opt["cutoff_time"] for opt in options]
    assert "09:20" in cutoffs
    assert "09:50" in cutoffs
    assert "11:00" in cutoffs
    assert "12:00" in cutoffs


def test_api_data_default():
    """Verify default data endpoint for January 2026."""
    response = client.get("/api/data")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "timeSeries" in data
    assert "dailyAggregates" in data
    assert "audit" in data

    # Verify time series contains all 1,488 records
    assert len(data["timeSeries"]) == 1488
    assert len(data["dailyAggregates"]) == 31
    assert data["metrics"]["validPeriodsCount"] == 1488
    assert data["metrics"]["rmse"] >= data["metrics"]["mae"]


def test_api_data_date_filtered():
    """Verify filtering by single day (e.g., 2026-01-05)."""
    response = client.get("/api/data?start_date=2026-01-05&end_date=2026-01-05")
    assert response.status_code == 200
    data = response.json()
    assert len(data["timeSeries"]) == 48
    assert len(data["dailyAggregates"]) == 1
    assert data["dailyAggregates"][0]["date"] == "2026-01-05"


def test_api_metrics_only():
    """Verify lightweight metrics endpoint."""
    response = client.get("/api/metrics")
    assert response.status_code == 200
    metrics = response.json()
    assert "mae" in metrics
    assert "rmse" in metrics
    assert "meanBias" in metrics
    assert metrics["totalSettlementPeriods"] == 1488

