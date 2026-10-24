"""Script to ingest and cache authentic January 2026 data from Elexon BMRS API."""

import sys
from pathlib import Path

# Add backend directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.elexon_client import ElexonClient, cache_raw_dataset
from app.config import settings

def main():
    print("Ingesting authentic Elexon data for January 2026...")
    client = ElexonClient()
    
    # 1. Fetch FUELHH for 2026-01-01 to 2026-01-31
    print("Fetching FUELHH (fuelType=WIND) in 7-day chunks...")
    fuel_records = client.fetch_fuelhh("2026-01-01", "2026-01-31", fuel_type="WIND")
    print(f"Retrieved {len(fuel_records)} FUELHH records.")
    cache_raw_dataset(fuel_records, settings.FUELHH_CACHE_FILE)
    
    # 2. Fetch WINDFOR from 2025-12-30 to 2026-01-31
    print("Fetching WINDFOR in 6-day chunks...")
    wind_records = client.fetch_windfor("2025-12-30T00:00:00Z", "2026-01-31T23:59:59Z")
    print(f"Retrieved {len(wind_records)} WINDFOR records.")
    cache_raw_dataset(wind_records, settings.WINDFOR_CACHE_FILE)
    
    print("Ingestion complete. Authentic data cached successfully.")

if __name__ == "__main__":
    main()

