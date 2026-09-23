"""
Tests for PFZDiscoveryService nearest suitable PFZ evaluation.
"""

import unittest
from unittest.mock import AsyncMock, MagicMock
from app.services.pfz_service import PFZDiscoveryService
from app.schemas.spatial import SpatialFeatureRecord


class TestPFZDiscoveryService(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.mock_repo = MagicMock()
        self.mock_weather = MagicMock()
        self.mock_ocean = MagicMock()
        self.mock_gis = MagicMock()

        self.service = PFZDiscoveryService(
            repository=self.mock_repo,
            weather=self.mock_weather,
            ocean=self.mock_ocean,
            gis=self.mock_gis,
        )

    async def test_no_candidates_in_radius(self):
        # PFZ feature at ~100 km distance
        pfz_record = SpatialFeatureRecord(
            id=1,
            dataset="PFZ",
            layer="pfz",
            geometry={"type": "Point", "coordinates": [81.5, 13.0]}, # ~135 km from (80.27, 13.08)
            source="INCOIS",
            freshness_status="live",
            properties={"name": "Far Away PFZ"},
        )
        self.mock_repo.list.side_effect = lambda **kwargs: [pfz_record] if kwargs.get("dataset") == "PFZ" or kwargs.get("layer") == "pfz" else []

        res = await self.service.find_nearest_suitable_pfz(13.0827, 80.2707, radius_km=30)
        self.assertEqual(res["overall_suitability"], "no_pfz_found")
        self.assertIn("No PFZ found within the selected radius", res["reason"])
        self.assertIsNone(res["selected_pfz"])

    async def test_suitable_candidate_selection(self):
        # Two PFZ features inside 50 km:
        # Candidate 1: 15 km away
        cand1 = SpatialFeatureRecord(
            id=101,
            dataset="PFZ",
            layer="pfz",
            geometry={"type": "Point", "coordinates": [80.35, 13.08]},
            source="INCOIS",
            freshness_status="live",
            properties={"name": "Close Suitable PFZ"},
        )
        # Candidate 2: 40 km away
        cand2 = SpatialFeatureRecord(
            id=102,
            dataset="PFZ",
            layer="pfz",
            geometry={"type": "Point", "coordinates": [80.60, 13.08]},
            source="INCOIS",
            freshness_status="live",
            properties={"name": "Farther Suitable PFZ"},
        )

        def mock_list(**kwargs):
            if kwargs.get("dataset") == "PFZ" or kwargs.get("layer") == "pfz":
                return [cand1, cand2]
            return []

        self.mock_repo.list.side_effect = mock_list

        self.mock_weather.fetch = AsyncMock(return_value={
            "observation": {"wind_speed_mps": 5.0, "precipitation_mm": 0.0}
        })
        self.mock_ocean.fetch = AsyncMock(return_value={
            "observation": {"wave_height_m": 1.2}
        })
        self.mock_gis.geometries_intersect.return_value = False

        res = await self.service.find_nearest_suitable_pfz(13.0827, 80.2707, radius_km=50)
        self.assertEqual(res["overall_suitability"], "suitable")
        self.assertIsNotNone(res["selected_pfz"])
        # Must pick Candidate 1 because it's closer (15 km vs 40 km)
        self.assertEqual(res["selected_pfz"]["id"], "101")
        self.assertEqual(res["weather_status"], "suitable")
        self.assertEqual(res["ocean_status"], "suitable")
        self.assertEqual(res["gis_status"], "suitable")

    async def test_line_and_polygon_geometry_radius_logic(self):
        # 1. PFZ geometry with min distance 40.3 km, tested with radius 30 km -> within_radius MUST BE FALSE
        far_pfz = SpatialFeatureRecord(
            id=901,
            dataset="PFZ",
            layer="pfz",
            geometry={
                "type": "LineString",
                "coordinates": [[80.63, 13.08], [80.65, 13.10]], # ~40.3 km away from (80.2707, 13.0827)
            },
            source="INCOIS",
            freshness_status="live",
            properties={"name": "Far Line PFZ"},
        )
        # 2. Polygon PFZ containing selected point -> distance 0 km -> within_radius MUST BE TRUE
        poly_pfz = SpatialFeatureRecord(
            id=902,
            dataset="PFZ",
            layer="pfz",
            geometry={
                "type": "Polygon",
                "coordinates": [[[80.20, 13.00], [80.35, 13.00], [80.35, 13.15], [80.20, 13.15], [80.20, 13.00]]],
            },
            source="INCOIS",
            freshness_status="live",
            properties={"name": "Enclosing Polygon PFZ"},
        )

        self.mock_repo.list.side_effect = lambda **kwargs: [far_pfz, poly_pfz] if kwargs.get("dataset") == "PFZ" or kwargs.get("layer") == "pfz" else []

        # Query with radius 30 km
        res = await self.service.find_nearest_suitable_pfz(13.0827, 80.2707, radius_km=30)
        all_pfzs = res["all_pfzs"]
        
        far_eval = next(p for p in all_pfzs if p["id"] == "901")
        poly_eval = next(p for p in all_pfzs if p["id"] == "902")

        # Verify far line is > 30 km and within_radius is False
        self.assertGreater(far_eval["distance_km"], 30.0)
        self.assertFalse(far_eval["within_radius"])

        # Verify inside polygon is 0 km and within_radius is True
        self.assertEqual(poly_eval["distance_km"], 0.0)
        self.assertTrue(poly_eval["within_radius"])


if __name__ == "__main__":
    unittest.main()
