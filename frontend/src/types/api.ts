export interface PeriodRecord {
  settlementDate: string;
  settlementPeriod: number;
  startTime: string;
  actualGeneration: number | null;
  forecastGeneration: number | null;
  forecastPublishTime: string | null;
  error: number | null;
  absError: number | null;
  squaredError: number | null;
  isForecastMissing: boolean;
  isActualMissing: boolean;
}

export interface DailyAggregate {
  date: string;
  meanActualMW: number;
  meanForecastMW: number;
  totalActualMWh: number;
  totalForecastMWh: number;
  mae: number;
  rmse: number;
  meanBias: number;
  peakActualMW: number;
  peakForecastMW: number;
  publishTimes: string[];
}

export interface MetricsSummary {
  mae: number;
  rmse: number;
  meanBias: number;
  wape: number;
  totalActualMWh: number;
  totalForecastMWh: number;
  meanActualMW: number;
  meanForecastMW: number;
  peakActualMW: number;
  peakForecastMW: number;
  totalSettlementPeriods: number;
  validPeriodsCount: number;
  missingPeriodsCount: number;
  completenessPercent: number;
}

export interface CutoffOption {
  cutoff_time: string;
  name: string;
  source: string;
  description: string;
}

export interface AuditMetadata {
  elexonBaseUrl: string;
  datasetActual: string;
  datasetForecast: string;
  cutoffTimeUsed: string;
  cutoffSource: string;
  timeResolution: string;
  forecastMappingRule: string;
  totalPeriodsQueried: number;
  missingActualPeriods: number;
  missingForecastPeriods: number;
  distinctForecastRunsUsed: number;
  assumptions: string[];
}

export interface DashboardDataResponse {
  metrics: MetricsSummary;
  timeSeries: PeriodRecord[];
  dailyAggregates: DailyAggregate[];
  audit: AuditMetadata;
}

export interface HealthStatus {
  status: string;
  app: string;
  version: string;
  fuelhh_cache_exists: boolean;
  windfor_cache_exists: boolean;
  mode?: string;
  dataset?: string;
}

