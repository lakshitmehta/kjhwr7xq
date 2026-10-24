"""Pydantic schemas for data serialization and API validation."""

from typing import List, Optional
from pydantic import BaseModel, Field


class PeriodRecord(BaseModel):
    """Single 30-minute settlement period record."""
    settlementDate: str = Field(..., description="Delivery date (YYYY-MM-DD)")
    settlementPeriod: int = Field(..., ge=1, le=50, description="Settlement period (1-48, up to 50 on clock-change days)")
    startTime: str = Field(..., description="Start timestamp of the delivery period (ISO 8601 UTC)")
    actualGeneration: Optional[float] = Field(None, description="Actual wind generation outturn in MW (from FUELHH)")
    forecastGeneration: Optional[float] = Field(None, description="Forecast wind generation in MW (from WINDFOR)")
    forecastPublishTime: Optional[str] = Field(None, description="Preserved publication timestamp of chosen forecast (ISO 8601 UTC)")
    error: Optional[float] = Field(None, description="Forecast error in MW: Forecast - Actual")
    absError: Optional[float] = Field(None, description="Absolute error in MW: |Forecast - Actual|")
    squaredError: Optional[float] = Field(None, description="Squared error in MW^2: (Forecast - Actual)^2")
    isForecastMissing: bool = Field(False, description="Flag indicating if forecast was missing for this period")
    isActualMissing: bool = Field(False, description="Flag indicating if actual generation was missing for this period")


class DailyAggregate(BaseModel):
    """Daily summary metrics for time-series charts and aggregations."""
    date: str
    meanActualMW: float
    meanForecastMW: float
    totalActualMWh: float
    totalForecastMWh: float
    mae: float
    rmse: float
    meanBias: float
    peakActualMW: float
    peakForecastMW: float
    publishTimes: List[str] = []


class MetricsSummary(BaseModel):
    """Global evaluation metrics for the selected time window."""
    mae: float = Field(..., description="Mean Absolute Error in MW")
    rmse: float = Field(..., description="Root Mean Squared Error in MW")
    meanBias: float = Field(..., description="Mean Forecast Bias in MW (Forecast - Actual). Positive means over-forecast.")
    wape: float = Field(..., description="Weighted Absolute Percentage Error: sum(|error|) / sum(actual) * 100")
    totalActualMWh: float = Field(..., description="Total actual energy delivered in MWh (sum of MW * 0.5h)")
    totalForecastMWh: float = Field(..., description="Total forecasted energy in MWh (sum of MW * 0.5h)")
    meanActualMW: float = Field(..., description="Average actual generation in MW")
    meanForecastMW: float = Field(..., description="Average forecast generation in MW")
    peakActualMW: float = Field(..., description="Peak actual half-hourly generation in MW")
    peakForecastMW: float = Field(..., description="Peak forecasted half-hourly generation in MW")
    totalSettlementPeriods: int = Field(..., description="Total number of settlement periods in window")
    validPeriodsCount: int = Field(..., description="Count of periods with both valid actual and forecast data")
    missingPeriodsCount: int = Field(..., description="Count of periods with missing data")
    completenessPercent: float = Field(..., description="Percentage of periods with complete data")


class CutoffOption(BaseModel):
    """Day-ahead decision cutoff definition."""
    cutoff_time: str
    name: str
    source: str
    description: str


class AuditMetadata(BaseModel):
    """Traceability and audit metadata for the data pipeline."""
    elexonBaseUrl: str
    datasetActual: str = "FUELHH (fuelType=WIND)"
    datasetForecast: str = "WINDFOR"
    cutoffTimeUsed: str
    cutoffSource: str
    timeResolution: str = "30-minute delivery periods (SP 1-48)"
    forecastMappingRule: str = "Hourly forecast mapped identically to both 30-min settlement periods without interpolation"
    totalPeriodsQueried: int
    missingActualPeriods: int
    missingForecastPeriods: int
    distinctForecastRunsUsed: int
    assumptions: List[str]


class DashboardDataResponse(BaseModel):
    """Complete payload for dashboard visualization."""
    metrics: MetricsSummary
    timeSeries: List[PeriodRecord]
    dailyAggregates: List[DailyAggregate]
    audit: AuditMetadata

