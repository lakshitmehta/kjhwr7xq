"""Unit and integration tests for WindForecastPipeline."""

import pytest
from datetime import date

from app.pipeline import WindForecastPipeline
from app.schemas import DashboardDataResponse


def test_select_day_ahead_forecasts_cutoff_filtering():
    """Verify cutoff logic: chooses latest forecast on D-1 strictly before cutoff."""
    pipeline = WindForecastPipeline()
    delivery_date = date(2026, 1, 2)
    # Decision date is 2026-01-01

    windfor_dummy = [
        # Early run on D-1
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T07:30:00Z",
            "startTime": "2026-01-02T00:00:00Z",
            "generation": 5000,
        },
        # Valid run before 11:00 GMT on D-1
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T09:30:00Z",
            "startTime": "2026-01-02T00:00:00Z",
            "generation": 5500,
        },
        # Run published after 11:00 GMT (e.g., 11:30 GMT) on D-1
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T11:30:00Z",
            "startTime": "2026-01-02T00:00:00Z",
            "generation": 6000,
        },
        # Intraday run on day D (delivery day)
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-02T02:30:00Z",
            "startTime": "2026-01-02T00:00:00Z",
            "generation": 7000,
        },
    ]

    # Test with 11:00 cutoff: should pick 09:30:00Z (latest before 11:00)
    pt_11, forecasts_11 = pipeline.select_day_ahead_forecasts(
        windfor_dummy, delivery_date, cutoff_time="11:00"
    )
    assert pt_11 == "2026-01-01T09:30:00Z"
    assert forecasts_11["2026-01-02T00:00:00Z"] == 5500.0

    # Test with 12:00 cutoff: should pick 11:30:00Z (latest before 12:00)
    pt_12, forecasts_12 = pipeline.select_day_ahead_forecasts(
        windfor_dummy, delivery_date, cutoff_time="12:00"
    )
    assert pt_12 == "2026-01-01T11:30:00Z"
    assert forecasts_12["2026-01-02T00:00:00Z"] == 6000.0

    # Test with 08:00 cutoff: should pick 07:30:00Z (latest before 08:00)
    pt_08, forecasts_08 = pipeline.select_day_ahead_forecasts(
        windfor_dummy, delivery_date, cutoff_time="08:00"
    )
    assert pt_08 == "2026-01-01T07:30:00Z"
    assert forecasts_08["2026-01-02T00:00:00Z"] == 5000.0


def test_authentic_january_2026_dataset():
    """Integration test: processes full January 2026 authentic data and validates output schema and metrics."""
    pipeline = WindForecastPipeline()
    response = pipeline.build_dashboard_dataset(
        start_date="2026-01-01",
        end_date="2026-01-31",
        cutoff_time="11:00",
        force_refresh=False,
    )

    assert isinstance(response, DashboardDataResponse)
    
    # 31 days * 48 periods = 1,488 half-hour settlement periods
    assert response.metrics.totalSettlementPeriods == 1488
    assert response.metrics.validPeriodsCount == 1488
    assert response.metrics.missingPeriodsCount == 0
    assert response.metrics.completenessPercent == 100.0

    # Check mathematical consistency: RMSE must always be >= MAE
    assert response.metrics.rmse >= response.metrics.mae
    assert response.metrics.mae > 0.0

    # Check time series resolution: exactly 48 records for every date
    dates = [r.settlementDate for r in response.timeSeries]
    assert len(set(dates)) == 31
    assert len(response.timeSeries) == 1488

    # Check 1-to-2 mapping for period 1 and period 2 (both should have identical forecast from hour 00:00)
    for i in range(0, 1488, 2):
        sp1 = response.timeSeries[i]
        sp2 = response.timeSeries[i + 1]
        assert sp1.settlementPeriod % 2 == 1
        assert sp2.settlementPeriod % 2 == 0
        assert sp1.forecastGeneration == sp2.forecastGeneration
        assert sp1.forecastPublishTime == sp2.forecastPublishTime
        assert sp1.forecastPublishTime is not None

    # Check daily aggregates: exactly 31 days
    assert len(response.dailyAggregates) == 31
    assert response.dailyAggregates[0].date == "2026-01-01"
    assert response.dailyAggregates[-1].date == "2026-01-31"

    # Check audit metadata
    assert "11:00 GMT on D-1" in response.audit.cutoffTimeUsed
    assert response.audit.totalPeriodsQueried == 1488
    assert len(response.audit.assumptions) >= 5

