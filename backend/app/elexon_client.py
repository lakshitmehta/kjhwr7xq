"""Elexon BMRS Insights Solution API Client.

Fetches authentic data from:
- /datasets/FUELHH (Actual generation by fuel type)
- /datasets/WINDFOR (Wind generation forecasts)

Enforces strict Elexon API constraints:
- Maximum query date range must not exceed 7 days per request (enforced via automatic chunking).
- Explicit error handling, timeouts, and retries.
- Zero data fabrication.
"""

import json
import logging
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

from app.config import settings

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class ElexonClient:
    """Client for querying the Elexon Insights Solution REST API."""

    def __init__(self, base_url: Optional[str] = None, timeout: float = 30.0):
        self.base_url = (base_url or settings.ELEXON_BASE_URL).rstrip("/")
        self.timeout = timeout
        self.client = httpx.Client(
            timeout=self.timeout,
            headers={
                "User-Agent": "UK-Renewable-Wind-Dashboard/1.0 (Energy Analytics Academic Assignment)",
                "Accept": "application/json",
            },
        )

    def close(self):
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def _execute_request_with_retry(self, url: str, params: Dict[str, Any], max_retries: int = 3) -> Dict[str, Any]:
        """Execute HTTP request with exponential backoff for network/transient failures."""
        last_error = None
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"Elexon API GET {url} params={params} (attempt {attempt}/{max_retries})")
                response = self.client.get(url, params=params)
                if response.status_code == 200:
                    return response.json()
                
                # If 4xx client validation error, don't retry blindly
                if 400 <= response.status_code < 500:
                    error_detail = response.text
                    logger.error(f"Elexon API 4xx Error ({response.status_code}): {error_detail}")
                    raise httpx.HTTPStatusError(
                        f"Elexon API returned {response.status_code}: {error_detail}",
                        request=response.request,
                        response=response,
                    )

                response.raise_for_status()
            except (httpx.RequestError, httpx.HTTPStatusError) as e:
                last_error = e
                logger.warning(f"Request failed (attempt {attempt}/{max_retries}): {e}")
                if attempt < max_retries:
                    sleep_time = 1.5 * (2 ** (attempt - 1))
                    time.sleep(sleep_time)

        raise RuntimeError(f"Elexon API call failed after {max_retries} attempts: {last_error}")

    def fetch_fuelhh_chunk(self, date_from: str, date_to: str, fuel_type: str = "WIND") -> List[Dict[str, Any]]:
        """Fetch FUELHH records for a single chunk (must be <= 7 days)."""
        url = f"{self.base_url}/datasets/FUELHH"
        params = {
            "settlementDateFrom": date_from,
            "settlementDateTo": date_to,
            "fuelType": fuel_type,
            "format": "json",
        }
        res_json = self._execute_request_with_retry(url, params)
        return res_json.get("data", [])

    def fetch_fuelhh(self, start_date: str, end_date: str, fuel_type: str = "WIND") -> List[Dict[str, Any]]:
        """
        Fetch FUELHH records across any date range by automatically chunking into <= 7-day intervals.
        Preserves all settlement periods without assuming counts.
        """
        d_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        d_end = datetime.strptime(end_date, "%Y-%m-%d").date()

        if d_start > d_end:
            raise ValueError(f"start_date ({start_date}) cannot be after end_date ({end_date})")

        all_records = []
        current_start = d_start

        while current_start <= d_end:
            # Elexon allows at most 7 days inclusive: current_start + 6 days
            current_end = min(current_start + timedelta(days=6), d_end)
            chunk = self.fetch_fuelhh_chunk(
                current_start.strftime("%Y-%m-%d"),
                current_end.strftime("%Y-%m-%d"),
                fuel_type=fuel_type,
            )
            all_records.extend(chunk)
            current_start = current_end + timedelta(days=1)

        logger.info(f"Fetched total {len(all_records)} FUELHH records for {start_date} to {end_date}")
        return all_records

    def fetch_windfor_chunk(self, publish_from: str, publish_to: str) -> List[Dict[str, Any]]:
        """Fetch WINDFOR records for a single chunk of publication times (must be <= 7 days)."""
        url = f"{self.base_url}/datasets/WINDFOR"
        params = {
            "publishDateTimeFrom": publish_from,
            "publishDateTimeTo": publish_to,
            "format": "json",
        }
        res_json = self._execute_request_with_retry(url, params)
        return res_json.get("data", [])

    def fetch_windfor(self, publish_start: str, publish_end: str) -> List[Dict[str, Any]]:
        """
        Fetch WINDFOR records across any date-time range by automatically chunking into <= 6-day intervals.
        """
        # Format can be "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SSZ"
        if "T" in publish_start:
            dt_start = datetime.fromisoformat(publish_start.replace("Z", "+00:00"))
        else:
            dt_start = datetime.strptime(publish_start, "%Y-%m-%d")

        if "T" in publish_end:
            dt_end = datetime.fromisoformat(publish_end.replace("Z", "+00:00"))
        else:
            dt_end = datetime.strptime(publish_end, "%Y-%m-%d")

        all_records = []
        current_start = dt_start

        while current_start < dt_end:
            current_end = min(current_start + timedelta(days=5), dt_end)
            chunk = self.fetch_windfor_chunk(
                current_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                current_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
            )
            all_records.extend(chunk)
            # Advance to current_end to avoid duplicate overlap
            current_start = current_end

        logger.info(f"Fetched total {len(all_records)} WINDFOR records for {publish_start} to {publish_end}")
        return all_records


def cache_raw_dataset(records: List[Dict[str, Any]], filepath: Path) -> None:
    """Save raw authentic records to local JSON cache file."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
    logger.info(f"Successfully cached {len(records)} records to {filepath}")


def load_raw_dataset_cache(filepath: Path) -> Optional[List[Dict[str, Any]]]:
    """Load raw dataset from local JSON cache if exists."""
    if not filepath.exists():
        return None
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            records = json.load(f)
        logger.info(f"Loaded {len(records)} records from cache {filepath}")
        return records
    except Exception as e:
        logger.warning(f"Failed to read cache file {filepath}: {e}")
        return None

