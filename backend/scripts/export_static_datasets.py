"""Script to precompute and export authentic January 2026 evaluation datasets to frontend/public/data/."""

import json
from pathlib import Path
import sys

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.pipeline import pipeline
from app.config import CUTOFF_DEFINITIONS, settings

OUTPUT_DIR = BASE_DIR.parent / "frontend" / "public" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

print(f"Exporting precomputed datasets to: {OUTPUT_DIR}")

# 1. Export cutoff options
cutoff_file = OUTPUT_DIR / "cutoff_options.json"
with open(cutoff_file, "w", encoding="utf-8") as f:
    json.dump(CUTOFF_DEFINITIONS, f, indent=2)
print(f"[OK] Exported {len(CUTOFF_DEFINITIONS)} cutoff definitions to {cutoff_file.name}")

# 2. Export health status
health_file = OUTPUT_DIR / "health.json"
health_payload = {
    "status": "ok",
    "app": settings.APP_NAME,
    "version": settings.APP_VERSION,
    "mode": "static_precomputed",
    "fuelhh_cache_exists": settings.FUELHH_CACHE_FILE.exists(),
    "windfor_cache_exists": settings.WINDFOR_CACHE_FILE.exists(),
    "dataset": "January 2026 Elexon BMRS Benchmark",
}
with open(health_file, "w", encoding="utf-8") as f:
    json.dump(health_payload, f, indent=2)
print(f"[OK] Exported health status to {health_file.name}")

# 3. Export datasets for all 5 cutoff times
for cutoff_info in CUTOFF_DEFINITIONS:
    cutoff_time = cutoff_info["cutoff_time"]
    clean_code = cutoff_time.replace(":", "")
    filename = f"eval_{clean_code}.json"
    dest_path = OUTPUT_DIR / filename

    print(f"Precomputing {cutoff_time} GMT cutoff dataset...")
    data_response = pipeline.build_dashboard_dataset(
        start_date="2026-01-01",
        end_date="2026-01-31",
        cutoff_time=cutoff_time,
        force_refresh=False,
    )

    payload = data_response.model_dump()
    with open(dest_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    file_size_kb = dest_path.stat().st_size / 1024
    m = payload["metrics"]
    print(f"[OK] Exported {filename}: {len(payload['timeSeries'])} SPs, {len(payload['dailyAggregates'])} days, MAE={m['mae']} MW, Size={file_size_kb:.1f} KB")

print("\nAll precomputed JSON datasets generated successfully!")

