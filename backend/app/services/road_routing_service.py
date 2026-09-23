"""Service for Land-to-Shore Road Routing and Nearest Harbor Discovery.

Provides:
1. Coastal fishing harbor and fish landing center registry across Indian maritime states.
2. Nearest harbor/boat jetty discovery for any coordinate.
3. Open-source road routing via Open Source Routing Machine (OSRM) with resilient offline fallback.
"""

from __future__ import annotations

import logging
from math import asin, cos, radians, sin, sqrt
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Complete Registry of Indian Coastal Fishing Harbors, Fish Landing Centers & Ports
INDIAN_COASTAL_HARBORS: list[dict[str, Any]] = [
    # Gujarat
    {"id": "veraval", "name": "Veraval Fishing Harbor", "state": "Gujarat", "lat": 20.9077, "lon": 70.3679, "type": "Major Fishing Harbor"},
    {"id": "mangrol", "name": "Mangrol Fishing Harbor", "state": "Gujarat", "lat": 21.1215, "lon": 70.1165, "type": "Fishing Harbor"},
    {"id": "porbandar", "name": "Porbandar Harbor", "state": "Gujarat", "lat": 21.6417, "lon": 69.6293, "type": "Major Fishing Harbor"},
    {"id": "okha", "name": "Okha Port Jetty", "state": "Gujarat", "lat": 22.4644, "lon": 69.0722, "type": "Port / Landing Center"},
    {"id": "jafrabad", "name": "Jafrabad Fishing Harbor", "state": "Gujarat", "lat": 20.8683, "lon": 71.3653, "type": "Fishing Harbor"},
    {"id": "vanakbara", "name": "Vanakbara Fish Landing Center", "state": "Gujarat", "lat": 20.7183, "lon": 70.8872, "type": "Fish Landing Center"},
    {"id": "jakhau", "name": "Jakhau Fishing Port", "state": "Gujarat", "lat": 23.2389, "lon": 68.6944, "type": "Fishing Harbor"},
    {"id": "kandla", "name": "Deendayal Port (Kandla)", "state": "Gujarat", "lat": 23.0033, "lon": 70.2186, "type": "Major Port"},

    # Maharashtra
    {"id": "sassoon_dock", "name": "Sassoon Dock Fishing Harbor (Mumbai)", "state": "Maharashtra", "lat": 18.9167, "lon": 72.8250, "type": "Major Fishing Harbor"},
    {"id": "bhaucha_dhakka", "name": "Bhaucha Dhakka (Ferry Wharf)", "state": "Maharashtra", "lat": 18.9553, "lon": 72.8519, "type": "Major Fish Landing Center"},
    {"id": "versova", "name": "Versova Fishing Village Jetty", "state": "Maharashtra", "lat": 19.1350, "lon": 72.8080, "type": "Fish Landing Center"},
    {"id": "uttan", "name": "Uttan Fishery Wharf (Bhayandar)", "state": "Maharashtra", "lat": 19.2825, "lon": 72.7842, "type": "Fish Landing Center"},
    {"id": "vasai_killa", "name": "Vasai Killa Fish Landing Jetty", "state": "Maharashtra", "lat": 19.3305, "lon": 72.8105, "type": "Fish Landing Center"},
    {"id": "arnala", "name": "Arnala Fishing Harbor (Virar)", "state": "Maharashtra", "lat": 19.4502, "lon": 72.7485, "type": "Fishing Harbor"},
    {"id": "satpati", "name": "Satpati Fishery Harbor (Palghar)", "state": "Maharashtra", "lat": 19.7280, "lon": 72.7050, "type": "Major Fishing Harbor"},
    {"id": "dahanu", "name": "Dahanu Fishery Wharf", "state": "Maharashtra", "lat": 19.9703, "lon": 72.7311, "type": "Fish Landing Center"},
    {"id": "alibag", "name": "Alibag Coastal Landing", "state": "Maharashtra", "lat": 18.6414, "lon": 72.8722, "type": "Fish Landing Center"},
    {"id": "murud_janjira", "name": "Murud Janjira Fishery Jetty", "state": "Maharashtra", "lat": 18.3000, "lon": 72.9600, "type": "Fish Landing Center"},
    {"id": "shrivardhan", "name": "Shrivardhan Fishery Wharf", "state": "Maharashtra", "lat": 18.0333, "lon": 73.0167, "type": "Fish Landing Center"},
    {"id": "harnai", "name": "Harnai Fishery Port (Suvarnadurg)", "state": "Maharashtra", "lat": 17.8167, "lon": 73.0833, "type": "Major Fishing Harbor"},
    {"id": "dabhol_anjanwel", "name": "Dabhol / Anjanwel Fishery Jetty", "state": "Maharashtra", "lat": 17.5850, "lon": 73.1600, "type": "Fish Landing Center"},
    {"id": "guhagar", "name": "Guhagar Fish Landing Center", "state": "Maharashtra", "lat": 17.4833, "lon": 73.1833, "type": "Fish Landing Center"},
    {"id": "jaigad", "name": "Jaigad Port & Fishery Jetty", "state": "Maharashtra", "lat": 17.3000, "lon": 73.2167, "type": "Fish Landing Center"},
    {"id": "ganpatipule", "name": "Ganpatipule Coastal Landing", "state": "Maharashtra", "lat": 17.1450, "lon": 73.2650, "type": "Fish Landing Center"},
    {"id": "ratnagiri_mirkarwada", "name": "Mirkarwada Fishing Harbor (Ratnagiri)", "state": "Maharashtra", "lat": 16.9833, "lon": 73.2833, "type": "Major Fishing Harbor"},
    {"id": "devgad", "name": "Devgad Fishery Harbor", "state": "Maharashtra", "lat": 16.3800, "lon": 73.3750, "type": "Fishing Harbor"},
    {"id": "malvan", "name": "Malvan Fishery Port", "state": "Maharashtra", "lat": 16.0594, "lon": 73.4686, "type": "Fish Landing Center"},
    {"id": "vengurla", "name": "Vengurla Port & Fishery Jetty", "state": "Maharashtra", "lat": 15.8600, "lon": 73.6300, "type": "Fish Landing Center"},

    # Goa
    {"id": "panaji_betim", "name": "Betim / Panaji Fishery Jetty", "state": "Goa", "lat": 15.5033, "lon": 73.8267, "type": "Fishing Harbor"},
    {"id": "mormugao", "name": "Mormugao Fishery Harbor", "state": "Goa", "lat": 15.4167, "lon": 73.8000, "type": "Major Port / Harbor"},
    {"id": "cutbona", "name": "Cutbona Fishing Harbor", "state": "Goa", "lat": 15.1764, "lon": 73.9486, "type": "Major Fishing Harbor"},
    {"id": "chapora", "name": "Chapora Fishery Jetty", "state": "Goa", "lat": 15.6050, "lon": 73.7380, "type": "Fish Landing Center"},

    # Karnataka
    {"id": "mangalore_old_port", "name": "Old Mangalore Port (Bunder)", "state": "Karnataka", "lat": 12.8583, "lon": 74.8361, "type": "Major Fishing Harbor"},
    {"id": "malpe", "name": "Malpe Fishing Harbor (Udupi)", "state": "Karnataka", "lat": 13.3500, "lon": 74.7000, "type": "Major Fishing Harbor"},
    {"id": "gangolli", "name": "Gangolli Fish Landing Center", "state": "Karnataka", "lat": 13.6333, "lon": 74.6667, "type": "Fishing Harbor"},
    {"id": "honnavar", "name": "Honnavar Fishery Harbor", "state": "Karnataka", "lat": 14.2833, "lon": 74.4500, "type": "Fishing Harbor"},
    {"id": "tadadi", "name": "Tadadi Fishery Port (Gokarna)", "state": "Karnataka", "lat": 14.5167, "lon": 74.3667, "type": "Fishing Harbor"},
    {"id": "karwar_baithkol", "name": "Baithkol Fishing Harbor (Karwar)", "state": "Karnataka", "lat": 14.8000, "lon": 74.1167, "type": "Major Fishing Harbor"},

    # Kerala
    {"id": "kochi_thoppumpady", "name": "Thoppumpady Cochin Fisheries Harbor", "state": "Kerala", "lat": 9.9333, "lon": 76.2667, "type": "Major Fishing Harbor"},
    {"id": "munambam", "name": "Munambam Fishing Harbor", "state": "Kerala", "lat": 10.1833, "lon": 76.1667, "type": "Major Fishing Harbor"},
    {"id": "neendakara", "name": "Neendakara Fishing Harbor (Kollam)", "state": "Kerala", "lat": 8.9333, "lon": 76.5333, "type": "Major Fishing Harbor"},
    {"id": "shaktikulangara", "name": "Shaktikulangara Fishery Port", "state": "Kerala", "lat": 8.9167, "lon": 76.5500, "type": "Fishing Harbor"},
    {"id": "vizhinjam", "name": "Vizhinjam Fishery Harbor (Thiruvananthapuram)", "state": "Kerala", "lat": 8.3833, "lon": 76.9833, "type": "Major Fishing Harbor"},
    {"id": "beypore", "name": "Beypore Port & Fishing Harbor (Kozhikode)", "state": "Kerala", "lat": 11.1667, "lon": 75.8000, "type": "Fishing Harbor"},
    {"id": "puthiyappa", "name": "Puthiyappa Fishing Harbor", "state": "Kerala", "lat": 11.3167, "lon": 75.7500, "type": "Fishing Harbor"},
    {"id": "kannur_ayikkara", "name": "Ayikkara Fishing Harbor (Kannur)", "state": "Kerala", "lat": 11.8500, "lon": 75.3667, "type": "Fishing Harbor"},
    {"id": "thottada", "name": "Thottada Fish Landing Center", "state": "Kerala", "lat": 11.8200, "lon": 75.4100, "type": "Fish Landing Center"},
    {"id": "thottappally", "name": "Thottappally Spillway Harbor", "state": "Kerala", "lat": 9.3167, "lon": 76.3833, "type": "Fishing Harbor"},
    {"id": "kayamkulam", "name": "Kayamkulam Fishing Harbor", "state": "Kerala", "lat": 9.1333, "lon": 76.4667, "type": "Fishing Harbor"},
    {"id": "ponnani", "name": "Ponnani Fishing Harbor", "state": "Kerala", "lat": 10.7833, "lon": 75.9167, "type": "Fishing Harbor"},

    # Tamil Nadu
    {"id": "kasimedu", "name": "Kasimedu Fisheries Harbor (Chennai)", "state": "Tamil Nadu", "lat": 13.1264, "lon": 80.2978, "type": "Major Fishing Harbor"},
    {"id": "cuddalore", "name": "Cuddalore Fishing Harbor", "state": "Tamil Nadu", "lat": 11.7167, "lon": 79.7667, "type": "Fishing Harbor"},
    {"id": "nagapattinam", "name": "Nagapattinam Fishing Harbor", "state": "Tamil Nadu", "lat": 10.7667, "lon": 79.8500, "type": "Major Fishing Harbor"},
    {"id": "rameswaram", "name": "Rameswaram Fishing Jetty", "state": "Tamil Nadu", "lat": 9.2878, "lon": 79.3128, "type": "Major Fishing Harbor"},
    {"id": "tuticorin", "name": "Tuticorin Fishing Harbor (V.O.C.)", "state": "Tamil Nadu", "lat": 8.7833, "lon": 78.1667, "type": "Major Fishing Harbor"},
    {"id": "kanyakumari", "name": "Chinnamuttom Fishing Harbor (Kanyakumari)", "state": "Tamil Nadu", "lat": 8.0933, "lon": 77.5614, "type": "Major Fishing Harbor"},
    {"id": "colachel", "name": "Colachel Fishing Harbor", "state": "Tamil Nadu", "lat": 8.1750, "lon": 77.2583, "type": "Fishing Harbor"},
    {"id": "muttom", "name": "Muttom Fish Landing Center", "state": "Tamil Nadu", "lat": 8.1250, "lon": 77.3167, "type": "Fish Landing Center"},
    {"id": "pamban", "name": "Pamban Fishery Wharf", "state": "Tamil Nadu", "lat": 9.2789, "lon": 79.2136, "type": "Fishing Harbor"},
    {"id": "mallipattinam", "name": "Mallipattinam Fishing Harbor", "state": "Tamil Nadu", "lat": 10.2783, "lon": 79.3167, "type": "Fishing Harbor"},
    {"id": "pazhaiyar", "name": "Pazhaiyar Fishing Harbor", "state": "Tamil Nadu", "lat": 11.3583, "lon": 79.8250, "type": "Fishing Harbor"},

    # Andhra Pradesh
    {"id": "visakhapatnam", "name": "Visakhapatnam Fishing Harbor", "state": "Andhra Pradesh", "lat": 17.6961, "lon": 83.2986, "type": "Major Fishing Harbor"},
    {"id": "bhavanapadu", "name": "Bhavanapadu Fishing Harbor", "state": "Andhra Pradesh", "lat": 18.5667, "lon": 84.3500, "type": "Fishing Harbor"},
    {"id": "kakinada", "name": "Kakinada Fisheries Harbor", "state": "Andhra Pradesh", "lat": 16.9667, "lon": 82.2667, "type": "Major Fishing Harbor"},
    {"id": "machilipatnam", "name": "Machilipatnam (Gilakaladindi) Harbor", "state": "Andhra Pradesh", "lat": 16.1667, "lon": 81.1667, "type": "Fishing Harbor"},
    {"id": "nizampatnam", "name": "Nizampatnam Fishing Harbor", "state": "Andhra Pradesh", "lat": 15.9000, "lon": 80.6667, "type": "Fishing Harbor"},
    {"id": "krishnapatnam", "name": "Krishnapatnam Port & Fishery Jetty", "state": "Andhra Pradesh", "lat": 14.2500, "lon": 80.1167, "type": "Port / Landing Center"},
    {"id": "vodarevu", "name": "Vodarevu Fish Landing Center", "state": "Andhra Pradesh", "lat": 15.7950, "lon": 80.3700, "type": "Fish Landing Center"},

    # Odisha
    {"id": "paradeep", "name": "Paradeep Fishing Harbor", "state": "Odisha", "lat": 20.3167, "lon": 86.6167, "type": "Major Fishing Harbor"},
    {"id": "dhamra", "name": "Dhamra Fishing Harbor", "state": "Odisha", "lat": 20.8000, "lon": 86.9500, "type": "Major Fishing Harbor"},
    {"id": "astarang", "name": "Astarang (Nuagarh) Fishing Harbor", "state": "Odisha", "lat": 19.9833, "lon": 86.2667, "type": "Fishing Harbor"},
    {"id": "gopalpur", "name": "Gopalpur Fishery Jetty", "state": "Odisha", "lat": 19.2667, "lon": 84.9167, "type": "Fish Landing Center"},
    {"id": "bahabalpur", "name": "Bahabalpur Fish Landing Center", "state": "Odisha", "lat": 21.5200, "lon": 87.0500, "type": "Fish Landing Center"},

    # West Bengal
    {"id": "petuaghat", "name": "Petuaghat Fisheries Harbor (Deshapran)", "state": "West Bengal", "lat": 21.7833, "lon": 87.9000, "type": "Major Fishing Harbor"},
    {"id": "digha_shankarpur", "name": "Shankarpur Fishing Harbor (Digha)", "state": "West Bengal", "lat": 21.6333, "lon": 87.5667, "type": "Major Fishing Harbor"},
    {"id": "sultanpur", "name": "Sultanpur Fish Landing Harbor (Diamond Harbour)", "state": "West Bengal", "lat": 22.1833, "lon": 88.1833, "type": "Fishing Harbor"},
    {"id": "frazierganj", "name": "Frazierganj Fishing Harbor", "state": "West Bengal", "lat": 21.5667, "lon": 88.2500, "type": "Fishing Harbor"},
    {"id": "kakdwip", "name": "Kakdwip Fish Landing Center", "state": "West Bengal", "lat": 21.8667, "lon": 88.1833, "type": "Fish Landing Center"},

    # Puducherry
    {"id": "thengathittu", "name": "Thengathittu Fishing Harbor (Puducherry)", "state": "Puducherry", "lat": 11.9167, "lon": 79.8167, "type": "Fishing Harbor"},
    {"id": "karaikal", "name": "Karaikal Fishing Harbor", "state": "Puducherry", "lat": 10.9167, "lon": 79.8500, "type": "Fishing Harbor"},

    # Andaman & Nicobar
    {"id": "junglighat", "name": "Junglighat Fishery Jetty (Port Blair)", "state": "Andaman & Nicobar Islands", "lat": 11.6667, "lon": 92.7333, "type": "Major Fishing Harbor"},
    {"id": "diglipur", "name": "Diglipur Fishery Jetty", "state": "Andaman & Nicobar Islands", "lat": 13.2667, "lon": 92.9833, "type": "Fish Landing Center"},

    # Lakshadweep
    {"id": "agatti", "name": "Agatti Island Fishery Jetty", "state": "Lakshadweep", "lat": 10.8533, "lon": 72.1908, "type": "Fish Landing Center"},
    {"id": "kavaratti", "name": "Kavaratti Fishery Jetty", "state": "Lakshadweep", "lat": 10.5667, "lon": 72.6333, "type": "Fish Landing Center"},
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    d_lat, d_lon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    return 6371.0088 * 2 * asin(sqrt(a))


def is_coordinate_in_water(latitude: float, longitude: float) -> bool:
    """
    Determines whether a geographic coordinate is located in the ocean / sea / water
    surrounding the Indian subcontinent rather than inland.
    """
    # 1. South of Kanyakumari (Indian Ocean)
    if latitude < 8.08 and 65.0 <= longitude <= 95.0:
        return True

    # 2. Arabian Sea (West Coast of India)
    if 8.08 <= latitude <= 25.0 and longitude < 77.5:
        if latitude > 22.8 and longitude < 68.6:  # Kutch / Northwest waters
            return True
        if 20.0 <= latitude <= 22.8 and longitude < 69.4:  # Saurashtra West offshore
            return True
        if 18.5 <= latitude < 20.0 and longitude < 72.70:  # Mumbai / North Maharashtra waters
            return True
        if 15.5 <= latitude < 18.5 and longitude < 73.15:  # South Maharashtra / Goa waters
            return True
        if 12.8 <= latitude < 15.5 and longitude < 74.35:  # Karnataka waters
            return True
        if 8.08 <= latitude < 12.8:
            kerala_coast_lon = 77.0 - (latitude - 8.08) * (77.0 - 75.1) / (12.8 - 8.08)
            if longitude < kerala_coast_lon - 0.04:
                return True

    # 3. Bay of Bengal / Palk Strait / Gulf of Mannar (East Coast of India)
    if 8.08 <= latitude <= 23.0 and longitude > 77.5:
        if 8.08 <= latitude < 10.0 and longitude > (77.55 + (latitude - 8.08) * (79.3 - 77.55) / 1.92 + 0.05):
            return True
        if 10.0 <= latitude < 11.5 and longitude > 79.90:  # Central Tamil Nadu offshore
            return True
        if 11.5 <= latitude < 13.5 and longitude > 80.32:  # Chennai / North TN offshore
            return True
        if 13.5 <= latitude < 15.8 and longitude > (80.15 + (latitude - 13.5) * (80.45 - 80.15) / 2.3 + 0.03):  # South AP offshore
            return True
        if 15.8 <= latitude < 17.5 and longitude > (80.40 + (latitude - 15.8) * (82.35 - 80.40) / 1.7 + 0.03):  # Central AP (Kakinada) offshore
            return True
        if 17.5 <= latitude < 19.0 and longitude > (83.33 + (latitude - 17.5) * (84.45 - 83.33) / 1.5 + 0.03):  # Visakhapatnam / North AP offshore
            return True
        if 19.0 <= latitude < 21.0 and longitude > (84.95 + (latitude - 19.0) * (87.10 - 84.95) / 2.0 + 0.03):  # Odisha offshore
            return True
        if 21.0 <= latitude < 23.0 and (longitude > 87.60 or latitude < 21.55):  # Bengal offshore / Bay of Bengal
            return True

    # 4. Far Oceanic Boundaries
    if (longitude < 68.0 or longitude > 89.5) and latitude < 25.0:
        return True

    return False


class RoadRoutingService:
    """Provides free land road routing and nearest harbor snapping using OSRM."""

    def __init__(self, harbors: list[dict[str, Any]] | None = None) -> None:
        self.harbors = harbors or INDIAN_COASTAL_HARBORS

    def find_nearest_harbor(self, latitude: float, longitude: float) -> tuple[dict[str, Any], float]:
        """Find the closest coastal fishing harbor or landing center."""
        best_harbor = self.harbors[0]
        min_dist = float("inf")

        for h in self.harbors:
            d = _haversine_km(latitude, longitude, h["lat"], h["lon"])
            if d < min_dist:
                min_dist = d
                best_harbor = h

        return best_harbor, round(min_dist, 2)

    async def get_land_to_harbor_route(
        self,
        origin_lat: float,
        origin_lon: float,
        harbor_lat: float | None = None,
        harbor_lon: float | None = None,
        harbor_name: str | None = None,
    ) -> dict[str, Any]:
        """Calculates real road route from origin on land to the nearest coastal harbor."""
        if harbor_lat is None or harbor_lon is None:
            harbor, dist_to_harbor_km = self.find_nearest_harbor(origin_lat, origin_lon)
            h_lat, h_lon = harbor["lat"], harbor["lon"]
            h_name = harbor["name"]
            h_state = harbor["state"]
            h_type = harbor["type"]
        else:
            h_lat, h_lon = harbor_lat, harbor_lon
            h_name = harbor_name or "Coastal Departure Harbor"
            h_state = ""
            h_type = "Fishing Harbor"
            dist_to_harbor_km = round(_haversine_km(origin_lat, origin_lon, h_lat, h_lon), 2)

        # If user is at sea (in water) or within 100 meters of the harbor/water, treat as direct sea navigation
        if is_coordinate_in_water(origin_lat, origin_lon) or dist_to_harbor_km <= 0.1:
            return {
                "land_transit_needed": False,
                "is_at_sea_or_harbor": True,
                "harbor": {
                    "name": h_name,
                    "latitude": h_lat,
                    "longitude": h_lon,
                    "state": h_state,
                    "type": h_type,
                },
                "distance_km": 0.0,
                "duration_mins": 0.0,
                "formatted_duration": "0 mins",
                "road_geometry": None,
                "road_steps": [],
                "source": "sea_origin" if is_coordinate_in_water(origin_lat, origin_lon) else "coastal_harbor",
                "summary_text": "Direct marine navigation from current water position.",
            }

        # Query OSRM Public Driving Routing API with custom User-Agent
        osrm_url = f"https://router.project-osrm.org/route/v1/driving/{origin_lon:.6f},{origin_lat:.6f};{h_lon:.6f},{h_lat:.6f}?overview=full&geometries=geojson&steps=true"
        
        road_coords = [[origin_lon, origin_lat], [h_lon, h_lat]]
        road_dist_km = dist_to_harbor_km
        road_duration_mins = round((dist_to_harbor_km / 35.0) * 60.0, 1)  # Default ~35 km/h driving
        road_steps: list[dict[str, Any]] = []
        routing_source = "osrm_live"

        try:
            headers = {"User-Agent": "ORCA-Marine-Platform/1.0 (https://orca-marine.org)"}
            async with httpx.AsyncClient(timeout=6.0, headers=headers) as client:
                resp = await client.get(osrm_url)
                if resp.status_code == 200:
                    data = resp.json()
                    waypoints = data.get("waypoints", [])
                    if waypoints and len(waypoints) > 0:
                        origin_snap_dist = waypoints[0].get("distance", 0.0)
                        if origin_snap_dist > 400.0:
                            # Origin coordinate is far out at sea / in open water away from roads
                            return {
                                "land_transit_needed": False,
                                "is_at_sea_or_harbor": True,
                                "harbor": {
                                    "name": h_name,
                                    "latitude": h_lat,
                                    "longitude": h_lon,
                                    "state": h_state,
                                    "type": h_type,
                                },
                                "distance_km": 0.0,
                                "duration_mins": 0.0,
                                "formatted_duration": "0 mins",
                                "road_geometry": None,
                                "road_steps": [],
                                "source": "sea_origin",
                                "summary_text": "Direct marine navigation from current water position.",
                            }

                    routes = data.get("routes", [])
                    if routes:
                        primary_route = routes[0]
                        geom = primary_route.get("geometry", {})
                        if geom.get("coordinates") and len(geom["coordinates"]) >= 2:
                            road_coords = geom["coordinates"]

                        if primary_route.get("distance"):
                            road_dist_km = round(primary_route["distance"] / 1000.0, 2)
                        if primary_route.get("duration"):
                            road_duration_mins = round(primary_route["duration"] / 60.0, 1)

                        legs = primary_route.get("legs", [])
                        if legs:
                            raw_steps = legs[0].get("steps", [])
                            for idx, step in enumerate(raw_steps):
                                maneuver = step.get("maneuver", {})
                                step_type = maneuver.get("type", "turn")
                                modifier = maneuver.get("modifier", "")
                                name = step.get("name") or "Connecting Road"
                                s_dist_m = round(step.get("distance", 0.0), 1)
                                s_dur_s = round(step.get("duration", 0.0), 1)

                                instruction = _format_turn_instruction(step_type, modifier, name, idx == 0, idx == len(raw_steps) - 1, h_name)
                                road_steps.append({
                                    "step_number": idx + 1,
                                    "instruction": instruction,
                                    "road_name": name,
                                    "distance_meters": s_dist_m,
                                    "duration_seconds": s_dur_s,
                                    "location": maneuver.get("location", []),
                                })
                else:
                    routing_source = "geometric_fallback"
        except Exception as exc:
            logger.warning(f"OSRM road routing fallback engaged: {exc}")
            routing_source = "geometric_fallback"

        # Fallback road steps if OSRM was offline or empty
        if not road_steps:
            road_steps = [
                {
                    "step_number": 1,
                    "instruction": f"Depart starting location and proceed toward {h_name} coastal corridor",
                    "road_name": "Shore Access Corridor",
                    "distance_meters": round(dist_to_harbor_km * 500, 1),
                    "duration_seconds": round(road_duration_mins * 30, 1),
                    "location": [origin_lon, origin_lat],
                },
                {
                    "step_number": 2,
                    "instruction": f"Arrive at {h_name} boat jetty and embark on vessel",
                    "road_name": "Harbor Wharf Gate",
                    "distance_meters": round(dist_to_harbor_km * 500, 1),
                    "duration_seconds": round(road_duration_mins * 30, 1),
                    "location": [h_lon, h_lat],
                },
            ]

        hrs = int(road_duration_mins // 60)
        mins = int(round(road_duration_mins % 60))
        formatted_duration = f"{hrs}h {mins}m" if hrs > 0 else f"{mins} mins"

        return {
            "land_transit_needed": True,
            "is_at_sea_or_harbor": False,
            "harbor": {
                "name": h_name,
                "latitude": h_lat,
                "longitude": h_lon,
                "state": h_state,
                "type": h_type,
                "direct_distance_km": dist_to_harbor_km,
            },
            "distance_km": road_dist_km,
            "duration_mins": road_duration_mins,
            "formatted_duration": formatted_duration,
            "road_geometry": {
                "type": "LineString",
                "coordinates": road_coords,
            },
            "road_steps": road_steps,
            "source": routing_source,
            "summary_text": f"Travel {road_dist_km} km via road ({formatted_duration}) to {h_name} before departing to sea.",
        }


def _format_turn_instruction(
    step_type: str,
    modifier: str,
    road_name: str,
    is_first: bool,
    is_last: bool,
    harbor_name: str,
) -> str:
    if is_first:
        return f"Head {modifier or 'forward'} on {road_name} toward coastal expressway"
    if is_last:
        return f"Arrive at {harbor_name} fishery jetty / wharf gate"

    mod_clean = modifier.replace("_", " ").title() if modifier else ""
    if step_type in ("turn", "end of road"):
        return f"Turn {modifier or 'onto'} {road_name}"
    if step_type == "fork":
        return f"Keep {modifier} at fork onto {road_name}"
    if step_type == "roundabout":
        return f"Enter roundabout and take exit onto {road_name}"
    if step_type == "merge":
        return f"Merge {mod_clean} onto {road_name}"
    if step_type == "continue":
        return f"Continue straight on {road_name}"
    return f"Proceed on {road_name} ({mod_clean})"
