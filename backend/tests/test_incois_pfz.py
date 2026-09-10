import unittest
from datetime import date

from app.providers.incois_pfz import IncoisPFZProvider, PFZProviderError


FEATURE = {
    "type": "Feature",
    "id": "pfzlines.1",
    "geometry": {"type": "MultiLineString", "coordinates": [[[81.4, 15.8], [81.6, 15.9]]]},
    "properties": {"UID": 2026252001, "Sno": "001", "Year": 2026, "Julian_day": "252", "SECTORBOUN": 9, "SECTORNAME": "", "Length": 12.5, "Category": "ghrsst"},
}


class IncoisPFZTests(unittest.TestCase):
    def test_normalizes_official_feature_with_provenance_and_validity(self):
        records = IncoisPFZProvider.normalize({"type": "FeatureCollection", "features": [FEATURE]}, date(2026, 9, 9), date(2026, 9, 10))
        record = records[0]
        self.assertEqual(record.dataset, "PFZ")
        self.assertEqual(record.layer, "pfz")
        self.assertEqual(record.source, "INCOIS")
        self.assertEqual(record.source_identifier, "2026252001")
        self.assertEqual(record.geometry["type"], "MultiLineString")
        self.assertEqual(record.properties["forecast_date"], "2026-09-09")
        self.assertEqual(record.properties["valid_until"], "2026-09-10")
        self.assertEqual(record.properties["sector_code"], "9")
        self.assertIsNone(record.properties["sector"])

    def test_rejects_malformed_official_payload(self):
        with self.assertRaises(PFZProviderError):
            IncoisPFZProvider.normalize({"type": "FeatureCollection", "features": [{"type": "Feature"}]}, date(2026, 9, 9), None)

    def test_rejects_missing_identifier(self):
        feature = {**FEATURE, "id": None, "properties": {}}
        with self.assertRaises(PFZProviderError):
            IncoisPFZProvider.normalize({"type": "FeatureCollection", "features": [feature]}, date(2026, 9, 9), None)


if __name__ == "__main__":
    unittest.main()
