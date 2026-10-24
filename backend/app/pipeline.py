"""Data Processing Pipeline for Renewable Wind Forecast Dashboard.

Key responsibilities:
1. Ingest authentic Elexon FUELHH (actuals) and WINDFOR (forecasts) data.
2. Select the latest forecast published before the documented Day-Ahead decision cutoff on D-1.
3. Preserve the exact forecast publishTime for auditability.
4. Map hourly WINDFOR forecasts to 30-minute settlement periods (SP 1-48) without interpolation.
5. Compute errors and metrics with zero data fabrication.
"""

from datetime import date, datetime, timedelta, timezone
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from app.config import settings, CUTOFF_DEFINITIONS
from app.elexon_client import ElexonClient, cache_raw_dataset, load_raw_dataset_cache
from app.metrics import compute_metrics_summary, compute_daily_aggregates
from app.schemas import (
    AuditMetadata,
    DashboardDataResponse,
    DailyAggregate,
    MetricsSummary,
    PeriodRecord,
)

logger = logging.getLogger(__name__)


class WindForecastPipeline:
    """End-to-end data ingestion and alignment pipeline."""

    def __init__(self, client: Optional[ElexonClient] = None):
        self.client = client or ElexonClient()

    def get_or_fetch_fuelhh(self, start_date: str, end_date: str, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Retrieve FUELHH actual records from cache or fetch live from Elexon API."""
        cache_file = settings.FUELHH_CACHE_FILE
        if not force_refresh:
            cached = load_raw_dataset_cache(cache_file)
            if cached:
                # Verify that cache covers the requested range
                cached_dates = set(r.get("settlementDate") for r in cached)
                d_start = datetime.strptime(start_date, "%Y-%m-%d").date()
                d_end = datetime.strptime(end_date, "%Y-%m-%d").date()
                curr = d_start
                has_all = True
                while curr <= d_end:
                    if curr.strftime("%Y-%m-%d") not in cached_dates:
                        has_all = False
                        break
                    curr += timedelta(days=1)
                if has_all:
                    logger.info(f"Using cached FUELHH data ({len(cached)} records)")
                    return cached

        logger.info(f"Fetching FUELHH records live from Elexon API for {start_date} to {end_date}...")
        records = self.client.fetch_fuelhh(start_date, end_date, fuel_type="WIND")
        cache_raw_dataset(records, cache_file)
        return records

    def get_or_fetch_windfor(self, publish_start: str, publish_end: str, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Retrieve WINDFOR forecast records from cache or fetch live from Elexon API."""
        cache_file = settings.WINDFOR_CACHE_FILE
        if not force_refresh:
            cached = load_raw_dataset_cache(cache_file)
            if cached:
                logger.info(f"Using cached WINDFOR data ({len(cached)} records)")
                return cached

        logger.info(f"Fetching WINDFOR records live from Elexon API for {publish_start} to {publish_end}...")
        records = self.client.fetch_windfor(publish_start, publish_end)
        cache_raw_dataset(records, cache_file)
        return records

    @staticmethod
    def _parse_time_utc(ts_str: str) -> datetime:
        """Parse ISO 8601 UTC timestamp."""
        cleaned = ts_str.replace("Z", "+00:00")
        return datetime.fromisoformat(cleaned)

    def select_day_ahead_forecasts(
        self,
        windfor_records: List[Dict[str, Any]],
        delivery_date: date,
        cutoff_time: str = "11:00",
    ) -> Tuple[Optional[str], Dict[str, float]]:
        """
        Selects the latest forecast published on or before the Day-Ahead cutoff on D-1.
        
        Parameters:
        - windfor_records: All available WINDFOR records.
        - delivery_date: Date D of electricity delivery.
        - cutoff_time: HH:MM string in GMT/UTC (e.g., '11:00', '12:00').
        
        Returns:
        - Tuple of (chosen_publish_time, {delivery_hour_start_iso: forecast_generation_mw})
        """
        decision_date = delivery_date - timedelta(days=1)
        h, m = map(int, cutoff_time.split(":"))
        cutoff_dt = datetime(
            decision_date.year, decision_date.month, decision_date.day, h, m, 0, tzinfo=timezone.utc
        )

        delivery_date_str = delivery_date.strftime("%Y-%m-%d")

        # 1. Group records by publishTime
        by_publish_time: Dict[str, List[Dict[str, Any]]] = {}
        for r in windfor_records:
            pt = r.get("publishTime")
            if not pt:
                continue
            by_publish_time.setdefault(pt, []).append(r)

        # 2. Filter publishTimes <= cutoff_dt
        valid_publish_times = []
        for pt_str in by_publish_time.keys():
            dt = self._parse_time_utc(pt_str)
            if dt <= cutoff_dt:
                valid_publish_times.append((dt, pt_str))

        if not valid_publish_times:
            logger.warning(f"No WINDFOR forecasts published on or before {cutoff_dt} for delivery date {delivery_date}")
            return None, {}

        # 3. Select maximum (latest) publishTime strictly <= cutoff
        valid_publish_times.sort(key=lambda x: x[0])
        latest_dt, chosen_publish_time = valid_publish_times[-1]

        # 4. Extract predictions from the chosen run that target delivery_date
        records_in_run = by_publish_time[chosen_publish_time]
        hourly_forecasts: Dict[str, float] = {}
        for r in records_in_run:
            start_t = r.get("startTime", "")
            if start_t.startswith(delivery_date_str):
                gen = r.get("generation")
                if gen is not None:
                    hourly_forecasts[start_t] = float(gen)

        return chosen_publish_time, hourly_forecasts

    def build_dashboard_dataset(
        self,
        start_date: str = "2026-01-01",
        end_date: str = "2026-01-31",
        cutoff_time: str = "11:00",
        force_refresh: bool = False,
    ) -> DashboardDataResponse:
        """
        Main pipeline execution:
        - Retrieves FUELHH and WINDFOR.
        - Iterates over delivery days.
        - Aligns forecasts to half-hour settlement periods without interpolation.
        - Calculates full metrics and audit metadata.
        """
        # Determine cutoff source info
        cutoff_info = next(
            (c for c in CUTOFF_DEFINITIONS if c["cutoff_time"] == cutoff_time),
            {
                "cutoff_time": cutoff_time,
                "name": f"Custom Cutoff ({cutoff_time} GMT)",
                "source": "Custom user specification",
                "description": f"Latest WINDFOR published on D-1 prior to {cutoff_time} GMT",
            },
        )

        # Load FUELHH
        fuelhh_records = self.get_or_fetch_fuelhh(start_date, end_date, force_refresh=force_refresh)

        # Index FUELHH by (settlementDate, settlementPeriod)
        fuelhh_map: Dict[Tuple[str, int], Dict[str, Any]] = {}
        for r in fuelhh_records:
            sd = r.get("settlementDate")
            sp = r.get("settlementPeriod")
            if sd and sp:
                fuelhh_map[(sd, int(sp))] = r

        # Calculate needed WINDFOR publication window:
        # Decision for start_date is made on start_date - 1 day
        d_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        d_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        wind_pub_start = (d_start - timedelta(days=2)).strftime("%Y-%m-%d")
        wind_pub_end = (d_end + timedelta(days=1)).strftime("%Y-%m-%d")

        windfor_records = self.get_or_fetch_windfor(wind_pub_start, wind_pub_end, force_refresh=force_refresh)

        # Process each date
        aligned_records: List[PeriodRecord] = []
        distinct_runs_used = set()
        missing_actual_count = 0
        missing_forecast_count = 0

        curr_date = d_start
        while curr_date <= d_end:
            date_str = curr_date.strftime("%Y-%m-%d")
            chosen_publish_time, hourly_forecasts = self.select_day_ahead_forecasts(
                windfor_records, curr_date, cutoff_time=cutoff_time
            )
            if chosen_publish_time:
                distinct_runs_used.add(chosen_publish_time)

            # In the UK, standard days have 48 settlement periods
            for sp in range(1, 49):
                # 1. Get Actual Generation
                fuel_record = fuelhh_map.get((date_str, sp))
                actual_val = None
                is_act_missing = True
                sp_start_time = ""

                if fuel_record:
                    actual_val = float(fuel_record.get("generation", 0.0))
                    sp_start_time = fuel_record.get("startTime", "")
                    is_act_missing = False
                else:
                    missing_actual_count += 1
                    # Derive synthetic timestamp for display if record missing
                    h = (sp - 1) // 2
                    m = 30 if (sp % 2 == 0) else 0
                    sp_start_time = f"{date_str}T{h:02d}:{m:02d}:00Z"

                # 2. Get Forecast Generation:
                # Mapping Rule: Each hourly forecast covers two half-hour periods
                # sp 1 & 2 -> hour 00:00:00Z
                # sp 3 & 4 -> hour 01:00:00Z, etc.
                target_hour = (sp - 1) // 2
                hour_key = f"{date_str}T{target_hour:02d}:00:00Z"
                forecast_val = hourly_forecasts.get(hour_key)
                is_fct_missing = forecast_val is None
                if is_fct_missing:
                    missing_forecast_count += 1

                # 3. Compute Errors if both are present
                error_val = None
                abs_err = None
                sq_err = None
                if actual_val is not None and forecast_val is not None:
                    error_val = round(forecast_val - actual_val, 2)
                    abs_err = round(abs(error_val), 2)
                    sq_err = round(error_val ** 2, 2)

                aligned_records.append(
                    PeriodRecord(
                        settlementDate=date_str,
                        settlementPeriod=sp,
                        startTime=sp_start_time,
                        actualGeneration=actual_val,
                        forecastGeneration=forecast_val,
                        forecastPublishTime=chosen_publish_time,
                        error=error_val,
                        absError=abs_err,
                        squaredError=sq_err,
                        isForecastMissing=is_fct_missing,
                        isActualMissing=is_act_missing,
                    )
                )

            curr_date += timedelta(days=1)

        # Compute summary metrics and daily aggregates
        metrics_summary = compute_metrics_summary(aligned_records)
        daily_aggregates = compute_daily_aggregates(aligned_records)

        audit_meta = AuditMetadata(
            elexonBaseUrl=settings.ELEXON_BASE_URL,
            datasetActual="FUELHH (fuelType=WIND)",
            datasetForecast="WINDFOR",
            cutoffTimeUsed=f"{cutoff_time} GMT on D-1",
            cutoffSource=f"{cutoff_info['name']} ({cutoff_info['source']})",
            timeResolution="30-minute delivery periods (SP 1-48)",
            forecastMappingRule="Hourly WINDFOR forecast mapped identically to both 30-min settlement periods without interpolation",
            totalPeriodsQueried=len(aligned_records),
            missingActualPeriods=missing_actual_count,
            missingForecastPeriods=missing_forecast_count,
            distinctForecastRunsUsed=len(distinct_runs_used),
            assumptions=[
                f"Day-Ahead decision cutoff set to {cutoff_time} GMT on day D-1 based on {cutoff_info['source']}.",
                "Preserved exact publishTime and selected the latest WINDFOR run available prior to cutoff.",
                "Actual generation retained at native half-hourly resolution (FUELHH).",
                "WINDFOR hourly forecasts mapped directly to both corresponding 30-minute settlement periods without artificial interpolation.",
                "Error defined as Forecast - Actual (positive indicates over-forecast bias).",
                "Energy in MWh computed as sum(MW * 0.5 hours).",
            ],
        )

        return DashboardDataResponse(
            metrics=metrics_summary,
            timeSeries=aligned_records,
            dailyAggregates=daily_aggregates,
            audit=audit_meta,
        )


pipeline = WindForecastPipeline()
