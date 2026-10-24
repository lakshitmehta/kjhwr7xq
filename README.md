# UK Renewable Wind Generation Forecast Dashboard

An analytics dashboard evaluating UK day-ahead wind generation forecasts (**WINDFOR**) against half-hourly metered generation outturn (**FUELHH**) from the official Elexon BMRS Insights Solution for January 2026.

**Live dashboard:** https://renewable-wind-forecast-frontend.vercel.app/

---

## 1. Assignment Requirements and Objectives

- **Core goal:** Evaluate day-ahead wind power forecasts available before a selected cutoff against actual generation outturn in Great Britain.
- **Evaluation period:** 1–31 January 2026, covering 31 days × 48 settlement periods = **1,488 half-hourly periods**.
- **Evaluation metrics:** Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), mean forecast bias, Weighted Absolute Percentage Error (WAPE), and energy totals in MWh.
- **Architecture:** React, TypeScript, Tailwind CSS, and Recharts frontend, with a Python FastAPI backend available for local or optional dynamic use.
- **Data integrity:** The evaluation uses cached data sourced from Elexon BMRS. No synthetic actual-generation observations are added.

## 2. Elexon BMRS Data Sources

Data is sourced from the official Elexon Insights Solution REST API:

`https://data.elexon.co.uk/bmrs/api/v1`

### A. Actual generation outturn: `FUELHH`

- **Endpoint:** `/datasets/FUELHH?fuelType=WIND`
- **Description:** Metered generation outturn aggregated by fuel type across Great Britain.
- **Resolution:** Native 30-minute settlement periods (SP 1–48 per day).
- **January 2026 dataset:** 1,488 half-hourly periods, as checked by the project data-validation pipeline.

### B. Day-ahead forecast: `WINDFOR`

- **Endpoint:** `/datasets/WINDFOR`
- **Description:** Aggregated wind-generation forecast published by the National Energy System Operator (NESO).
- **Resolution:** Hourly forecast profiles with multiple publication runs per day.
- **Audit field:** `publishTime`, used to check whether a forecast was available before the selected cutoff.
- **API handling:** The backend client chunks requests by date range and retries transient failures.

The repository includes cached source data so the evaluation can be reproduced without making a fresh API request for every dashboard visit.

## 3. Cutoffs, Benchmarks, and Modeling Assumptions

The dashboard provides five evaluation cutoffs: **09:20, 09:50, 11:00, 12:00, and 15:30 GMT**. These scenarios are not all presented as legally binding market deadlines. The project distinguishes market-related cutoffs from analytical benchmarks and engineering assumptions; see the dashboard's Audit panel for the scenario-specific descriptions.

### Forecast selection and alignment

- **No-lookahead rule:** For a delivery date `D`, only forecast records published on or before the selected cutoff on `D-1` are eligible.
- **Hourly-to-half-hourly mapping:** WINDFOR forecasts are hourly. Each hourly value is mapped to both corresponding half-hourly settlement periods. No linear interpolation is introduced.
- **Error convention:** `error = forecast − actual`; a positive value indicates over-forecasting.
- **Energy conversion:** For half-hourly periods, energy in MWh is calculated as `MW × 0.5 hours`, summed across the selected periods.

These are explicit modeling choices for this evaluation and should not be interpreted as a claim that every forecast value or cutoff is prescribed by a market rule.

## 4. January 2026 Results

### Aggregate observations

| Measure | Value |
|---|---:|
| Total actual wind generation | 8,616,068.50 MWh |
| Total forecast wind generation | 9,985,249.00 MWh |
| Net forecast surplus | +1,369,180.50 MWh |
| Net surplus relative to actual energy | +15.89% |
| Average actual generation | 11,580.74 MW |
| Average forecast generation | 13,421.03 MW |
| Days with positive daily bias | 28 of 31 |

### Forecast error by cutoff

| Cutoff (GMT) | MAE (MW) | RMSE (MW) | Mean bias (MW) | WAPE |
|---|---:|---:|---:|---:|
| 09:20 | 2,145.17 | — | — | — |
| 09:50 | 2,126.12 | 2,620.80 | +1,840.30 | 18.36% |
| 11:00 | 2,126.12 | 2,620.80 | +1,840.30 | 18.36% |
| 12:00 | 2,020.64 | — | — | — |
| 15:30 | 1,984.49 | — | — | — |

Dashes indicate values not listed in this README summary; the dashboard calculates and displays the metrics for each selected cutoff and date range. The 09:50 and 11:00 results are identical in this dataset because both scenarios select the same latest eligible forecast run.

### Potential explanations — hypotheses, not verified causes

Aggregate BMRS data alone does not establish why forecast volume exceeded actual generation. Potential explanations that would require additional evidence include:

1. **Transmission constraints or curtailment:** constrained wind output may contribute to a gap between forecast and metered generation.
2. **Turbine cut-out during extreme winds:** individual turbines can shut down at very high wind speeds, but this project does not verify that this caused the observed error.
3. **Weather-model or forecast bias:** systematic errors in weather inputs or forecast modeling may contribute, but this analysis does not isolate their effect.

These are hypotheses only. The dashboard does not claim to identify the causal driver of the forecast surplus.

## 5. Project Structure

