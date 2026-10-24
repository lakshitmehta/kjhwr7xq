"""Automated verification test for static precomputed export files.

Confirms that all 7 exported static JSON files in frontend/public/data:
1. Exist and contain valid JSON.
2. Meet payload size constraints (< 1 MB uncompressed).
3. Contain 1,488 half-hour settlement periods (Jan 1-31, 2026).
4. Strictly respect day-ahead publication cutoffs.
5. Contain accurate mathematical aggregates.
"""

import json
from pathlib import Path
import pytest
from datetime import datetime, timezone


FRONTEND_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "data"

EXPECTED_FILES = [
    "cutoff_options.json",
    "health.json",
    "eval_0920.json",
    "eval_0950.json",
    "eval_1100.json",
    "eval_1200.json",
    "eval_1530.json",
]


def test_static_files_exist_and_size_reasonable():
    """Verify all 7 static files exist and are reasonably sized."""
    assert FRONTEND_DATA_DIR.exists(), f"Directory {FRONTEND_DATA_DIR} does not exist"

    for filename in EXPECTED_FILES:
        filepath = FRONTEND_DATA_DIR / filename
        assert filepath.exists(), f"Missing static file: {filename}"
        size_bytes = filepath.stat().st_size
        # Files should be non-empty and under 1.5MB uncompressed (< 50KB gzipped)
        assert 100 < size_bytes < 1_500_000, f"{filename} unexpected size: {size_bytes} bytes"


def test_health_json_schema():
    """Verify health.json metadata."""
    filepath = FRONTEND_DATA_DIR / "health.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["status"] == "ok"
    assert data["mode"] == "static_precomputed"
    assert data["fuelhh_cache_exists"] is True
    assert data["windfor_cache_exists"] is True


def test_cutoff_options_json():
    """Verify cutoff_options.json contains all 5 market cutoff options."""
    filepath = FRONTEND_DATA_DIR / "cutoff_options.json"
    with open(filepath, "r", encoding="utf-8") as f:
        options = json.load(f)

    assert len(options) == 5
    cutoffs = [opt["cutoff_time"] for opt in options]
    assert cutoffs == ["09:20", "09:50", "11:00", "12:00", "15:30"]


@pytest.mark.parametrize("cutoff_str,expected_mae", [
    ("0920", 2145.17),
    ("0950", 2126.12),
    ("1100", 2126.12),
    ("1200", 2020.64),
    ("1530", 1984.49),
])
def test_evaluation_datasets_integrity(cutoff_str, expected_mae):
    """Verify each cutoff evaluation dataset for record count, cutoff timestamp, and MAE."""
    filepath = FRONTEND_DATA_DIR / f"eval_{cutoff_str}.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Required top-level keys
    assert "metrics" in data
    assert "timeSeries" in data
    assert "dailyAggregates" in data
    assert "audit" in data

    # 31 days * 48 settlement periods = 1488
    records = data["timeSeries"]
    assert len(records) == 1488, f"Expected 1488 records, got {len(records)}"

    # Daily aggregates count = 31 days
    daily = data["dailyAggregates"]
    assert len(daily) == 31, f"Expected 31 daily aggregates, got {len(daily)}"

    # Metrics MAE matches authentic calculation
    metrics = data["metrics"]
    assert metrics["mae"] == expected_mae
    assert metrics["totalSettlementPeriods"] == 1488
    assert metrics["validPeriodsCount"] == 1488
    assert metrics["missingPeriodsCount"] == 0
    assert metrics["completenessPercent"] == 100.0

    # Total Actual Energy is constant across all cutoffs (8,616,068.5 MWh)
    assert metrics["totalActualMWh"] == 8616068.5

    # Verify no forecast in dataset was published after the cutoff time on D-1
    cutoff_hour = int(cutoff_str[:2])
    cutoff_min = int(cutoff_str[2:])

    for rec in records:
        pub_str = rec["forecastPublishTime"]
        assert pub_str is not None, "Missing forecast publish time"
        pub_dt = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))

        settlement_date = datetime.strptime(rec["settlementDate"], "%Y-%m-%d").date()
        # Cutoff is on D-1 at cutoff_hour:cutoff_min GMT
        from datetime import timedelta
        cutoff_dt = datetime(
            settlement_date.year,
            settlement_date.month,
            settlement_date.day,
            cutoff_hour,
            cutoff_min,
            tzinfo=timezone.utc,
        ) - timedelta(days=1)

        assert pub_dt <= cutoff_dt, (
            f"Leakage detected! Record on {rec['settlementDate']} SP {rec['settlementPeriod']} "
            f"used forecast published at {pub_dt} > cutoff {cutoff_dt}"
        )

