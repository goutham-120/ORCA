# ORCA

## Project
ORCA is a marine decision-support platform that answers location- and
time-specific queries using live ocean, weather, satellite, and GIS data.

## Stack
- Frontend: React + Vite + JavaScript + ESLint
- Backend: Python + FastAPI
- AI Orchestration: LangGraph
- GIS: GeoPandas + Shapely
- Database: PostgreSQL + PostGIS
- Maps: MapLibre GL JS

## Core Flow
User → FastAPI → Query Understanding → Planner →
Ocean / Weather / GIS Agents → Analysis →
Evidence-backed Recommendation → Frontend

## Main Modules
- Authentication
- Dashboard
- Ask ORCA
- Map Explorer
- Alerts
- Reports

## Architecture Rules
- Use the existing project structure; do not restructure it.
- Keep frontend, API, agents, analysis, GIS, and data-provider logic separate.
- Live data access belongs in `providers/` and `tools/`, not agents or analysis.
- Agents gather and interpret data; analysis modules perform domain calculations.
- Shared request/response formats must follow `docs/api_contracts.md`.
- Do not change shared contracts unless explicitly required.
- Use environment variables for secrets and API keys.
- Add basic validation and error handling.
- Avoid modifying files outside the assigned task.
- At task completion, update only the assigned `Task Progress` section in `CODEX.md`.

## Shared Documentation
Read only what is relevant to the assigned task:
- `docs/architecture.md` — component boundaries and system flow
- `docs/api_contracts.md` — API request/response formats
- `docs/data_sources.md` — live data provider specifications

## Data Flow
providers → tools → agents → analysis → API → frontend

## Development
Frontend:
`cd frontend && npm run dev`

Backend:
`cd backend`
Activate `.venv`, then:
`uvicorn app.main:app --reload`


## Task Progress

Each Codex instance must update only its assigned section after completing
its task. Keep entries brief.

### instances: 
### Frontend Platform & UX Foundation
Status: Completed
Completed: Responsive ORCA frontend shell, auth foundation, shared API client, dashboard, and placeholder routes.
Files Changed: frontend/src/{App,main,index,components/layout,components/dashboard,pages/{Login,Register,Dashboard},context,hooks,services/{api,authService}}
Integration Notes: Future pages plug into App.jsx paths and render inside MainLayout; use services/api.js for backend calls.

### Ask ORCA — Conversational Intelligence
Status: Not Started
Completed:
Files Changed:
Integration Notes:

### Map Explorer — Geospatial Interface
Status: Not Started
Completed:
Files Changed:
Integration Notes:

### Ocean & Weather Data Intelligence
Status: Completed
Owner: Ocean & Weather Data Intelligence
Completed: Added live Open-Meteo weather and marine retrieval, normalized observations, cache-on-provider-failure handling, domain agents, and existing-workflow integration.
Files Changed: backend/app/{agents,providers,tools,core/query_parser.py,workflows/orca_graph.py}; backend/tests/test_ocean_weather.py
Integration Notes: The existing DataCoordinator preserves injected weather/ocean tools and registers defaults only when absent. Query-selected weather/ocean domains execute; other requested domains remain pending for their future workstreams. Provider status is preserved in evidence as live, cached, or unavailable. No credentials are required.

### GIS & Spatial Analytics
Status: Not Started
Completed:
Files Changed:
Integration Notes:

### Backend Platform & API Foundation
Status: Completed
Completed: Runnable FastAPI foundation, schemas, routers, services, workflow interfaces, and DB configuration.
Files Changed: backend/app/{main,config,api,core,workflows,services,models,schemas,database,utils,analysis}; docs/api_contracts.md
Integration Notes: Agents register through workflow/data-coordination interfaces; database remains optional until ORCA_DATABASE_URL is supplied.
