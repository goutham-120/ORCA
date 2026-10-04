# ORCA System Architecture

## Overview
ORCA (Ocean Resource and Contextual Analysis) is a modular marine decision-support platform designed to assist coastal authorities, fishermen, and researchers. The system ingests live meteorological, oceanographic, and geospatial data to generate real-time risk assessments, safe navigation routes, and fishing advisories.

## High-Level Topology

```
+------------------------------------------------------------------+
|                     Client Layer (React / Vite)                  |
|  - Dashboard: Live Marine Conditions & Ocean Pulse KPI Cards    |
|  - Map Explorer: MapLibre GL JS, Vector Layers & NavIC HUD       |
|  - Ask ORCA: Multilingual Marine Intelligence Chatbot            |
|  - Personalization: Coastal Ops, Fisherman, & Researcher Views   |
+---------------------------------+--------------------------------+
                                  | HTTPS / JSON
                                  v
+---------------------------------+--------------------------------+
|                     FastAPI Backend Service                      |
|                                                                  |
|  +---------------------+  +--------------------+  +------------+ |
|  |     API Routers     |  |   Core Services    |  | GIS Engine | |
|  | - /orca/query       |  | - DecisionService  |  | - GeoPandas| |
|  | - /map/layers       |  | - AlertService     |  | - Shapely  | |
|  | - /alerts           |  | - PfzService       |  | - Spatial  | |
|  | - /reports          |  | - NavicService     |  |   Queries  | |
|  +----------+----------+  +---------+----------+  +-----+------+ |
|             |                       |                   |        |
|             +-----------------------+-------------------+        |
|                                     v                            |
|                       Workflow Orchestrator                      |
|                       (LangGraph State Machine)                  |
|                                     |                            |
|             +-----------------------+-------------------+        |
|             |                       |                   |        |
|             v                       v                   v        |
|       Ocean Agent             Weather Agent         GIS Agent    |
+-------------+-----------------------+-------------------+--------+
              |                       |                   |
              v                       v                   v
+-------------+-----------------------+-------------------+--------+
|                      External Providers Layer                    |
|  - Open-Meteo Marine & Weather APIs                              |
|  - INCOIS Potential Fishing Zones (PFZ) Advisories               |
|  - ISRO Earth Observation & NavIC Satellite Orbits              |
|  - OSRM Road Routing API (Coastal Evacuation / Detour)           |
+------------------------------------------------------------------+
```

## Component Breakdown

### 1. Frontend Client
- **Framework**: React 19 bootstrapped with Vite.
- **Mapping**: MapLibre GL JS rendering live bathymetry, cyclone hazard cones, and sea-surface temperature (SST) heatmaps.
- **State & Sync**: Service layer with local offline fallbacks and IndexedDB caching for low-connectivity coastal deployments.
- **Voice & Accessibility**: Web Speech API for voice queries and localized spoken briefings in English, Hindi, Telugu, and Tamil.

### 2. Backend API
- **Framework**: FastAPI (Python 3.10+) running on Uvicorn.
- **Authentication**: JWT token verification (`/auth/login`, `/auth/register`) with stateless session security.
- **Data Coordination**: `DataCoordinator` manages external API caching, throttling, and graceful fallback when third-party endpoints timeout.

### 3. Spatial & Analytics Engine
- **Spatial Primitives**: GeoPandas and Shapely execute spatial joins, point-in-polygon containment checks, and geofencing around restricted coastal waters.
- **Marine Safety Index (MSI)**: Computes deterministic safety scores (0-100) and risk tiers (Low, Moderate, High, Severe) using wind speed, wave height, swell period, and current velocity.
- **Detour & Routing**: Dijkstra / A* graph algorithms for safe marine waypoints combined with OSRM for terrestrial coastal evacuation routes.

### 4. Storage & Persistence
- **Relational DB**: SQLite for local lightweight development; PostgreSQL + PostGIS supported via SQLAlchemy ORM for production.
- **Vector / Knowledge Store**: Embedded Chroma vector store for indexed maritime reference manuals and regulatory documents.
