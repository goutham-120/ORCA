"""
Verification tests for Satellite-Derived Hazard Integration into the Maritime Route Optimization Engine.

Tests cover:
- TEST A: Valid satellite-derived hazard intersecting direct Harbor -> PFZ path -> detour calculated (alternative_used = True) and route avoids hazard.
- TEST B: Valid satellite-derived hazard outside direct route -> direct route preserved (alternative_used = False).
- TEST C: Satellite provider unavailable / no valid observation -> no fake hazard created and existing routing behavior preserved.
- TEST D: Multiple hazards -> alternate route avoids ALL active obstacle geometries.
"""

import tempfile
import unittest
from pathlib import Path

from app.database.database import Database
from app.models.spatial_feature import SpatialFeatureRepository
from app.schemas.spatial import SpatialFeatureCreate
from app.services.route_analysis_service import RouteAnalysisService
from app.services.satellite_overpass_service import SatelliteOverpassService
from app.tools.gis_tools import GISTool


class SatelliteRoutingIntegrationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        db = Database(None)
        db.sqlite_path = Path(self.tempdir.name) / "test-sat-routing.db"
        self.repository = SpatialFeatureRepository(db)
        self.gis = GISTool()
        self.sat_service = SatelliteOverpassService()

    def tearDown(self):
        self.sat_service.clear_satellite_hazards()
        self.tempdir.cleanup()

    async def test_a_satellite_hazard_intersects_direct_route_triggers_alternate(self):
        """TEST A: Satellite-derived hazard geometry intersecting direct path triggers alternate route avoiding hazard."""
        # Origin: (17.6868, 83.2185), Destination: (17.8000, 83.4500)
        # Direct line passes through roughly (17.74, 83.33)
        sat_hazard = SpatialFeatureCreate(
            id="sat-hazard-insat-01",
            dataset="satellite_hazards",
            layer="hazards",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [83.30, 17.71],
                    [83.37, 17.71],
                    [83.37, 17.77],
                    [83.30, 17.77],
                    [83.30, 17.71],
                ]],
            },
            properties={
                "name": "INSAT-3DS Satellite Convective Storm Swath Hazard",
                "satellite": "INSAT-3DS",
                "hazard_type": "cyclonic_storm_swath",
                "source_type": "satellite_observation",
            },
            source="ISRO / INSAT-3DS Satellite Observation",
            source_identifier="INSAT-3DS-CYCLONE-01",
            freshness_status="live",
        )

        # Persist hazard in repository
        record = self.repository.create(sat_hazard)

        router = RouteAnalysisService(
            repository=self.repository,
            satellite_overpass=self.sat_service,
        )

        result = await router.analyze_route(
            origin_lat=17.6868,
            origin_lon=83.2185,
            dest_lat=17.8000,
            dest_lon=83.4500,
        )

        self.assertEqual(result["status"], "completed")
        self.assertTrue(result["alternative_used"], "Expected alternative_used to be True when satellite hazard intersects direct route.")
        self.assertEqual(result["gis_analysis"]["status"], "caution")
        self.assertIn("INSAT-3DS Satellite Convective Storm Swath Hazard", result["detected_obstacles"][0])

        # Verify returned route geometry does NOT intersect the satellite hazard geometry
        route_geom = result["route_geometry"]
        intersects = self.gis.geometries_intersect(route_geom, record.geometry)
        self.assertFalse(intersects, "The calculated alternate route must NOT intersect the satellite hazard geometry.")

    async def test_b_satellite_hazard_outside_route_preserves_direct_route(self):
        """TEST B: Satellite-derived hazard outside direct route preserves existing direct route behavior."""
        # Hazard polygon placed far off to the south-west, nowhere near the route corridor
        sat_hazard = SpatialFeatureCreate(
            id="sat-hazard-insat-offroute",
            dataset="satellite_hazards",
            layer="hazards",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [82.50, 17.10],
                    [82.60, 17.10],
                    [82.60, 17.20],
                    [82.50, 17.20],
                    [82.50, 17.10],
                ]],
            },
            properties={
                "name": "Distant EOS-06 Scatterometer Rough Sea Hazard",
                "satellite": "EOS-06",
                "hazard_type": "rough_sea_vector",
            },
            source="ISRO / EOS-06 Scatterometer",
            source_identifier="EOS-06-WIND-02",
            freshness_status="live",
        )

        self.repository.create(sat_hazard)

        router = RouteAnalysisService(
            repository=self.repository,
            satellite_overpass=self.sat_service,
        )

        result = await router.analyze_route(
            origin_lat=17.6868,
            origin_lon=83.2185,
            dest_lat=17.8000,
            dest_lon=83.4500,
        )

        self.assertEqual(result["status"], "completed")
        self.assertFalse(result["alternative_used"], "Expected alternative_used to be False when satellite hazard is outside route.")
        self.assertEqual(result["gis_analysis"]["status"], "suitable")
        self.assertEqual(len(result["detected_obstacles"]), 0)

    async def test_c_satellite_provider_unavailable_no_fake_hazard(self):
        """TEST C: Satellite provider unavailable / no valid observation creates no fake hazards and preserves routing behavior."""
        # Ensure repository contains no hazards and sat_service has no registered hazards
        self.sat_service.clear_satellite_hazards()

        router = RouteAnalysisService(
            repository=self.repository,
            satellite_overpass=self.sat_service,
        )

        result = await router.analyze_route(
            origin_lat=17.6868,
            origin_lon=83.2185,
            dest_lat=17.8000,
            dest_lon=83.4500,
        )

        self.assertEqual(result["status"], "completed")
        self.assertFalse(result["alternative_used"])
        self.assertEqual(result["gis_analysis"]["status"], "suitable")
        self.assertEqual(len(result["detected_obstacles"]), 0)

    async def test_d_multiple_hazards_avoided_by_alternate_route(self):
        """TEST D: Multiple hazards (satellite + restricted/coastal) are ALL avoided by alternate route."""
        # Hazard 1: INSAT-3DS satellite hazard
        sat_hazard = SpatialFeatureCreate(
            id="sat-hazard-insat-d1",
            dataset="satellite_hazards",
            layer="hazards",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [83.30, 17.71],
                    [83.37, 17.71],
                    [83.37, 17.77],
                    [83.30, 17.77],
                    [83.30, 17.71],
                ]],
            },
            properties={"name": "INSAT-3DS Satellite Storm Hazard"},
            source="ISRO / INSAT-3DS",
            freshness_status="live",
        )
        rec1 = self.repository.create(sat_hazard)

        # Hazard 2: Naval exclusion zone positioned along a simple detour path
        naval_hazard = SpatialFeatureCreate(
            id="restricted-naval-d2",
            dataset="restricted_zones",
            layer="restricted_zones",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [83.25, 17.78],
                    [83.32, 17.78],
                    [83.32, 17.84],
                    [83.25, 17.84],
                    [83.25, 17.78],
                ]],
            },
            properties={"name": "Naval Exclusion Security Zone"},
            source="INDIAN_NAVY",
            freshness_status="live",
        )
        rec2 = self.repository.create(naval_hazard)

        router = RouteAnalysisService(
            repository=self.repository,
            satellite_overpass=self.sat_service,
        )

        result = await router.analyze_route(
            origin_lat=17.6868,
            origin_lon=83.2185,
            dest_lat=17.8000,
            dest_lon=83.4500,
        )

        self.assertEqual(result["status"], "completed")
        self.assertTrue(result["alternative_used"])

        route_geom = result["route_geometry"]
        # Verify alternate route avoids ALL active obstacle geometries, not just the first one
        self.assertFalse(self.gis.geometries_intersect(route_geom, rec1.geometry), "Route must avoid satellite hazard.")
        self.assertFalse(self.gis.geometries_intersect(route_geom, rec2.geometry), "Route must also avoid naval exclusion zone.")


if __name__ == "__main__":
    unittest.main()
