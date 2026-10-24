"""End-to-end live HTTP integration test.
Tests the FastAPI backend over live HTTP socket and verifies all contracts expected by the React frontend.
"""

import time
import subprocess
import sys
import urllib.request
import json

def run_live_test():
    print("Starting Uvicorn backend server on port 8000...")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd="backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    try:
        # Wait for server to boot
        max_attempts = 15
        server_ready = False
        for i in range(max_attempts):
            time.sleep(0.8)
            try:
                with urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=2) as resp:
                    if resp.status == 200:
                        server_ready = True
                        data = json.loads(resp.read().decode())
                        print(f"Health response: {data}")
                        break
            except Exception:
                continue

        if not server_ready:
            raise RuntimeError("Backend failed to start within timeout.")

        # Test Cutoff Options
        with urllib.request.urlopen("http://127.0.0.1:8000/api/cutoff-options", timeout=5) as resp:
            assert resp.status == 200
            options = json.loads(resp.read().decode())
            print(f"Verified {len(options)} cutoff options.")
            assert len(options) >= 5

        # Test Full January 2026 Dashboard Data
        url = "http://127.0.0.1:8000/api/data?start_date=2026-01-01&end_date=2026-01-31&cutoff_time=11:00"
        with urllib.request.urlopen(url, timeout=10) as resp:
            assert resp.status == 200
            payload = json.loads(resp.read().decode())
            metrics = payload["metrics"]
            time_series = payload["timeSeries"]
            daily_aggregates = payload["dailyAggregates"]
            audit = payload["audit"]

            print(f"Integration Check: 1,488 SPs = {len(time_series)}")
            assert len(time_series) == 1488
            assert len(daily_aggregates) == 31
            assert metrics["totalSettlementPeriods"] == 1488
            assert metrics["validPeriodsCount"] == 1488
            assert metrics["completenessPercent"] == 100.0
            assert metrics["mae"] > 0
            assert metrics["rmse"] >= metrics["mae"]
            assert audit["cutoffTimeUsed"] == "11:00 GMT on D-1"
            print(f"Verified Full Month Dashboard Payload:")
            print(f"  MAE: {metrics['mae']} MW")
            print(f"  RMSE: {metrics['rmse']} MW")
            print(f"  Mean Bias: {metrics['meanBias']} MW")
            print(f"  WAPE: {metrics['wape']}%")
            print(f"  Total Actual Energy: {metrics['totalActualMWh']} MWh")
            print(f"  Total Forecast Energy: {metrics['totalForecastMWh']} MWh")

        print("All live HTTP integration checks passed successfully!")
    finally:
        proc.terminate()
        proc.wait(timeout=5)
        print("Backend server terminated cleanly.")

if __name__ == "__main__":
    run_live_test()

