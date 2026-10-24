# UK Renewable Wind Generation Forecast Dashboard

An enterprise-grade analytics dashboard evaluating UK National Grid Day-Ahead Wind Generation Forecasts (**WINDFOR**) against native half-hourly Outturn Actuals (**FUELHH**) from the official **Elexon BMRS Insights Solution** for January 2026.

---

## 🎯 1. Assignment Requirements & Objectives

- **Core Goal**: Evaluate the predictive accuracy of day-ahead wind power forecasts published prior to gate closure against actual delivery outturns for electricity purchasing decisions in Great Britain.
- **Delivery Scope**: Full calendar month of January 2026 ($31\text{ days} \times 48\text{ settlement periods} = 1,488\text{ half-hourly periods}$).
- **Evaluation Criteria**: Calculate Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), Mean Forecast Bias, Weighted Absolute Percentage Error (WAPE), and energy balance totals (MWh) on genuine data. Zero data fabrication.
- **Architecture**: Decoupled FastAPI backend and React + TypeScript + Tailwind CSS + Recharts frontend.

---

## 📡 2. Verified Elexon BMRS API Behavior

All data is queried or cached from the official **Elexon Insights Solution REST API** (`https://data.elexon.co.uk/bmrs/api/v1`):

### A. Actual Generation Outturn: `FUELHH`
- **Endpoint**: `/datasets/FUELHH?fuelType=WIND`
- **Nature**: Metered generation outturn aggregated by fuel type across Great Britain.
- **Resolution**: Native 30-minute settlement periods (SP 1 to 48 daily).
- **Verified Behavior**: January 2026 contains exactly 1,488 valid half-hour periods with 0 nulls, 0 missing intervals, and 100% data completeness.

### B. Day-Ahead Forecast: `WINDFOR`
- **Endpoint**: `/datasets/WINDFOR`
- **Nature**: Official aggregated wind generation forecast produced by the National Energy System Operator (NESO, formerly National Grid ESO) under BSC Section Q.
- **Resolution**: Hourly forecast profiles published multiple times per day (typically 8 rolling runs daily: 02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30, 22:30 UTC).
- **Audit Field**: Contains the exact publication timestamp (`publishTime`), enabling strict verification of day-ahead auction cutoff compliance.
- **Rate & Chunking Limits**: The Elexon BMRS API strictly limits query windows to a maximum of 7 days per request. The pipeline implements automated chunking and exponential backoff retry.

---

## ⚖️ 3. Regulatory Rules vs. Analytical Benchmarks vs. Assumptions

To maintain strict regulatory clarity, the platform distinguishes between binding market rules, analytical benchmarks, and engineering pipeline assumptions:

### Legally Binding Exchange Gate Closures (Market Rules)
1. **09:20 GMT**: **EPEX SPOT GB Day-Ahead 60-min Auction**. Order book gate closure under EPEX SPOT Trading System Rules. The latest available WINDFOR run prior to 09:20 GMT on $D-1$ is typically the 07:30 UTC run.
2. **09:50 GMT**: **Nord Pool N2EX Day-Ahead Auction**. Order book gate closure under Nord Pool Market Specifications. The latest available WINDFOR run prior to 09:50 GMT on $D-1$ is typically the 09:30 UTC run.
3. **15:30 GMT**: **EPEX SPOT GB Day-Ahead 30-min Auction**. Afternoon half-hour auction order book gate closure. The latest available WINDFOR run prior to 15:30 GMT on $D-1$ is typically the 11:30 UTC run.

### Analytical & Operational Benchmarks
4. **11:00 GMT**: **European Single Day-Ahead Coupling (SDAC Reference / 12:00 CET)**. Post-Brexit, GB physical exchange auctions operate outside the pan-European SDAC order book and close earlier (09:20 / 09:50 GMT). However, 11:00 GMT remains the standard analytical benchmark used across energy market research, interconnector flow modeling, and academic literature. At 11:00 GMT on $D-1$, the latest available forecast is the **09:30 UTC run** (the 11:30 UTC run is published 30 minutes after the cutoff and is strictly excluded).
5. **12:00 GMT**: **UK Operational Midday Scheduling Window**. Operational reference point commonly used by scheduling desks.

