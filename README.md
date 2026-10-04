<p align="center">
  <img src="frontend/public/orcalogo.png" width="130" alt="ORCA Logo" />
</p>

<h1 align="center">ORCA — Ocean Resource & Contextual Analysis</h1>

<p align="center">
  <b>A Multimodal Marine Decision-Support Platform for Coastal Safety, NavIC Tracking, and High-Yield Fishing Intelligence</b>
</p>

<p align="center">
  <a href="#features"><img src="https://img.shields.io/badge/Frontend-React_19_%2B_Vite-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="#features"><img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
  <a href="#features"><img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.10+" /></a>
  <a href="#features"><img src="https://img.shields.io/badge/Maps-MapLibre_GL_JS-396CB4?style=flat-square&logo=maplibre&logoColor=white" alt="MapLibre" /></a>
  <a href="#features"><img src="https://img.shields.io/badge/Geospatial-GeoPandas_%2B_Shapely-139C5A?style=flat-square" alt="GeoPandas" /></a>
  <a href="#features"><img src="https://img.shields.io/badge/Database-PostgreSQL_%2B_PostGIS-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
  <a href="#features"><img src="https://img.shields.io/badge/PWA-Mobile_Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA" /></a>
</p>

---

## Overview

**ORCA (Ocean Resource and Contextual Analysis)** is an end-to-end maritime intelligence and coastal safety system. Built to address real-world coastal operations and disaster management challenges, ORCA synthesizes live oceanographic observations, atmospheric forecasts, satellite orbits, and geospatial boundaries into actionable, localized insights.

From small-craft fishermen needing spoken vernacular weather safety briefings to port authorities monitoring maritime distress and hazard perimeters, ORCA delivers real-time situational awareness across India's coastline.

---

## 🎥 Prototype Demo Video

<p align="center">
  <a href="https://www.youtube.com/watch?v=RA6qrDFKa_c">
    <img src="https://img.youtube.com/vi/RA6qrDFKa_c/maxresdefault.jpg" width="85%" alt="ORCA - SIH26176 Prototype Explanation" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  </a>
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=RA6qrDFKa_c">
    <b>▶️ Click here to watch the full Prototype Walkthrough (SIH26176) on YouTube</b>
  </a>
</p>

---

## Key Features

### 🌊 1. Marine Safety Index (MSI)
- Deterministic 0–100 safety score and risk classification (**Low**, **Moderate**, **High**, **Severe**).
- Computes multidimensional thresholds across wave height, swell period, wind gust speed, and tidal flows.
- Automatically generates concrete operational directives (e.g., *"Restrict operations beyond 5 nautical miles"*).

### 🐟 2. INCOIS Potential Fishing Zones (PFZ)
- Direct integration with **INCOIS** ocean chlorophyll concentration and sea-surface temperature (SST) gradients.
- Interactive vector polygons displaying recommended target species (Tuna, Mackerel, Sardines), distance from port, and compass bearings.
- Live routing from vessel GPS coordinates directly to high-yield fishing zones.

### 🛰️ 3. ISRO Earth Observation & NavIC Tracking
- **NavIC Constellation Monitor**: Real-time Space Vehicle (SV) health, orbital positions, and Geometric Dilution of Precision (GDOP).
- **Satellite Overpass HUD**: Visualizes upcoming passes of Indian remote sensing satellites over user coordinates.
- **Emergency SOS Transponder**: One-click distress beacon broadcasting vessel position, battery level, and emergency alerts.

### 🎙️ 4. Ask ORCA — Multilingual Voice Intelligence
- Conversational decision support with localized text-to-speech briefings tailored for coastal communities.
- Native support for **English**, **Hindi (हिन्दी)**, **Telugu (తెలుగు)**, and **Tamil (தமிழ்)**.
- Evidence-grounded responses displaying telemetry provenance badges (Live, Cached, Unavailable).

### 🗺️ 5. Multi-Modal Navigational Detours
- **Bathymetric Pathfinding**: Identifies safe marine waypoints avoiding shallow shoals, restricted naval perimeters, and active cyclone cones.
- **OSRM Land-to-Shore Routing**: Seamless road routing to nearest safe landing jetties, cyclone shelters, or coastal medical facilities when sea transit is compromised.

