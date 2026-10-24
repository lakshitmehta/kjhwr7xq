"""Unit tests for statistical metrics calculations (MAE, RMSE, Bias, Energy MWh)."""

import pytest
import numpy as np

from app.metrics import compute_metrics_summary, compute_daily_aggregates
from app.schemas import PeriodRecord


def test_metrics_known_values():
    """Verify metrics against hand-calculated analytical values."""
    # Actual:   [100.0, 200.0, 300.0, 400.0]
    # Forecast: [120.0, 180.0, 330.0, 360.0]
    # Errors (Forecast - Actual): [+20.0, -20.0, +30.0, -40.0]
    # Abs Errors: [20.0, 20.0, 30.0, 40.0] -> MAE = 110 / 4 = 27.5 MW
    # Squared Errors: [400, 400, 900, 1600] -> Mean = 3300 / 4 = 825.0 -> RMSE = sqrt(825) ≈ 28.7228 MW
    # Bias: (+20 - 20 + 30 - 40) / 4 = -10 / 4 = -2.5 MW
    # Actual Sum: 1000 MW -> Total Actual Energy: 1000 * 0.5 = 500.0 MWh
    # Forecast Sum: 990 MW -> Total Forecast Energy: 990 * 0.5 = 495.0 MWh
    records = [
        PeriodRecord(
            settlementDate="2026-01-01",
            settlementPeriod=1,
            startTime="2026-01-01T00:00:00Z",
            actualGeneration=100.0,
            forecastGeneration=120.0,
        ),
        PeriodRecord(
            settlementDate="2026-01-01",
            settlementPeriod=2,
            startTime="2026-01-01T00:30:00Z",
            actualGeneration=200.0,
            forecastGeneration=180.0,
        ),
        PeriodRecord(
            settlementDate="2026-01-01",
            settlementPeriod=3,
            startTime="2026-01-01T01:00:00Z",
            actualGeneration=300.0,
            forecastGeneration=330.0,
        ),
        PeriodRecord(
            settlementDate="2026-01-01",
            settlementPeriod=4,
            startTime="2026-01-01T01:30:00Z",
            actualGeneration=400.0,
            forecastGeneration=360.0,
        ),
    ]

    metrics = compute_metrics_summary(records)

    assert metrics.mae == 27.5
    assert metrics.rmse == pytest.approx(28.72, abs=0.01)
    assert metrics.meanBias == -2.5
    assert metrics.totalActualMWh == 500.0
    assert metrics.totalForecastMWh == 495.0
    assert metrics.peakActualMW == 400.0
    assert metrics.peakForecastMW == 360.0
    assert metrics.validPeriodsCount == 4
    assert metrics.missingPeriodsCount == 0
    assert metrics.completenessPercent == 100.0


def test_positive_and_negative_bias():
    """Verify sign convention: positive means over-forecasting, negative means under-forecasting."""
    # Over-forecasting
    over_records = [
        PeriodRecord(
            settlementDate="2026-01-01",
            settlementPeriod=1,
            startTime="2026-01-01T00:00:00Z",
            actualGeneration=100.0,
            forecastGeneration=150.0,  # +50
        )
    ]
    over_metrics = compute_metrics_summary(over_records)
    assert over_metrics.meanBias == 50.0
    assert over_metrics.mae == 50.0

    # Under-forecasting
    under_records = [
        PeriodRecord(
            settlementDate="2026-01-01",
            settlementPeriod=1,
            startTime="2026-01-01T00:00:00Z",
            actualGeneration=150.0,
            forecastGeneration=100.0,  # -50
        )
    ]
    under_metrics = compute_metrics_summary(under_records)
    assert under_metrics.meanBias == -50.0
    assert under_metrics.mae == 50.0


def test_handling_missing_data():
    """Verify pipeline handles missing actuals and missing forecasts transparently."""
    records = [
        PeriodRecord(
            settlementDate="2026-01-01",
            settlementPeriod=1,
            startTime="2026-01-01T00:00:00Z",
            actualGeneration=100.0,
            forecastGeneration=120.0,
        ),
        PeriodRecord(
            settlementDate="2026-01-01",
            settlementPeriod=2,
            startTime="2026-01-01T00:30:00Z",
            actualGeneration=None,  # missing actual
            forecastGeneration=180.0,
            isActualMissing=True,
        ),
        PeriodRecord(
            settlementDate="2026-01-01",
            settlementPeriod=3,
            startTime="2026-01-01T01:00:00Z",
            actualGeneration=200.0,
            forecastGeneration=None,  # missing forecast
            isForecastMissing=True,
        ),
    ]

    metrics = compute_metrics_summary(records)
    assert metrics.totalSettlementPeriods == 3
    assert metrics.validPeriodsCount == 1
    assert metrics.missingPeriodsCount == 2
    assert metrics.completenessPercent == pytest.approx(33.33, abs=0.01)
    assert metrics.mae == 20.0
    assert metrics.meanBias == 20.0


def test_daily_aggregates():
    """Verify daily aggregate calculation."""
    records = [
        PeriodRecord(
            settlementDate="2026-01-01",
            settlementPeriod=1,
            startTime="2026-01-01T00:00:00Z",
            actualGeneration=100.0,
            forecastGeneration=120.0,
            forecastPublishTime="2025-12-31T09:30:00Z",
        ),
        PeriodRecord(
            settlementDate="2026-01-02",
            settlementPeriod=1,
            startTime="2026-01-02T00:00:00Z",
            actualGeneration=200.0,
            forecastGeneration=250.0,
            forecastPublishTime="2026-01-01T09:30:00Z",
        ),
    ]

    daily = compute_daily_aggregates(records)
    assert len(daily) == 2
    assert daily[0].date == "2026-01-01"
    assert daily[0].mae == 20.0
    assert daily[0].publishTimes == ["2025-12-31T09:30:00Z"]
    assert daily[1].date == "2026-01-02"
    assert daily[1].mae == 50.0