### Pipeline Modeling Assumptions (Engineering Design)
- **Hourly-to-Half-Hourly Mapping**: WINDFOR forecasts are published at hourly intervals ($HH:00:00Z$). Each hourly forecast value is mapped identically to both corresponding 30-minute settlement periods ($SP_{2k-1}$ and $SP_{2k}$) without synthetic linear interpolation. This reflects real-world flat-block trading and avoids fabricating synthetic intermediate data points.
- **Zero Lookahead Rule**: For any delivery date $D$, only forecasts with $publishTime \le cutoff_{D-1}$ are considered.
- **Error Sign Convention**: Error is defined as $e_t = \text{Forecast}_t - \text{Actual}_t$ (positive error = over-forecast).
- **Energy Conversion**: In Great Britain, power values reported in MW represent the average rate of energy delivery over 30 minutes ($0.5\text{ hour}$). Energy in MWh is computed as $\sum (\text{MW} \times 0.5\text{ h})$.

---

## 🔍 4. Energy Totals & Unverified Hypotheses

### Empirical Observations (Verified Data)
- **Total Actual Outturn**: **8,616,068.50 MWh** ($\approx 8.62\text{ TWh}$), with average actual generation of **11,580.74 MW**.
- **Total Day-Ahead Forecast**: **9,985,249.00 MWh** ($\approx 9.99\text{ TWh}$), with average forecast generation of **13,421.03 MW**.
- **Net Forecast Surplus**: **+1,369,180.50 MWh** ($+1,369.2\text{ GWh}$), reflecting a net **+15.89%** volume over-forecast across January 2026.
- **Bias Directionality**: 28 out of 31 days in January 2026 experienced positive bias ($\text{Forecast} > \text{Actual}$).

### Potential Causal Drivers (Explicitly Labeled as Unverified Hypotheses)
The exact underlying causes of this forecast surplus cannot be definitively confirmed from public BMRS aggregate data alone and are presented strictly as **unverified hypotheses**:
1. *Transmission Curtailment Hypothesis*: The WINDFOR product predicts unconstrained wind generation potential. During high-wind periods, National Grid ESO frequently curtails Scottish wind farms via the Balancing Mechanism to respect transmission boundary limits (such as the B6 boundary between Scotland and England). Metered actual generation (`FUELHH`) reflects post-curtailment output, which could explain part of the shortfall.
2. *Turbine Cut-out Hypothesis*: During extreme winter gale events, wind turbines automatically shut down when wind speeds exceed cutoff thresholds (typically $25\text{ m/s}$ / $55\text{ mph}$). If numerical weather prediction models do not capture local gust cut-outs, forecasts will over-predict generation.
3. *NWP Atmospheric Model Bias Hypothesis*: Numerical weather prediction models ingested by NESO may exhibit systematic boundary-layer wind speed over-estimation during winter high-pressure block transitions.

---

## 🏗️ 5. Project Structure

```
renewable-forecast-dashboard/
├── backend/
│   ├── app/
│   │   ├── config.py           # Configuration, cutoff definitions & classifications
│   │   ├── elexon_client.py    # Elexon BMRS HTTP client with 7-day chunking & retries
│   │   ├── main.py             # FastAPI REST endpoints & CORS
│   │   ├── metrics.py          # Vectorized metrics engine (MAE/RMSE/Bias/WAPE)
│   │   ├── pipeline.py         # Cutoff filtering, alignment & audit generation
│   │   └── schemas.py          # Pydantic serialization models
│   ├── data/
│   │   ├── fuelhh_jan2026_wind.json   # Cached Elexon FUELHH actuals (1,488 SPs)
│   │   └── windfor_jan2026.json       # Cached Elexon WINDFOR forecasts (19,272 records)
│   ├── tests/
│   │   ├── test_api.py         # FastAPI endpoint integration tests
│   │   ├── test_metrics.py     # KPI formula validation tests
│   │   ├── test_pipeline.py    # Cutoff filtering & alignment tests
│   │   └── test_audit_verification.py # Automated timezone & math audit tests
│   ├── Dockerfile              # Docker container definition supporting dynamic $PORT
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # React dashboard components
│   │   │   ├── Navbar.tsx      # Backend health & cache status badge
│   │   │   ├── FilterBar.tsx   # Date pickers, presets, & cutoff selector
│   │   │   ├── KpiCards.tsx    # MAE, RMSE, Bias, & WAPE KPI cards
│   │   │   ├── EnergySummaryCards.tsx # Energy volume & peak comparison
│   │   │   ├── DataQualityCard.tsx    # Completeness & zero-fabrication badge
│   │   │   ├── ForecastVsActualChart.tsx # 30-min SP vs Daily mean/peak chart
│   │   │   ├── ErrorAnalysisChart.tsx    # Residual error bar chart
│   │   │   ├── DailyAggregatesChart.tsx  # Daily MAE & Bias breakdown
│   │   │   ├── SettlementTable.tsx       # Searchable ledger with CSV export
│   │   │   ├── AuditDrawer.tsx           # Full methodology & audit slide-over
│   │   │   ├── LoadingSkeleton.tsx       # Skeleton loaders
│   │   │   └── ErrorMessage.tsx          # Error banners with retry
│   │   ├── services/api.ts     # Frontend API client
│   │   ├── types/api.ts        # TypeScript data contracts
│   │   ├── test/               # Vitest component & API test suite
│   │   ├── App.tsx             # Main dashboard layout
│   │   └── index.css           # Tailwind CSS v4 styling
│   ├── package.json
│   ├── vercel.json             # Vercel SPA routing configuration
│   └── vite.config.ts          # Vite configuration with proxy
├── test_live_integration.py    # End-to-end live HTTP integration test
├── render.yaml                 # Render backend deployment blueprint
├── .gitignore
└── README.md
```

