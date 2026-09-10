import unittest

from app.agents.gis_agent import GISAgent
from app.core.context import QueryContext
from app.core.query_parser import QueryParser
from app.gis.geometry import bounding_box, contains_point, distance_km, intersects, point, validate_latitude_longitude
from app.gis.layers import GISFeature
from app.gis.spatial_queries import coordinate_in_zone, features_in_bounding_box
from app.workflows.orca_graph import OrcaWorkflow


ZONE = {"id": "zone-1", "geometry": {"type": "Polygon", "coordinates": [[[83.0, 17.0], [84.0, 17.0], [84.0, 18.0], [83.0, 18.0], [83.0, 17.0]]]}, "properties": {"name": "Test restriction"}}


class NoNetworkLLM:
    api_key = None
    async def plan(self, query, fallback, persona): return None
    async def synthesize(self, payload, language): return None


class GISTests(unittest.IsolatedAsyncioTestCase):
    def test_coordinate_validation_and_point_creation(self):
        self.assertEqual(validate_latitude_longitude(17.7, 83.3), (17.7, 83.3))
        self.assertEqual(point(17.7, 83.3)["coordinates"], [83.3, 17.7])
        with self.assertRaises(ValueError):
            validate_latitude_longitude(91, 83.3)

    def test_geometry_distance_containment_intersection_and_bbox(self):
        self.assertAlmostEqual(distance_km(point(0, 0), point(0, 1)), 111.195, places=2)
        self.assertTrue(contains_point(ZONE["geometry"], point(17.7, 83.3)))
        self.assertTrue(intersects(ZONE["geometry"], {"type": "LineString", "coordinates": [[82.5, 17.5], [84.5, 17.5]]}))
        self.assertEqual(bounding_box(ZONE["geometry"]), (83.0, 17.0, 84.0, 18.0))

    def test_spatial_filters_and_restricted_zone_check(self):
        feature = GISFeature.from_mapping(ZONE)
        self.assertEqual([item.id for item in coordinate_in_zone([feature], 17.7, 83.3)], ["zone-1"])
        self.assertEqual([item.id for item in features_in_bounding_box([feature], (82.9, 16.9, 83.1, 17.1))], ["zone-1"])

    def test_agent_handles_missing_unsupported_and_static_layers(self):
        missing = GISAgent().interpret({"query": "hazard zone", "location": None})
        self.assertEqual(missing["data_status"], "unavailable")
        static = GISAgent().interpret({"query": "restricted area", "location": {"latitude": 17.7, "longitude": 83.3}, "metadata": {"gis_layers": {"restricted_zones": {"features": [ZONE], "source_status": "static", "source": "test fixture"}}}})
        self.assertEqual(static["data_status"], "static")
        self.assertGreaterEqual(static["risk_score"], 0.7)

    async def test_gis_and_mixed_workflows_preserve_other_domains(self):
        metadata = {"gis_layers": {"hazards": {"features": [ZONE], "source_status": "static"}}}
        gis_context = QueryContext(QueryParser().parse("hazard zone"), {"latitude": 17.7, "longitude": 83.3}, metadata=metadata)
        gis_result = await OrcaWorkflow(llm=NoNetworkLLM()).run(gis_context)
        self.assertEqual(gis_result["agents_used"], ["gis"])
        self.assertEqual(gis_result["analysis_results"]["gis"]["data_status"], "static")
        mixed_context = QueryContext(QueryParser().parse("marine weather near hazard zone"), {"latitude": 17.7, "longitude": 83.3}, metadata=metadata)
        mixed_result = await OrcaWorkflow(llm=NoNetworkLLM()).run(mixed_context)
        self.assertEqual(set(mixed_result["agents_used"]), {"ocean", "weather", "gis"})
        self.assertIn("gis", mixed_result["analysis_results"])

    async def test_workflow_reports_unavailable_gis_without_fabricating_data(self):
        from unittest.mock import patch
        from app.models.spatial_feature import spatial_features
        context = QueryContext(QueryParser().parse("map near coordinates"), {"latitude": 17.7, "longitude": 83.3})
        with patch.object(spatial_features, "list", return_value=[]):
            result = await OrcaWorkflow(llm=NoNetworkLLM()).run(context)
            self.assertEqual(result["analysis_results"]["gis"]["data_status"], "unavailable")

