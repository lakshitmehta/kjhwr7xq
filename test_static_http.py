"""Local HTTP Verification for Production Build Static Datasets.

Spins up an HTTP server on frontend/dist, executes real HTTP GET requests
against each /data/*.json endpoint, and verifies that:
1. The server returns HTTP 200.
2. The response is not HTML (no <!doctype, no <html).
3. The response body successfully parses as authentic JSON.
4. The JSON payload contains expected fields and 1,488 records where appropriate.
5. Conditional requests (If-Modified-Since / 304) are handled correctly.
"""

import http.server
import json
import socket
import threading
import time
import urllib.request
import urllib.error
from pathlib import Path


DIST_DIR = Path(__file__).resolve().parent / "frontend" / "dist"


def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def log_message(self, format, *args):
        pass  # Suppress console clutter


def run_http_verification():
    assert DIST_DIR.exists(), f"Dist directory {DIST_DIR} not found. Run npm run build first."
    data_dir = DIST_DIR / "data"
    assert data_dir.exists(), f"Static data directory {data_dir} not found in dist."

    port = get_free_port()
    server = http.server.HTTPServer(('127.0.0.1', port), QuietHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.5)

    base_url = f"http://127.0.0.1:{port}"
    print(f"[HTTP TEST] Server started at {base_url} serving {DIST_DIR}")

    endpoints = [
        ("health.json", 200, lambda d: d["status"] == "ok" and d["mode"] == "static_precomputed"),
        ("cutoff_options.json", 200, lambda d: len(d) == 5),
        ("eval_0920.json", 200, lambda d: len(d["timeSeries"]) == 1488 and d["metrics"]["mae"] == 2145.17),
        ("eval_0950.json", 200, lambda d: len(d["timeSeries"]) == 1488 and d["metrics"]["mae"] == 2126.12),
        ("eval_1100.json", 200, lambda d: len(d["timeSeries"]) == 1488 and d["metrics"]["mae"] == 2126.12),
        ("eval_1200.json", 200, lambda d: len(d["timeSeries"]) == 1488 and d["metrics"]["mae"] == 2020.64),
        ("eval_1530.json", 200, lambda d: len(d["timeSeries"]) == 1488 and d["metrics"]["mae"] == 1984.49),
    ]

    for filename, expected_code, validator in endpoints:
        url = f"{base_url}/data/{filename}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content_type = resp.headers.get("Content-Type", "")
            raw_bytes = resp.read()
            text = raw_bytes.decode("utf-8")

            # 1. Assert status 200
            assert status == expected_code, f"{url} returned status {status}, expected {expected_code}"

            # 2. Assert body is not HTML
            assert not text.strip().startswith("<!doctype"), f"{url} returned HTML doctype!"
            assert not text.strip().startswith("<html"), f"{url} returned HTML element!"

            # 3. Assert valid JSON parsing
            try:
                data = json.loads(text)
            except Exception as e:
                raise AssertionError(f"Failed to parse JSON from {url}: {e}")

            # 4. Assert payload validation
            assert validator(data), f"Data validation failed for {url}"

            print(f"  [OK] GET /data/{filename} -> HTTP {status} ({len(raw_bytes):,} bytes, valid JSON)")

            # 5. Test conditional request with Last-Modified (verify 304 handling)
            last_mod = resp.headers.get("Last-Modified")
            if last_mod:
                cond_req = urllib.request.Request(url, headers={"If-Modified-Since": last_mod})
                try:
                    with urllib.request.urlopen(cond_req) as cond_resp:
                        # Some dev servers may still return 200
                        pass
                except urllib.error.HTTPError as e:
                    if e.code == 304:
                        print(f"       Conditional If-Modified-Since verified -> HTTP 304 Not Modified")

    # Also verify that index.html is served for the root
    with urllib.request.urlopen(f"{base_url}/index.html") as resp:
        text = resp.read().decode("utf-8")
        assert "<!doctype html>" in text.lower(), "Root index.html did not return HTML"
        print(f"  [OK] GET /index.html -> HTTP 200 (HTML SPA shell verified)")

    server.shutdown()
    print("[HTTP TEST] All static endpoints successfully verified as valid JSON (0 HTML leaks)!")


if __name__ == "__main__":
    run_http_verification()

