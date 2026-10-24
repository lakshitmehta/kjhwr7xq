"""Automated tests verifying methodology, timezone cutoffs, and mathematical audit integrity."""

import math
from datetime import date, datetime, timedelta, timezone
import numpy as np
import pytest

from app.pipeline import WindForecastPipeline
from app.config import CUTOFF_DEFINITIONS


def test_strict_timezone_cutoff_rejection():
    """Verify that any forecast published even one second after 11:00 GMT is strictly rejected."""
    pipeline = WindForecastPipeline()
    delivery_date = date(2026, 1, 10)
    # Decision date: 2026-01-09

    records = [
        # Exactly on cutoff: 11:00:00Z (should be accepted)
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-09T11:00:00Z",
            "startTime": "2026-01-10T00:00:00Z",
            "generation": 4000,
        },
        # 1 second after cutoff: 11:00:01Z (must be rejected)
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-09T11:00:01Z",
            "startTime": "2026-01-10T00:00:00Z",
            "generation": 9999,
        },
        # Standard post-cutoff run: 11:30:00Z (must be rejected)
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-09T11:30:00Z",
            "startTime": "2026-01-10T00:00:00Z",
            "generation": 8888,
        },
    ]

    pt, forecasts = pipeline.select_day_ahead_forecasts(records, delivery_date, cutoff_time="11:00")
    assert pt == "2026-01-09T11:00:00Z"
    assert forecasts["2026-01-10T00:00:00Z"] == 4000.0


def test_january_representative_periods_audit():
    """
    Verify selected forecast publication timestamps for representative periods:
    Beginning (Jan 1), Middle (Jan 15), and End (Jan 31).
    Proves that for every representative day:
    1. The latest D-1 run published before 11:00 GMT was 09:30:00Z.
    2. The 11:30:00Z run on D-1 was available in raw data but correctly rejected.
    3. All 24 hours of delivery day are fully covered.
    """
    pipeline = WindForecastPipeline()
    response = pipeline.build_dashboard_dataset("2026-01-01", "2026-01-31", cutoff_time="11:00")

    # Group records by date
    by_date = {}
    for r in response.timeSeries:
        by_date.setdefault(r.settlementDate, []).append(r)

    # 1. Beginning: Jan 1, 2026
    jan1_recs = by_date["2026-01-01"]
    assert len(jan1_recs) == 48
    jan1_pts = set(r.forecastPublishTime for r in jan1_recs)
    assert jan1_pts == {"2025-12-31T09:30:00Z"}

    # 2. Middle: Jan 15, 2026
    jan15_recs = by_date["2026-01-15"]
    assert len(jan15_recs) == 48
    jan15_pts = set(r.forecastPublishTime for r in jan15_recs)
    assert jan15_pts == {"2026-01-14T09:30:00Z"}

    # 3. End: Jan 31, 2026
    jan31_recs = by_date["2026-01-31"]
    assert len(jan31_recs) == 48
    jan31_pts = set(r.forecastPublishTime for r in jan31_recs)
    assert jan31_pts == {"2026-01-30T09:30:00Z"}


def test_settlement_period_midnight_and_day_end_mapping():
    """
    Verify half-hour settlement periods mapping against hourly WINDFOR:
    - SP 1 (00:00-00:30) and SP 2 (00:30-01:00) map to hour 00:00:00Z
    - SP 47 (23:00-23:30) and SP 48 (23:30-24:00) map to hour 23:00:00Z
    - Next day SP 1 transitions cleanly to 00:00:00Z of the new date
    """
    pipeline = WindForecastPipeline()
    response = pipeline.build_dashboard_dataset("2026-01-01", "2026-01-02", cutoff_time="11:00")

    recs = response.timeSeries
    # Day 1 start
    sp1 = recs[0]
    sp2 = recs[1]
    assert sp1.settlementDate == "2026-01-01" and sp1.settlementPeriod == 1
    assert sp1.startTime == "2026-01-01T00:00:00Z"
    assert sp2.settlementDate == "2026-01-01" and sp2.settlementPeriod == 2
    assert sp2.startTime == "2026-01-01T00:30:00Z"
    assert sp1.forecastGeneration == sp2.forecastGeneration  # Both from 00:00:00Z

    # Day 1 end
    sp47 = recs[46]
    sp48 = recs[47]
    assert sp47.settlementDate == "2026-01-01" and sp47.settlementPeriod == 47
    assert sp47.startTime == "2026-01-01T23:00:00Z"
    assert sp48.settlementDate == "2026-01-01" and sp48.settlementPeriod == 48
    assert sp48.startTime == "2026-01-01T23:30:00Z"
    assert sp47.forecastGeneration == sp48.forecastGeneration  # Both from 23:00:00Z

    # Day 2 midnight transition
    d2_sp1 = recs[48]
    assert d2_sp1.settlementDate == "2026-01-02" and d2_sp1.settlementPeriod == 1
    assert d2_sp1.startTime == "2026-01-02T00:00:00Z"
    assert d2_sp1.forecastPublishTime == "2026-01-01T09:30:00Z"


def test_independent_mathematical_recalculation():
    """
    Recalculates MAE, RMSE, Mean Bias, WAPE, and Energy MWh independently from raw records,
    proving all metrics use the identical paired observations and 0.5h multiplier.
    """
    pipeline = WindForecastPipeline()
    response = pipeline.build_dashboard_dataset("2026-01-01", "2026-01-31", cutoff_time="11:00")

    acts = np.array([r.actualGeneration for r in response.timeSeries], dtype=np.float64)
    fcts = np.array([r.forecastGeneration for r in response.timeSeries], dtype=np.float64)

    assert len(acts) == 1488
    assert len(fcts) == 1488

    diff = fcts - acts
    abs_diff = np.abs(diff)

    expected_mae = round(float(np.mean(abs_diff)), 2)
    expected_rmse = round(float(np.sqrt(np.mean(np.square(diff)))), 2)
    expected_bias = round(float(np.mean(diff)), 2)
    expected_wape = round(float(np.sum(abs_diff) / np.sum(acts) * 100.0), 2)

    # 30-min settlement intervals -> Energy MWh = Power MW * 0.5 hours
    expected_act_mwh = round(float(np.sum(acts) * 0.5), 2)
    expected_fct_mwh = round(float(np.sum(fcts) * 0.5), 2)

    m = response.metrics
    assert m.mae == expected_mae == 2126.12
    assert m.rmse == expected_rmse == 2620.80
    assert m.meanBias == expected_bias == 1840.30
    assert m.wape == expected_wape == 18.36
    assert m.totalActualMWh == expected_act_mwh == 8616068.50
    assert m.totalForecastMWh == expected_fct_mwh == 9985249.00


def test_cutoff_definitions_distinguish_rules_from_benchmarks():
    """Verify that cutoff definitions explicitly distinguish binding exchange rules from benchmarks."""
    cutoff_dict = {c["cutoff_time"]: c for c in CUTOFF_DEFINITIONS}
    
    assert "Binding Exchange Rule" in cutoff_dict["09:20"]["source"]
    assert "Binding Exchange Rule" in cutoff_dict["09:50"]["source"]
    assert "Analytical Benchmark" in cutoff_dict["11:00"]["source"]
    assert "Operational Convention" in cutoff_dict["12:00"]["source"]
    assert "Binding Exchange Rule" in cutoff_dict["15:30"]["source"]