```text
renewable-forecast-dashboard/
├── backend/
│   ├── app/
│   │   ├── config.py             # Configuration and cutoff definitions
│   │   ├── elexon_client.py      # Elexon HTTP client, chunking and retries
│   │   ├── main.py               # FastAPI endpoints and CORS
│   │   ├── metrics.py            # MAE, RMSE, bias and WAPE calculations
│   │   ├── pipeline.py           # Cutoff filtering, alignment and audit data
│   │   └── schemas.py             # Pydantic response schemas
│   ├── data/
│   │   ├── fuelhh_jan2026_wind.json
│   │   └── windfor_jan2026.json
│   ├── scripts/
│   │   └── export_static_datasets.py
│   ├── tests/
│   │   ├── test_api.py
│   │   ├── test_metrics.py
│   │   ├── test_pipeline.py
│   │   ├── test_audit_verification.py
│   │   └── test_static_export.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── data/
│   │       ├── cutoff_options.json
│   │       ├── health.json
│   │       ├── eval_0920.json
│   │       ├── eval_0950.json
│   │       ├── eval_1100.json
│   │       ├── eval_1200.json
│   │       └── eval_1530.json
│   ├── src/
│   │   ├── components/           # Dashboard, charts, filters, audit and table
│   │   ├── services/api.ts        # Static JSON and optional API client
│   │   ├── types/api.ts            # TypeScript data contracts
│   │   ├── test/                   # Vitest tests
│   │   ├── App.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vercel.json
│   └── vite.config.ts
├── test_live_integration.py
├── render.yaml
├── .gitignore
└── README.md
```

## 6. Local Setup and Execution

### Prerequisites

- Python 3.11 or later
- Node.js and npm

### A. Run the backend API

From the repository root:

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

FastAPI documentation: `http://127.0.0.1:8000/docs`

### B. Run the frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server is normally available at `http://localhost:5173`. In local development, the Vite proxy forwards `/api/*` requests to `http://127.0.0.1:8000`.

The deployed Vercel version uses the precomputed static JSON dataset by default, so a separate backend deployment is not required for the January 2026 evaluation.

## 7. Automated Tests

### Backend tests — Pytest (25 tests)

From the repository root:

```bash
python -m pytest backend/tests -v
```

The backend test suite covers:

- Health and cache-status endpoints
- Available cutoff configurations
- Timezone-aware cutoff filtering and rejection of forecasts published after the cutoff
- Representative January dates and settlement-period alignment
- Independent calculations of MAE, RMSE, mean bias, WAPE, and energy totals
- Integrity checks for the precomputed static export datasets

### Frontend tests — Vitest (28 tests)

From the repository root:

```bash
npm --prefix frontend test -- --run
```

The frontend test suite covers:

- Static-mode fetching of health, cutoff, and evaluation JSON files
- All five cutoff scenarios
- Client-side date filtering and KPI recalculation
- JSON parsing and handling of unexpected HTML responses
- Filter controls and date presets
- Data-quality indicators and audit wording
- KPI formatting, over/under-forecast labels, and settlement-table interactions

### Production build

```bash
npm --prefix frontend run build
```

This runs the TypeScript build checks and Vite production bundling.

### Backend HTTP integration test

```bash
python test_live_integration.py
```

This test starts a local Uvicorn server and checks the API endpoints and response schema, including the January settlement-period dataset.

## 8. Deployment Architecture

### Mode A: Static deployment on Vercel — current live deployment

- **Data files:** Precomputed evaluation JSON files live in `frontend/public/data/` and are copied into `frontend/dist/data/` during the Vite build.
- **Routing:** Vercel serves the generated static data files directly. The catch-all rewrite in `frontend/vercel.json` supports client-side application routes.
- **Data access:** The frontend fetches the static JSON files and performs date-range filtering and KPI recalculation in the browser.
- **Backend requirement:** The current fixed January 2026 evaluation does not require a separately hosted backend.
- **Scope limitation:** The deployed static dataset covers January 2026. Evaluating additional months requires regenerating the data and redeploying, or configuring a live backend.

### Mode B: Optional dynamic full-stack deployment

The repository also includes a FastAPI backend and deployment configuration for a future dynamic setup.

- **Backend hosting:** The backend can be deployed to a compatible Python/container hosting service using `backend/Dockerfile` or `render.yaml`.
- **Frontend configuration:** Set `VITE_API_BASE_URL` to the URL of the deployed backend when configuring a dynamic deployment.
- **Hybrid behavior:** The API client supports a configured backend and a precomputed static-data fallback. This optional configuration should not be mistaken for the current static Vercel deployment.

Actual performance, availability, and hosting costs depend on the hosting provider and its plan.

To regenerate the precomputed datasets from the cached backend data, run from the repository root:

```bash
python backend/scripts/export_static_datasets.py
```

## 9. AI-Tool Disclosure

AI assistance was used during development.

- **AI assistant:** Google Antigravity (powered by Gemini).
- **Assisted tasks:** Frontend scaffolding and visualization support, metrics-engine implementation support, test authoring, and review of timezone and settlement-period handling.
- **Verification:** Tests and build checks were run during development. Any claims about independent review or regulatory validation should be limited to checks actually performed by the project author.

---

## Notes

- This dashboard evaluates published WINDFOR forecasts against FUELHH outturn; it does not generate an independent wind forecast.
- Results apply to the selected January 2026 period and the documented cutoff/alignment assumptions.
- The cutoff labels, analytical benchmarks, and engineering assumptions are distinguished in the dashboard's Audit panel.
