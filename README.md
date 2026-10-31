# UK Wind Generation Forecast Monitoring & Quantitative Accuracy Platform

An end-to-end full-stack analytical platform built for UK electricity utility trading teams to monitor, evaluate, and quantify the accuracy of UK National Grid wind power generation forecasts available at the Day-Ahead wholesale market decision cutoff.

Powered by genuine stream data from **Elexon BMRS** (`WINDFOR` forecast stream and `FUELHH` actual generation outturn).

---

## Table of Contents

1. [Executive Summary & Problem Setting](#1-executive-summary--problem-setting)
2. [Market Context & Decision Workflow](#2-market-context--decision-workflow)
3. [Architecture & Technology Stack](#3-architecture--technology-stack)
4. [Data Sourcing & Ingestion Logic](#4-data-sourcing--ingestion-logic)
5. [Analytical Methodology & Mathematical Formulations](#5-analytical-methodology--mathematical-formulations)
6. [Repository Structure](#6-repository-structure)
7. [Getting Started & Local Execution](#7-getting-started--local-execution)
8. [Docker & Containerized Execution](#8-docker--containerized-execution)
9. [Automated Testing Suite](#9-automated-testing-suite)
10. [Deployment Guide (Vercel & Heroku/Render)](#10-deployment-guide-vercel--herokurender)
11. [Deliverable Walkthrough & Presentation Guide](#11-deliverable-walkthrough--presentation-guide)
12. [AI Assistance Disclosure](#12-ai-assistance-disclosure)

---

## 1. Executive Summary & Problem Setting

Electricity utilities in the United Kingdom must procure sufficient electricity from the wholesale market to meet consumer demand. While renewable wind power provides low-marginal-cost clean energy, wind generation is intermittent and weather-dependent.

Decisions to procure wholesale power on the **UK Day-Ahead Market** (e.g. EPEX SPOT / Nord Pool UK Day-Ahead Auctions) must be finalized one day prior to delivery ($D-1$). Therefore, trading teams must rely heavily on wind generation forecasts when determining how much additional thermal or dispatchable capacity must be purchased.

### The Two Core Objectives of this Platform:

1. **Latest Available Day-Ahead Forecasts**: Clearly display and audit the latest wind generation forecasts available at the exact moment purchase decisions are made, preventing lookahead bias.
2. **Quantitative Accuracy & Error Evaluation**: Empirically quantify historical forecast accuracy (MAE, RMSE, MBE, error distribution, and intraday profiles) for January 2026, equipping traders to make risk-adjusted procurement decisions.

---

## 2. Market Context & Decision Workflow

In the UK wholesale power market:

- **Delivery Day ($D$)**: Divided into **48 half-hour settlement periods** (SP 1 = 00:00–00:30 UTC, up to SP 48 = 23:30–00:00 UTC).
- **Day-Ahead Gate Closure ($D-1$ 12:00 UTC)**: Power traders must submit binding auction purchase orders around midday on the day prior to delivery.
- **The Financial Risks**:
  - **Overestimation ($\text{Forecast} > \text{Actual}$, Positive Error)**: The utility expects high wind and purchases less thermal power. On delivery day, a wind generation deficit occurs, forcing the utility to buy expensive imbalance / cash-out energy from the Balancing Mechanism.
  - **Underestimation ($\text{Forecast} < \text{Actual}$, Negative Error)**: The utility over-procures thermal power. On delivery day, unexpected wind surplus floods the portfolio, resulting in distress selling or wind curtailment.

---

## 3. Architecture & Technology Stack

The solution is decoupled into an analytical Python backend and a React trading dashboard.

```
┌────────────────────────────────────────────────────────┐
│                   React + Vite Frontend                │
│    Recharts Visualization • Lucide UI • Trading Desk   │
└───────────────────────────▲────────────────────────────┘
                            │ REST API (JSON)
┌───────────────────────────▼────────────────────────────┐
│                  FastAPI Python Backend                │
│  - Day-Ahead Decision Cutoff Engine (Anti-Lookahead)   │
│  - Elexon BMRS Stream Client (HTTPX & Retries)         │
│  - Statistical Accuracy Analytics (MAE, RMSE, MBE)     │
│  - In-Memory Cache & Seeded Jan 2026 Fallback          │
└───────────────────────────▲────────────────────────────┘
                            │ HTTPS Streams
┌───────────────────────────▼────────────────────────────┐
│                    Elexon BMRS Insights API            │
│  - FUELHH Stream (Actual Wind Generation by Fuel Type) │
│  - WINDFOR Stream (National Grid Wind Forecasts)       │
└────────────────────────────────────────────────────────┘
```

### Technology Matrix:

- **Frontend**: React 19, Vite 8, Recharts 2, Lucide React, Modern Dark Refinitiv/Bloomberg-style trading console theme.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, HTTPX, Python-Dateutil, Pytest.
- **Data Stores**: In-memory indexed query engine with pre-seeded offline/online resilient dataset.
- **Containerization**: Docker multi-stage builds and Docker Compose.

---

## 4. Data Sourcing & Ingestion Logic

The application uses exclusively official Elexon BMRS stream endpoints:

1. **Actual Generation Outturn (`FUELHH`)**:
   - Endpoint: `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
   - Filter: `fuelType == "WIND"`
   - Granularity: 30-minute settlement periods (48 records/day, 1,488 records for January 2026).
   - Fields: `startTime`, `settlementDate`, `settlementPeriod`, `generation` (MW).

2. **Forecasted Wind Generation (`WINDFOR`)**:
   - Endpoint: `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
   - Filter: Queried by `publishDateTimeFrom` and `publishDateTimeTo`.
   - Granularity: Hourly published predictions with multiple successive revisions (19,272 forecast records ingested for January 2026).
   - Fields: `startTime`, `publishTime`, `generation` (MW).

### Resolution & Block Alignment

National Grid publishes `WINDFOR` forecasts at hourly delivery timestamps, while outturn `FUELHH` is reported half-hourly. The platform provides two user-selectable alignment modes:

- **Block Hourly (Recommended / Default)**: Maps each hourly forecast to both settlement periods within that hour (e.g. 10:00 forecast applies to 10:00 and 10:30), evaluating all 48 settlement periods per day.
- **Exact Timestamp Matching**: Pairs only periods where `startTime` matches exactly (24 hourly periods per day).

---

## 5. Analytical Methodology & Mathematical Formulations

### 5.1 Day-Ahead Decision Cutoff Logic (Preventing Lookahead Bias)

For any delivery period $T$ on day $D$:
$$\text{Cutoff Timestamp} = (D - 1\text{ day}) \text{ at } 12:00:00\text{ UTC}$$

The algorithm filters all available forecasts where:
$$\text{publishTime} \le \text{Cutoff Timestamp}$$
and selects the most recent publication:
$$F_T = \arg\max_{\text{publishTime} \le \text{Cutoff}} (\text{WINDFOR candidates for } T)$$

_Configurable presets include: D-1 12:00 UTC (Day-Ahead Auction), D-1 17:00 UTC (Afternoon Review), D-1 23:59 UTC (Midnight), and Intraday._

### 5.2 Signed Forecast Error

$$\text{Error}_i = F_i - A_i$$

- **Positive Error ($> 0$)**: Overestimation (Shortfall risk).
- **Negative Error ($< 0$)**: Underestimation (Surplus / curtailment risk).

### 5.3 Mean Absolute Error (MAE)

Measures the average magnitude of error, ignoring direction:
$$\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} |F_i - A_i|$$

### 5.4 Root Mean Square Error (RMSE)

Heavily penalizes volatile and extreme deviations:
$$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^{n} (F_i - A_i)^2}$$

### 5.5 Mean Bias Error (MBE)

Indicates systemic directional bias:
$$\text{MBE} = \frac{1}{n} \sum_{i=1}^{n} (F_i - A_i)$$

### 5.6 Normalized MAE (NMAE)

Expresses MAE as a percentage of average actual generation:
$$\text{NMAE} = \frac{\text{MAE}}{\frac{1}{n}\sum_{i=1}^n A_i} \times 100\%$$

### 5.7 Pearson Correlation Coefficient ($r$)

Measures the linear tracking fidelity between forecast and outturn:
$$r = \frac{\sum_{i=1}^n (A_i - \bar{A})(F_i - \bar{F})}{\sqrt{\sum_{i=1}^n (A_i - \bar{A})^2 \sum_{i=1}^n (F_i - \bar{F})^2}}$$

---

## 6. Repository Structure

```
.
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI entrypoint, middleware, routes
│   │   ├── config.py                  # Environment & domain settings
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py             # Pydantic data contracts
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── elexon_client.py       # Live Elexon BMRS stream integration
│   │   │   ├── data_manager.py        # Central data repository & cache
│   │   │   └── forecast_selector.py   # Anti-lookahead Day-Ahead cutoff engine
│   │   ├── analysis/
│   │   │   ├── __init__.py
│   │   │   └── metrics.py             # MAE, RMSE, MBE, NMAE, Pearson r, Histogram
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes.py              # REST API endpoints
│   │   └── data/
│   │       ├── seed_jan_2026_actuals.json    # 1,488 genuine Jan 2026 FUELHH records
│   │       └── seed_jan_2026_forecasts.json  # 19,272 genuine Jan 2026 WINDFOR records
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_metrics.py            # Unit tests for statistical formulas
│   │   ├── test_forecast_selector.py  # Tests cutoff selection & anti-lookahead
│   │   └── test_api_routes.py         # Integration tests for FastAPI endpoints
│   ├── Dockerfile                     # Python container build
│   └── requirements.txt               # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx             # Brand, date range filter, cutoff modal trigger
│   │   │   ├── KpiCards.jsx           # MAE, RMSE, MBE, Correlation, Peak Error cards
│   │   │   ├── GenerationChart.jsx    # Time series (Actual vs Forecast) & zoom
│   │   │   ├── ErrorDistributionChart.jsx # Signed error bars & histogram bins
│   │   │   ├── IntradayProfileChart.jsx   # 48 Settlement Periods time-of-day curve
│   │   │   ├── DailyAccuracyTable.jsx # 31-day January 2026 leaderboard
│   │   │   ├── HalfHourlyTable.jsx    # Granular data table with search & filter
│   │   │   ├── ForecastEvolutionModal.jsx # Multi-revision history inspector
│   │   │   └── CutoffSettingsModal.jsx    # Day-Ahead cutoff settings & guide
│   │   ├── services/
│   │   │   └── api.js                 # API fetch wrapper
│   │   ├── App.jsx                    # Top-level state & navigation
│   │   ├── index.css                  # Dark trading desk CSS theme
│   │   └── main.jsx
│   ├── Dockerfile                     # Multi-stage Node + Nginx build
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json                    # Vercel deployment rewrite rules
├── docker-compose.yml                 # Multi-container orchestration
├── .gitignore
└── README.md                          # Project documentation
```

---

## 7. Getting Started & Local Execution

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm

### Step 1: Run the Backend

```bash
# From repository root
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend API is accessible at `http://localhost:8000`. Interactive Swagger API docs are available at `http://localhost:8000/docs`.

### Step 2: Run the Frontend

```bash
# Open a new terminal from repository root
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 8. Docker & Containerized Execution

Run the complete multi-container stack with a single command:

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

To stop:

```bash
docker compose down
```

---

## 9. Automated Testing Suite

The backend includes a comprehensive pytest suite verifying accuracy metrics against known mathematical values, cutoff anti-lookahead rules, and API route contracts:

```bash
# From repository root
$env:PYTHONPATH="."  # Windows PowerShell
# or export PYTHONPATH="." on Linux/macOS

.\backend\venv\Scripts\python -m pytest backend/tests -v
```

All 15 tests execute and pass:

```
backend/tests/test_api_routes.py .......          PASSED
backend/tests/test_forecast_selector.py ...       PASSED
backend/tests/test_metrics.py .....               PASSED
======================= 15 passed in 1.89s =======================
```

---

## 10. Deployment Guide (Vercel & Heroku/Render)

### Frontend Deployment on Vercel

1. Push this repository to GitHub.
2. Sign in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Select your repository and set the **Root Directory** to `frontend`.
4. Under **Environment Variables**, set:
   ```
   VITE_API_BASE_URL=https://your-backend-service.onrender.com
   ```
5. Click **Deploy**. `frontend/vercel.json` ensures client-side routing rewrites work out of the box.

### Backend Deployment on Heroku / Render / Railway

1. **Render / Railway**:
   - Create a new **Web Service** from the same repo.
   - Set **Root Directory** to `backend`.
   - Set **Build Command**: `pip install -r requirements.txt`
   - Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
2. **Heroku**:
   - Use the `backend/Dockerfile` or add a `Procfile`:
     ```
     web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - Deploy using the Heroku CLI or GitHub integration.

---

## 11. AI Assistance Disclosure

In compliance with the project guidelines:
AI tools (Google Gemini Advanced Agentic Coding) were utilized to assist with architectural planning, rapid prototyping of data normalization logic, boilerplate generation, and documentation drafting. All code, mathematical calculations, and API integrations were reviewed, audited, and tested by the developer.
