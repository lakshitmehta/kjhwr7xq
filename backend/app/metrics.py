"""Statistical Metrics Engine for Wind Generation Forecast Evaluation.

Formulas:
- Error: e_t = Forecast_t - Actual_t (MW)
  * Positive bias (>0): Over-forecasting (forecasted more wind than generated).
  * Negative bias (<0): Under-forecasting (forecasted less wind than generated).
- Mean Absolute Error (MAE): (1 / N) * sum(|Forecast_t - Actual_t|)
- Root Mean Squared Error (RMSE): sqrt((1 / N) * sum((Forecast_t - Actual_t)^2))
- Mean Forecast Bias: (1 / N) * sum(Forecast_t - Actual_t)
- Weighted Absolute Percentage Error (WAPE): sum(|e_t|) / sum(Actual_t) * 100%
- Total Energy (MWh): sum(MW * 0.5 h) (since each settlement period is 30 minutes)
"""

import math
from typing import List, Optional
import numpy as np
import pandas as pd

from app.schemas import MetricsSummary, DailyAggregate, PeriodRecord


def compute_metrics_summary(records: List[PeriodRecord]) -> MetricsSummary:
    """
    Computes global validation metrics from a list of 30-minute settlement period records.
    Filters out any records where either Actual or Forecast is missing.
    """
    total_periods = len(records)
    valid_records = [
        r for r in records
        if r.actualGeneration is not None and r.forecastGeneration is not None
    ]
    valid_count = len(valid_records)
    missing_count = total_periods - valid_count
    completeness = (valid_count / total_periods * 100.0) if total_periods > 0 else 0.0

    if valid_count == 0:
        return MetricsSummary(
            mae=0.0,
            rmse=0.0,
            meanBias=0.0,
            wape=0.0,
            totalActualMWh=0.0,
            totalForecastMWh=0.0,
            meanActualMW=0.0,
            meanForecastMW=0.0,
            peakActualMW=0.0,
            peakForecastMW=0.0,
            totalSettlementPeriods=total_periods,
            validPeriodsCount=0,
            missingPeriodsCount=missing_count,
            completenessPercent=completeness,
        )

    actuals = np.array([r.actualGeneration for r in valid_records], dtype=float)
    forecasts = np.array([r.forecastGeneration for r in valid_records], dtype=float)

    # Error vector: Forecast - Actual
    errors = forecasts - actuals
    abs_errors = np.abs(errors)
    squared_errors = np.square(errors)

    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(squared_errors)))
    mean_bias = float(np.mean(errors))

    sum_actuals = float(np.sum(actuals))
    sum_abs_errors = float(np.sum(abs_errors))
    wape = (sum_abs_errors / sum_actuals * 100.0) if sum_actuals > 0 else 0.0

    # 30-minute delivery periods: Power (MW) * 0.5 hours = Energy (MWh)
    total_actual_mwh = float(np.sum(actuals) * 0.5)
    total_forecast_mwh = float(np.sum(forecasts) * 0.5)

    mean_actual_mw = float(np.mean(actuals))
    mean_forecast_mw = float(np.mean(forecasts))
    peak_actual_mw = float(np.max(actuals))
    peak_forecast_mw = float(np.max(forecasts))

    return MetricsSummary(
        mae=round(mae, 2),
        rmse=round(rmse, 2),
        meanBias=round(mean_bias, 2),
        wape=round(wape, 2),
        totalActualMWh=round(total_actual_mwh, 2),
        totalForecastMWh=round(total_forecast_mwh, 2),
        meanActualMW=round(mean_actual_mw, 2),
        meanForecastMW=round(mean_forecast_mw, 2),
        peakActualMW=round(peak_actual_mw, 2),
        peakForecastMW=round(peak_forecast_mw, 2),
        totalSettlementPeriods=total_periods,
        validPeriodsCount=valid_count,
        missingPeriodsCount=missing_count,
        completenessPercent=round(completeness, 2),
    )


def compute_daily_aggregates(records: List[PeriodRecord]) -> List[DailyAggregate]:
    """Computes daily aggregates and metrics across each day in the dataset."""
    df = pd.DataFrame([r.model_dump() for r in records])
    if df.empty:
        return []

    daily_results = []
    grouped = df.groupby("settlementDate")

    for dt, group in grouped:
        valid_grp = group.dropna(subset=["actualGeneration", "forecastGeneration"])
        if valid_grp.empty:
            daily_results.append(
                DailyAggregate(
                    date=str(dt),
                    meanActualMW=0.0,
                    meanForecastMW=0.0,
                    totalActualMWh=0.0,
                    totalForecastMWh=0.0,
                    mae=0.0,
                    rmse=0.0,
                    meanBias=0.0,
                    peakActualMW=0.0,
                    peakForecastMW=0.0,
                    publishTimes=[],
                )
            )
            continue

        acts = valid_grp["actualGeneration"].to_numpy(dtype=float)
        fcts = valid_grp["forecastGeneration"].to_numpy(dtype=float)
        diff = fcts - acts

        mae = float(np.mean(np.abs(diff)))
        rmse = float(np.sqrt(np.mean(np.square(diff))))
        bias = float(np.mean(diff))

        publish_times = sorted(
            list(set(valid_grp["forecastPublishTime"].dropna().astype(str).tolist()))
        )

        daily_results.append(
            DailyAggregate(
                date=str(dt),
                meanActualMW=round(float(np.mean(acts)), 2),
                meanForecastMW=round(float(np.mean(fcts)), 2),
                totalActualMWh=round(float(np.sum(acts) * 0.5), 2),
                totalForecastMWh=round(float(np.sum(fcts) * 0.5), 2),
                mae=round(mae, 2),
                rmse=round(rmse, 2),
                meanBias=round(bias, 2),
                peakActualMW=round(float(np.max(acts)), 2),
                peakForecastMW=round(float(np.max(fcts)), 2),
                publishTimes=publish_times,
            )
        )

    daily_results.sort(key=lambda d: d.date)
    return daily_results

