# ORCA External Data Sources & Ingestion

## Summary
ORCA relies on four primary data integration pillars to power real-time safety assessments and geospatial analytics.

| Data Domain | Provider / Source | Protocol / Format | Update Cadence | Fallback Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Marine Conditions** | Open-Meteo Marine API | REST / JSON | Hourly | Cached observation cache; synthetic baseline |
| **Atmospheric Weather**| Open-Meteo Weather API | REST / JSON | Hourly | Cached forecast; regional coastal averages |
| **Fishing Zones (PFZ)** | INCOIS Advisories | GeoJSON / REST | Daily | Historical seasonal fishing grounds |
| **Satellite Intelligence**| ISRO / NavIC Feeds | REST / TLE Orbit Math | Real-time calculation | SGP4 orbital propagation model |
| **Coastal Road Detours**| Open Source Routing Machine (OSRM) | REST / GeoJSON | Real-time | Great-circle nautical navigation fallback |

---

## 1. Open-Meteo Marine & Atmospheric API
- **Endpoint**: `https://marine-api.open-meteo.com/v1/marine` and `https://api.open-meteo.com/v1/forecast`
- **Metrics Collected**:
  - Wave Height (m), Wave Direction (deg), Wave Period (s)
  - Wind Speed (km/h), Wind Gusts (km/h), Wind Direction (deg)
  - Sea Surface Temperature (SST, °C)
  - Surface Current Velocity (knots)
- **Role in Platform**: Ingested by `OceanAgent` and `WeatherAgent` to calculate the composite Marine Safety Index (MSI).

---

## 2. INCOIS Potential Fishing Zone (PFZ) Advisories
- **Provider**: Indian National Centre for Ocean Information Services (INCOIS), Hyderabad.
- **Data Attributes**:
  - Ocean chlorophyll concentrations (`mg/m³`)
  - Sea surface temperature gradients and thermal oceanic fronts
  - Recommended fish species compositions (Tuna, Mackerel, Sardines)
  - Distance from port / coastal base and compass bearings
- **Role in Platform**: Rendered on the Map Explorer as interactive PFZ polygons and queried by `FishermanPersonalization` views.

---

## 3. ISRO Earth Observation & NavIC Constellation
- **Provider**: Indian Space Research Organisation (ISRO).
- **Data Attributes**:
  - NavIC regional positioning satellite health and signal availability
  - Satellite overpass timings and orbital trajectories
  - INSAT-3D/3DR coastal cloud imagery layers
- **Role in Platform**: Powers the `SatelliteOrbitHUD` component and coastal alert broadcast systems.

---

## 4. OSRM Road Routing
- **Provider**: Open Source Routing Machine (public demo & local instance support).
- **Data Attributes**:
  - Turn-by-turn road networks connecting landing jetties, coastal hospitals, and cyclone shelters.
- **Role in Platform**: Enables the emergency detour engine when sea routes are blocked by hazardous weather.
