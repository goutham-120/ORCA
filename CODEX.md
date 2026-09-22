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

### Telugu & Tamil Chatbot Support

Status: Completed

Owner: Ayesha

Task:
Add Telugu and Tamil language support to the existing Ask ORCA conversational chatbot while preserving existing English and Hindi functionality.

Requirements:
- Detect Telugu and Tamil user input.
- Understand Telugu and Tamil queries.
- Generate responses in the same language as the user's input.
- Preserve existing English and Hindi functionality.
- Handle Telugu and Tamil Unicode correctly in frontend and backend.
- Reuse the existing chatbot, query parser, orchestration, and response-generation architecture.
- Do not restructure the project.
- Do not modify unrelated ORCA modules.
- Follow docs/api_contracts.md for existing API request/response formats.
- Add focused tests for Telugu and Tamil.
- Use the existing translation/LLM infrastructure if available; do not introduce unnecessary dependencies.

Example inputs:
- Telugu: "ఈ రోజు సముద్ర వాతావరణం ఎలా ఉంది?"
- Tamil: "இன்று கடல் வானிலை எப்படி உள்ளது?"
- English: "How is the sea weather today?"

Implementation:
1. Inspect the existing Ask ORCA language-detection and response-generation flow.
2. Identify the smallest set of files that need modification.
3. Implement Telugu and Tamil support.
4. Test Telugu, Tamil, English, and existing Hindi behavior.
5. Run the relevant backend/frontend tests.
6. Update only this Task Progress section when the task is completed.

Files Changed: backend/app/core/query_parser.py, backend/app/core/conversation.py, backend/app/core/orchestrator.py, backend/tests/test_conversation.py, frontend/src/utils/speech.js, frontend/src/utils/speechSummary.js, frontend/src/pages/AskOrca.jsx, frontend/src/components/chat/ChatHeader.jsx, frontend/src/components/chat/Message.jsx, frontend/src/components/chat/QueryInput.jsx

Integration Notes: Added deterministic spoken briefing summary generator (`speechSummary.js`) tailored for fishermen and coastal operators (concise briefing with risk level, score, suitability, key wind/wave conditions, action recommendations, and safety limitations; excluding raw API names, timestamps, links, and UI labels). Full technical assessment remains visible in UI. Updated Listen button to display language dynamically (`🔊 Listen (EN)`, `🔊 Listen (HI)`, `🔊 Listen (TE)`, `🔊 Listen (TA)`). Preserved UI language selection authority across English, Hindi, Telugu, and Tamil. Added unit tests in `test_conversation.py`.


### instances: 
### Frontend Platform & UX Foundation
Status: Completed
Completed: Responsive ORCA frontend shell, auth foundation, shared API client, dashboard, and placeholder routes.
Files Changed: frontend/src/{App,main,index,components/layout,components/dashboard,pages/{Login,Register,Dashboard},context,hooks,services/{api,authService}}
Integration Notes: Future pages plug into App.jsx paths and render inside MainLayout; use services/api.js for backend calls.

### Ask ORCA — Conversational Intelligence
Status: Completed
Completed: Added evidence-grounded conversational synthesis, multi-domain/fishing-safety planning, lightweight follow-up context, Hindi MVP parsing/response wrapper, and Ask ORCA chat UI with editable browser speech-to-text.
Files Changed: backend/app/{core/{conversation,orchestrator,query_parser},workflows/orca_graph.py,schemas/orca.py}; backend/tests/test_conversation.py; frontend/src/{pages/AskOrca.jsx,components/chat,services/orcaService.js,App.jsx,App.css}; docs/api_contracts.md
Integration Notes: Reuses existing Ocean/Weather tools through DataCoordinator and GISAgent unchanged. Coordinates supplied by Map Explorer can be sent as request location; place names are never geocoded. No LLM or translation service is required: deterministic synthesis exposes evidence, unavailable data, current-only time limitations, and PFZ unavailability. Voice uses the browser Web Speech API and falls back to editable text on unsupported/denied browsers.

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
Status: Completed
Completed: Added deterministic GeoJSON-compatible geometry, layers, spatial and temporal queries, GIS tool/agent orchestration, and focused GIS analysis helpers. Caller-provided layers are explicitly marked static; absent live GIS data is unavailable rather than fabricated. Tests: `python -m compileall -q app tests` and `python -m unittest discover -s tests -v` (13 passed).
Files Changed: backend/app/{gis,tools/gis_tools.py,agents/gis_agent.py,analysis/{pfz_analysis.py,safety_analysis.py,route_analysis.py,investigation.py},core/query_parser.py,workflows/orca_graph.py}; backend/tests/test_gis.py
Integration Notes: The workflow now runs GIS alongside selected Ocean/Weather domains without using DataCoordinator for GIS. Supply layers through query context metadata as `gis_layers`; GIS evidence preserves static/unavailable provenance. No live GIS provider or data source is configured.

### Backend Platform & API Foundation
Status: Completed
Completed: Runnable FastAPI foundation, schemas, routers, services, workflow interfaces, and DB configuration.
Files Changed: backend/app/{main,config,api,core,workflows,services,models,schemas,database,utils,analysis}; docs/api_contracts.md
Integration Notes: Agents register through workflow/data-coordination interfaces; database remains optional until ORCA_DATABASE_URL is supplied.

### Sprint 2 — Conversational Intelligence, Dynamic Agentic Execution & Proactive Safety
Status: Completed
Completed: Added complete end-to-end conversational intelligence compliance fulfilling all 16 Problem Statement requirements:
1. Dynamic Step-by-Step Agentic Execution Tracking (`execution_steps`, tool call inputs/outputs, dynamic status) in `orca_graph.py` and `ReasoningTrace.jsx`.
2. Proactive Hazard & Geofencing Intelligence (`/alerts/check` endpoint in `alerts.py` & `alert_service.py`, proactive safety toast banner in `ProactiveAlertBanner.jsx` with action directives).
3. Stateful Rolling Multi-turn Conversation Memory (`history` payload, `ConversationStore` session history).
4. Inline Geospatial Situational Mini-Maps (`ChatMiniMap.jsx` MapLibre integration in chat message cards with route lines, waypoints, PFZ coordinates, hazards, and full-map deep-link navigation).
5. Persona-adapted multi-lingual spoken summaries & safety reasoning for Fishermen, Navigators, Port Authorities, and Scientists.
Files Changed: backend/app/{schemas/{ai.py,orca.py},core/{conversation_store.py,orchestrator.py},services/alert_service.py,api/alerts.py,workflows/orca_graph.py}, frontend/src/{services/orcaService.js,components/chat/{ChatMiniMap.jsx,ChatMiniMap.css,ProactiveAlertBanner.jsx,ProactiveAlertBanner.css,ReasoningTrace.jsx,Message.jsx},pages/AskOrca.jsx}
Integration Notes: Clean frontend build (`npm run build`) and zero python compilation errors. Seamlessly backwards-compatible with existing API contracts.