### 🌪️ 6. Marine Scenario Simulator
- Perturbation modeling engine testing environmental stress scenarios (SST thermal anomalies, wave surges, cyclone intensification).
- Allows researchers and disaster planners to project impact radii and calculate risk deltas before deploying offshore resources.

---

## Persona-Driven Workflows

| Persona | Primary Focus & Dashboard Modules |
| :--- | :--- |
| **Traditional Fishermen** | Spoken vernacular audio briefings, PFZ fish locations, SOS emergency beacon, and simple safe-to-venture indicators. |
| **Coastal Authorities** | Vessel Monitoring System (VMS), AIS telemetry feeds, broadcast hazard alerts, and community grievance resolution. |
| **Marine Scientists** | Oceanographic anomalies, SST gradients, historical environmental logs, and climate simulation perturbations. |

---

## System Architecture

<p align="center">
  <img src="docs/architecture.png" width="95%" alt="ORCA End-to-End System Architecture" style="border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);" />
</p>

The ORCA system is architected across a 5-tier pipeline:
1. **User Entry & Multimodal Inputs**: GPS telemetry, Web Speech voice recognition in 4 coastal languages (English, Hindi, Telugu, Tamil), and map interactions.
2. **FastAPI Gateway & Autonomous Planner**: Query parsing and LangGraph dynamic subtask decomposition.
3. **Parallel Domain Multi-Agents**: Specialized workers (`OceanAgent`, `WeatherAgent`, `GISAgent`, `SatelliteAgent`) concurrently pulling from Open-Meteo, INCOIS PFZ, and ISRO NavIC.
4. **Marine Risk Intelligence**: The Marine Safety Index (MSI 0–100) engine evaluating cyclone cones and geofenced hazard zones into deterministic verdicts (Safe, Moderate, Severe).
5. **Synthesis & Multimodal Delivery**: Grounded evidence synthesis delivering interactive MapLibre routes, spoken audio briefings, and emergency SOS alerts.

---

## Quick Start

### Prerequisites
- **Node.js** (v18 or newer)
- **Python** (v3.10 or newer)
- **Git**

---

### 1. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1    # On Linux/macOS: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload
```

* Backend API will be live at: `http://localhost:8000`
* Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`
* API Health Check: `http://localhost:8000/health`

---

### 2. Frontend Setup

In a new terminal:

```powershell
# Navigate to frontend directory
cd frontend

# Install packages
npm install

# Launch development server
npm run dev
```

* Frontend will be live at: `http://localhost:5173`

---

### 3. Optional: PostgreSQL + PostGIS with Docker

For local PostGIS spatial persistence:

```powershell
docker compose up -d postgres
pip install -r backend/requirements-postgres.txt
```

Set `ORCA_DATABASE_URL=postgresql://user:password@localhost:5433/orca` in `backend/.env`.

---

## Testing & Quality Assurance

```powershell
# Run backend test suite
cd backend
python -m unittest discover -s tests -v

# Run frontend production build
cd frontend
npm run build

# Run frontend linting
npm run lint
```

---

## Repository Structure

```text
ORCA/
├── backend/
│   ├── app/
│   │   ├── agents/          # Ocean, weather, and GIS specialized agents
│   │   ├── analysis/        # Marine safety index (MSI) & detour algorithms
│   │   ├── api/             # FastAPI REST endpoints
│   │   ├── core/            # Query parsing & conversation store
│   │   ├── providers/       # Open-Meteo, INCOIS, & ISRO data adapters
│   │   ├── services/        # Decision, alert, and navigation services
│   │   └── workflows/       # LangGraph multi-agent execution pipeline
│   └── tests/               # Automated unit & integration tests
├── docs/
│   ├── architecture.md      # Detailed system architecture specification
│   └── data_sources.md      # Live telemetry providers & ingestion specs
├── frontend/
│   ├── public/              # Icons, manifest.json & PWA service workers
│   └── src/
│       ├── components/      # MapLibre canvas, HUDs, charts, and chat cards
│       ├── pages/           # Dashboard, AskOrca, MapExplorer, Simulator
│       └── services/        # API clients and offline synchronization
└── docker-compose.yml       # Local PostGIS container configuration
```

---

## Documentation

* [System Architecture Specification](docs/architecture.md)
* [External Data Sources & Ingestion Matrix](docs/data_sources.md)
* Interactive REST Documentation: Run the backend and visit `/docs`.
