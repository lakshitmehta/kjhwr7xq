"""FastAPI Application for UK Renewable Wind Generation Forecast Dashboard."""

import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings, CUTOFF_DEFINITIONS
from app.pipeline import pipeline
from app.schemas import (
    CutoffOption,
    DashboardDataResponse,
    DailyAggregate,
    MetricsSummary,
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API evaluating UK Wind Generation forecasts (Elexon WINDFOR) against actuals (Elexon FUELHH).",
)

# CORS middleware for frontend React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows local Vite dev and deployed Vercel frontends
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """Health check and cache status."""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "fuelhh_cache_exists": settings.FUELHH_CACHE_FILE.exists(),
        "windfor_cache_exists": settings.WINDFOR_CACHE_FILE.exists(),
    }


@app.get("/api/cutoff-options", response_model=list[CutoffOption])
def get_cutoff_options():
    """Return documented day-ahead auction cutoff options and their authoritative sources."""
    return [CutoffOption(**item) for item in CUTOFF_DEFINITIONS]


@app.get("/api/data", response_model=DashboardDataResponse)
def get_dashboard_data(
    start_date: str = Query(
        default=settings.DEFAULT_START_DATE,
        description="Delivery start date (YYYY-MM-DD)",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    end_date: str = Query(
        default=settings.DEFAULT_END_DATE,
        description="Delivery end date (YYYY-MM-DD)",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    cutoff_time: str = Query(
        default=settings.DEFAULT_CUTOFF_TIME,
        description="Day-ahead cutoff time in GMT on D-1 (e.g., 09:20, 09:50, 11:00, 12:00, 15:30)",
        pattern=r"^\d{2}:\d{2}$",
    ),
    force_refresh: bool = Query(
        default=False,
        description="Whether to bypass local cache and query Elexon API live",
    ),
):
    """
    Primary endpoint returning aligned 30-minute settlement period records,
    computed KPI metrics, daily aggregates, and audit metadata.
    """
    try:
        data = pipeline.build_dashboard_dataset(
            start_date=start_date,
            end_date=end_date,
            cutoff_time=cutoff_time,
            force_refresh=force_refresh,
        )
        return data
    except Exception as e:
        logger.exception("Failed to build dashboard dataset")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/metrics", response_model=MetricsSummary)
def get_metrics(
    start_date: str = Query(default=settings.DEFAULT_START_DATE),
    end_date: str = Query(default=settings.DEFAULT_END_DATE),
    cutoff_time: str = Query(default=settings.DEFAULT_CUTOFF_TIME),
):
    """Returns only the aggregated metrics summary."""
    try:
        data = pipeline.build_dashboard_dataset(
            start_date=start_date,
            end_date=end_date,
            cutoff_time=cutoff_time,
            force_refresh=False,
        )
        return data.metrics
    except Exception as e:
        logger.exception("Failed to calculate metrics")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/refresh-cache")
def refresh_cache(
    start_date: str = Query(default=settings.DEFAULT_START_DATE),
    end_date: str = Query(default=settings.DEFAULT_END_DATE),
):
    """Forces an authentic data pull from Elexon API for January 2026."""
    try:
        data = pipeline.build_dashboard_dataset(
            start_date=start_date,
            end_date=end_date,
            force_refresh=True,
        )
        return {
            "status": "success",
            "message": f"Successfully pulled and cached {data.metrics.totalSettlementPeriods} settlement periods from Elexon API.",
            "metrics": data.metrics,
        }
    except Exception as e:
        logger.exception("Cache refresh failed")
        raise HTTPException(status_code=500, detail=str(e))
