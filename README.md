# ORCA

**Ocean Resource and Contextual Analysis (ORCA)** is a marine decision-support application for exploring ocean and weather conditions, coastal safety, and location-specific marine questions. It combines a React web interface with a FastAPI service and GIS analysis components.

## Features

- **Dashboard** for marine conditions, safety summaries, and recent activity.
- **Ask ORCA** for conversational, evidence-based marine and weather information, with English, Hindi, Telugu, and Tamil support.
- **Map Explorer** for viewing map layers and spatial information.
- **Alerts and coastal tools** for safety checks, reports, and coastal authority workflows.
- **Reports and personalization** for saved or role-oriented views.
- **Backend API** for authentication, conversations, maps, alerts, reports, and decision support.

The application can use Open-Meteo for marine and weather data. GIS layers and other live sources depend on the configured provider and deployment environment. When a source is unavailable, the API can report unavailable or cached evidence; do not treat demo or static layers as live observations.

## Technology

- Frontend: React, Vite, JavaScript, MapLibre GL
- Backend: Python, FastAPI, Uvicorn
- Workflow orchestration: LangGraph
- Geospatial processing: GeoPandas, Shapely
- Persistence: SQLite for local development; optional PostgreSQL

## Requirements

- Node.js and npm
- Python 3.10 or newer
- Windows PowerShell, macOS, or Linux shell

PostgreSQL is optional for local development. The frontend and backend use separate terminals during development.

## Quick start

### 1. Configure the backend

From the repository root, create and activate a virtual environment, then install the backend requirements:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

On macOS or Linux, activate with `source .venv/bin/activate` instead.

The backend reads `backend/.env` when present. It can run without a custom environment file, using a local SQLite database. Optional configuration keys include:

```dotenv
ORCA_ENVIRONMENT=development
ORCA_JWT_SECRET=replace-with-a-long-random-secret
ORCA_ADMIN_EMAIL=admin@example.com
ORCA_ADMIN_PASSWORD=replace-with-a-strong-password
ORCA_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
# Optional PostgreSQL persistence:
# ORCA_DATABASE_URL=postgresql://user:password@localhost:5432/orca
# Optional LLM integration:
# GROQ_API_KEY=your-key
```

Keep real secrets in local environment files or a secrets manager. Do not commit credentials. PostgreSQL support additionally requires:

```powershell
python -m pip install -r requirements-postgres.txt
```

### 2. Start the backend

From `backend/`, with the virtual environment active:

```powershell
uvicorn app.main:app --reload
```

By default, the API is at `http://127.0.0.1:8000`. Interactive API documentation is at `http://127.0.0.1:8000/docs`, and the health endpoint is `http://127.0.0.1:8000/health`.

### 3. Configure and start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually `http://localhost:5173`). Set `VITE_API_BASE_URL` in `frontend/.env.local` if the backend runs at a different address:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The map can use a configured `VITE_MAP_API_KEY` where required by the chosen map service. Do not commit private keys.

## PostgreSQL with Docker Compose

The included Compose file starts a local PostGIS database:

```powershell
docker compose up -d postgres
```

Install `backend/requirements-postgres.txt` and set `ORCA_DATABASE_URL` to the database URL that matches your local Compose configuration before launching the backend. The service maps PostgreSQL to host port `5433`.

## Useful commands

Run the frontend production build:

```powershell
cd frontend
npm run build
```

Run the frontend linter:

```powershell
cd frontend
npm run lint
```

Run backend tests with the project virtual environment active:

```powershell
cd backend
python -m unittest discover -s tests -v
```

## Repository layout

```text
ORCA/
├── backend/
│   ├── app/
│   │   ├── agents/       # Ocean, weather, and GIS agents
│   │   ├── analysis/     # Marine safety, route, and PFZ analysis
│   │   ├── api/          # FastAPI routers
│   │   ├── providers/    # External and demo data providers
│   │   ├── services/     # Data and domain services
│   │   └── workflows/    # ORCA orchestration graph
│   └── tests/
├── docs/                 # Architecture, data sources, API contracts
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       └── services/
└── docker-compose.yml
```

## Architecture and API references

- [Architecture](docs/architecture.md)
- [Data sources](docs/data_sources.md)
- [API contracts](docs/api_contracts.md)

## Development notes

- The backend loads `backend/.env`; the frontend uses Vite environment variables such as those in `frontend/.env.local`.
- The frontend expects the backend at `http://127.0.0.1:8000` unless `VITE_API_BASE_URL` is overridden.
- SQLite is the default local persistence option. PostgreSQL is optional and configured with `ORCA_DATABASE_URL`.
- Do not assume that a successful demo response represents a live external data source. Check the evidence and provider status returned by the relevant API.
