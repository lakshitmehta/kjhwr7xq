"""Configuration settings for the Renewable Wind Forecast Dashboard."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    APP_NAME: str = "UK Renewable Wind Forecast Dashboard API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Elexon BMRS API
    ELEXON_BASE_URL: str = "https://data.elexon.co.uk/bmrs/api/v1"
    ELEXON_MAX_CHUNK_DAYS: int = 7  # Elexon API strictly enforces <= 7 days per query
    
    # Analysis Window
    DEFAULT_START_DATE: str = "2026-01-01"
    DEFAULT_END_DATE: str = "2026-01-31"
    
    # Cutoff Options
    # Documenting authoritative sources:
    # - "09:20": EPEX SPOT GB 60-min Day-Ahead Auction Gate Closure
    # - "09:50": Nord Pool N2EX GB Day-Ahead Auction Order Book Closure
    # - "11:00": SDAC / Reference European Day-Ahead Gate Closure (12:00 CET = 11:00 GMT)
    # - "12:00": Midday Cutoff / BMRS standard reporting reference
    # - "15:30": EPEX SPOT GB 30-min Day-Ahead Auction Gate Closure
    DEFAULT_CUTOFF_TIME: str = "11:00"
    
    # Cache paths
    FUELHH_CACHE_FILE: Path = DATA_DIR / "fuelhh_jan2026_wind.json"
    WINDFOR_CACHE_FILE: Path = DATA_DIR / "windfor_jan2026.json"
    PROCESSED_DATA_FILE: Path = DATA_DIR / "processed_dataset.json"

    class Config:
        env_prefix = "DASHBOARD_"


settings = Settings()

CUTOFF_DEFINITIONS = [
    {
        "cutoff_time": "09:20",
        "name": "EPEX SPOT GB Day-Ahead (60-min)",
        "source": "Binding Exchange Rule: EPEX SPOT Trading System Rules (09:20 GMT Gate Closure)",
        "description": "Selects latest WINDFOR published prior to 09:20 GMT on D-1 (typically 07:30 UTC run). Legally binding order book closure for EPEX SPOT GB 60-minute day-ahead auction.",
    },
    {
        "cutoff_time": "09:50",
        "name": "Nord Pool N2EX Day-Ahead Auction",
        "source": "Binding Exchange Rule: Nord Pool Market Specification (09:50 GMT Order Book Close)",
        "description": "Selects latest WINDFOR published prior to 09:50 GMT on D-1 (typically 09:30 UTC run). Legally binding order book closure for Nord Pool N2EX day-ahead auction.",
    },
    {
        "cutoff_time": "11:00",
        "name": "Standard Day-Ahead Benchmark (SDAC Reference)",
        "source": "Analytical Benchmark: European Single Day-Ahead Coupling (12:00 CET / 11:00 GMT)",
        "description": "Selects latest WINDFOR published prior to 11:00 GMT on D-1 (typically 09:30 UTC run). Pan-European reference benchmark; local GB physical auctions close earlier (09:20/09:50 GMT).",
    },
    {
        "cutoff_time": "12:00",
        "name": "Midday Operational Reference",
        "source": "Operational Convention: UK Operational Noon Scheduling Window (12:00 GMT)",
        "description": "Selects latest WINDFOR published prior to 12:00 GMT on D-1 (typically 11:30 UTC run). Operational reference checkpoint; not an exchange gate closure.",
    },
    {
        "cutoff_time": "15:30",
        "name": "EPEX SPOT GB Half-Hour Auction",
        "source": "Binding Exchange Rule: EPEX SPOT Trading System Rules (15:30 GMT Gate Closure)",
        "description": "Selects latest WINDFOR published prior to 15:30 GMT on D-1 (typically 11:30 UTC run). Legally binding order book closure for afternoon half-hourly auction.",
    },
]