---

## ⚡ 6. Local Setup & Execution

### Prerequisites
- Python 3.11+ (or Conda)
- Node.js 18+ and npm

### A. Run Backend API
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI documentation is available at `http://127.0.0.1:8000/docs`.

### B. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
The Vite frontend will open at `http://localhost:5173`. In local development, all `/api/*` requests are automatically proxied to `http://127.0.0.1:8000`.

---

## 🧪 7. Automated Test Suites

### Backend Tests (Pytest — 16 Tests)
```bash
python -m pytest backend/tests -v
```
Validates:
- Health check and cache status
- Documented auction cutoff options
- Strict timezone handling (ensures $publishTime > cutoff_{D-1}$ is rejected)
- January representative periods (Jan 1, Jan 15, Jan 31)
- Midnight and day-end settlement period alignment
- Independent mathematical recalculation of MAE, RMSE, Mean Bias, WAPE, and Energy MWh

### Frontend Tests (Vitest — 10 Tests, 6 Suites)
```bash
cd frontend
npm test
```
Validates:
- API service parameter construction and error handling
- Filter controls and quick-window presets
- Data quality indicators and zero-fabrication badge
- Regulatory rule vs benchmark distinction in the Audit Drawer
- KPI card formatting and over/under-forecast badge logic
- Settlement ledger search, pagination, and CSV export trigger

### Frontend Production Build
```bash
cd frontend
npm run build
```
Validates strict TypeScript compilation (`tsc -b`) and Vite production bundling.

### Live End-to-End HTTP Integration Test
```bash
python test_live_integration.py
```
Boots a live Uvicorn socket, executes HTTP GET requests against `/api/health`, `/api/cutoff-options`, and `/api/data`, and confirms all 1,488 settlement periods pass schema validation.

---

## 🚀 8. Deployment Configurations

### Backend: Render Web Service
- **Configuration File**: [`render.yaml`](render.yaml) or [`backend/Dockerfile`](backend/Dockerfile)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Port Handling**: Configured to bind dynamically to `$PORT` supplied by Render.

### Frontend: Vercel SPA
- **Configuration File**: [`frontend/vercel.json`](frontend/vercel.json)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: `VITE_API_BASE_URL` set to the production Render backend URL (e.g., `https://renewable-forecast-backend.onrender.com`). When set, the frontend communicates directly with the deployed API.

*(Note: Per instructions, public deployment has not been triggered yet. Public URLs must be independently tested before deployment can be claimed as complete).*

---

## 🤖 9. AI-Tool Disclosure

In accordance with academic and institutional transparency standards:
- **AI Pair Programming Assistant**: Google Antigravity (powered by Gemini).
- **Assisted Tasks**:
  - Scaffolding the React 19 + TypeScript + Tailwind CSS v4 frontend and Recharts visualizations.
  - Designing the vectorized metrics engine in `backend/app/metrics.py`.
  - Authoring comprehensive unit, integration, and audit verification test suites in `backend/tests/` and `frontend/src/test/`.
  - Auditing timezone comparisons and verifying BSC settlement period alignment.
- **Human Verification**: All code, mathematical formulas, raw Elexon BMRS API responses, and test outputs were independently reviewed, validated against official BSC standards, and empirically tested.
