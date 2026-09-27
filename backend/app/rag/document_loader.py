"""Document loader for the ORCA RAG knowledge pipeline.

Inspects the orca-knowledge directory, filters clean and usable sources,
extracts text from TXT, CSV, JSON, and PDF files, and attaches structured metadata.
"""
from __future__ import annotations

import csv
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS: frozenset[str] = frozenset({".pdf", ".txt", ".csv", ".json"})

# ---------------------------------------------------------------------------
# Knowledge Source Registry & Inclusion Rules
# ---------------------------------------------------------------------------

KNOWLEDGE_REGISTRY: dict[str, dict[str, Any]] = {
    # 1. MPEDA Export Statistics (CSVs)
    "CMFRI/preprocessed/clean_csv/item_wise_export_clean.csv": {
        "status": "include",
        "source": "MPEDA",
        "document": "Marine Products Item-Wise Export Statistics (10 Years)",
        "document_type": "csv_table",
        "domain": "export",
        "topic": "marine_products_export_trends",
        "language": "en",
        "year": "1995-2025",
        "region": "All India",
        "audience": "exporters, economists, researchers",
    },
    "CMFRI/preprocessed/clean_csv/market_wise_export_clean.csv": {
        "status": "include",
        "source": "MPEDA",
        "document": "Marine Products Market-Wise Export Statistics (10 Years)",
        "document_type": "csv_table",
        "domain": "export",
        "topic": "marine_products_export_markets",
        "language": "en",
        "year": "1995-2025",
        "region": "Global / India",
        "audience": "exporters, economists, researchers",
    },
    "CMFRI/preprocessed/clean_csv/port_wise_export_clean.csv": {
        "status": "include",
        "source": "MPEDA",
        "document": "Marine Products Port-Wise Export Statistics (10 Years)",
        "document_type": "csv_table",
        "domain": "export",
        "topic": "marine_products_export_ports",
        "language": "en",
        "year": "1995-2025",
        "region": "All India Ports",
        "audience": "exporters, port authorities",
    },
    # 2. MPEDA Reports & Regulations
    "CMFRI/preprocessed/final_english/MPEDA_Annual_Report_25-26_clean.txt": {
        "status": "include",
        "source": "MPEDA",
        "document": "MPEDA Annual Report 2025-26",
        "document_type": "report",
        "domain": "export",
        "topic": "mpeda_annual_report",
        "language": "en",
        "year": 2026,
        "region": "All India",
        "audience": "exporters, fisheries sector",
    },
    "CMFRI/BETTER MANAGEMENT PRACTICES – MPEDA.pdf": {
        "status": "include",
        "source": "MPEDA",
        "document": "Better Management Practices (BMP) for Shrimp Aquaculture",
        "document_type": "guidelines",
        "domain": "aquaculture",
        "topic": "better_management_practices_shrimp",
        "language": "en",
        "year": "unknown",
        "region": "India",
        "audience": "shrimp farmers, hatchery operators",
    },
    "CMFRI/REGULATION ON AQUACULTURE – MPEDA.pdf": {
        "status": "include",
        "source": "MPEDA",
        "document": "MPEDA Regulations on Aquaculture Export Facilities",
        "document_type": "regulations",
        "domain": "regulations",
        "topic": "mpeda_aquaculture_regulations",
        "language": "en",
        "year": "unknown",
        "region": "India",
        "audience": "exporters, farmers",
    },
    # 3. CMFRI Annual Report & Species Bulletins
    "CMFRI/preprocessed/final_english/CMFRI_Annual_Report_2025_english_clean.txt": {
        "status": "include",
        "source": "CMFRI",
        "document": "CMFRI Annual Report 2025",
        "document_type": "report",
        "domain": "fisheries",
        "topic": "cmfri_marine_fisheries_research_annual_report",
        "language": "en",
        "year": 2025,
        "region": "Indian EEZ",
        "audience": "scientists, fisheries department",
    },
    "CMFRI/CMFRI_Indian_Mackerel.pdf": {
        "status": "include",
        "source": "CMFRI",
        "document": "The Indian Mackerel (Rastrelliger kanagurta) Bulletin No. 24",
        "document_type": "scientific_bulletin",
        "domain": "species",
        "topic": "indian_mackerel",
        "language": "en",
        "year": "unknown",
        "region": "Indian EEZ (East & West Coasts)",
        "audience": "fishermen, marine scientists",
    },
    "CMFRI/CMFRI_Indian_Oil_Sardine.pdf": {
        "status": "include",
        "source": "CMFRI",
        "document": "The Indian Oil Sardine (Sardinella longiceps) Biology and Fishery",
        "document_type": "scientific_bulletin",
        "domain": "species",
        "topic": "indian_oil_sardine",
        "language": "en",
        "year": "unknown",
        "region": "Indian EEZ (Southwest & Southeast Coasts)",
        "audience": "fishermen, marine scientists",
    },
    "CMFRI/environmental_parameters_sardine_mackerel.pdf": {
        "status": "include",
        "source": "CMFRI",
        "document": "Impact of Environmental Parameters on Sardine and Mackerel Fisheries",
        "document_type": "scientific_bulletin",
        "domain": "oceanography",
        "topic": "pelagic_environmental_parameters",
        "language": "en",
        "year": 2008,
        "region": "Indian Coastal Waters",
        "audience": "fishermen, marine scientists",
    },
    "CMFRI/preprocessed/final_english/FishingBan_english.txt": {
        "status": "include",
        "source": "Department of Fisheries, MoFAHD",
        "document": "Uniform Seasonal Fishing Ban Orders 2026",
        "document_type": "regulatory_order",
        "domain": "regulations",
        "topic": "seasonal_fishing_ban",
        "language": "en",
        "year": 2026,
        "region": "East Coast & West Coast EEZ",
        "audience": "fishermen, coastal authorities",
    },
    "CMFRI/5th Marine Fisheries Census_2025.pdf": {
        "status": "include",
        "source": "CMFRI / Department of Fisheries",
        "document": "5th National Marine Fisheries Census 2025 Overview",
        "document_type": "report",
        "domain": "statistics",
        "topic": "marine_fisheries_census_2025",
        "language": "en",
        "year": 2025,
        "region": "Coastal States & UTs of India",
        "audience": "policy_makers, researchers",
    },
    # 4. Aquaculture & Coastal Regulations (Clean Texts)
    "CMFRI/preprocessed/final_english/Aquaculture_2024_english.txt": {
        "status": "include",
        "source": "Coastal Aquaculture Authority / CMFRI",
        "document": "Coastal Aquaculture Guidelines and Development 2024",
        "document_type": "guidelines",
        "domain": "aquaculture",
        "topic": "coastal_aquaculture_development",
        "language": "en",
        "year": 2024,
        "region": "Coastal States of India",
        "audience": "aquaculturists, farmers",
    },
    "CMFRI/preprocessed/final_english/Guideline_l_(Seaweed)_english.txt": {
        "status": "include",
        "source": "Department of Fisheries / CMFRI",
        "document": "Operational Guidelines for Seaweed Cultivation",
        "document_type": "guidelines",
        "domain": "aquaculture",
        "topic": "seaweed_cultivation",
        "language": "en",
        "year": 2023,
        "region": "Coastal Waters of India",
        "audience": "coastal communities, fishers",
    },
    "CMFRI/preprocessed/final_english/Guideline_m_(cage_and_pen_culture)_english.txt": {
        "status": "include",
        "source": "Department of Fisheries / CMFRI",
        "document": "Guidelines for Open Sea Cage and Pen Culture",
        "document_type": "guidelines",
        "domain": "aquaculture",
        "topic": "open_sea_cage_culture",
        "language": "en",
        "year": 2023,
        "region": "Coastal Waters of India",
        "audience": "fishers, mariculturists",
    },
    "CMFRI/preprocessed/final_english/Guidelines_for_Regulating_Coastal_Aquaculture_english.txt": {
        "status": "include",
        "source": "Coastal Aquaculture Authority",
        "document": "Guidelines for Regulating Coastal Aquaculture",
        "document_type": "regulations",
        "domain": "regulations",
        "topic": "coastal_aquaculture_regulations",
        "language": "en",
        "year": 2023,
        "region": "Coastal Areas of India",
        "audience": "shrimp hatcheries, farmers",
    },
    "CMFRI/preprocessed/final_english/Gazette_Notification_CAA_Rule_3_Amend_english.txt": {
        "status": "include",
        "source": "Ministry of Fisheries, Animal Husbandry & Dairying",
        "document": "Gazette Notification CAA Rule 3 Amendment",
        "document_type": "regulatory_order",
        "domain": "regulations",
        "topic": "coastal_aquaculture_rule_amendment",
        "language": "en",
        "year": 2023,
        "region": "India",
        "audience": "coastal farmers",
    },
    "CMFRI/preprocessed/final_english/bilingual_1_english.txt": {
        "status": "include",
        "source": "Coastal Aquaculture Authority",
        "document": "Coastal Aquaculture Registration and Compliance Orders (Part 1)",
        "document_type": "regulatory_order",
        "domain": "regulations",
        "topic": "aquaculture_compliance",
        "language": "en",
        "year": 2023,
        "region": "India",
        "audience": "aquaculture operators",
    },
    "CMFRI/preprocessed/final_english/bilingual_2_english.txt": {
        "status": "include",
        "source": "Coastal Aquaculture Authority",
        "document": "Coastal Aquaculture Registration and Compliance Orders (Part 2)",
        "document_type": "regulatory_order",
        "domain": "regulations",
        "topic": "aquaculture_compliance",
        "language": "en",
        "year": 2023,
        "region": "India",
        "audience": "aquaculture operators",
    },
    # 5. INCOIS Ocean Advisories & Science
    "incois/Potential Fishing Zone Advisory.pdf": {
        "status": "include",
        "source": "INCOIS",
        "document": "Potential Fishing Zone (PFZ) Advisory Services",
        "document_type": "advisory",
        "domain": "PFZ",
        "topic": "potential_fishing_zone_advisory",
        "language": "en",
        "year": "unknown",
        "region": "Indian Ocean / Coastal India",
        "audience": "fishermen, coastal operators",
    },
    "incois/SOP_DOCUMENTATION_MHW_ADVISORY.pdf": {
        "status": "include",
        "source": "INCOIS",
        "document": "Systematic Operational Procedure for Marine Heat Wave Advisory Services",
        "document_type": "advisory",
        "domain": "marine_hazards",
        "topic": "marine_heatwave_advisory",
        "language": "en",
        "year": "unknown",
        "region": "Tropical Indian Ocean / Arabian Sea / Bay of Bengal",
        "audience": "fishermen, coastal management, researchers",
    },
    "incois/Tuna Fishery Advisory.pdf": {
        "status": "include",
        "source": "INCOIS",
        "document": "Tuna Fishery Advisory and Operational Forecasting",
        "document_type": "advisory",
        "domain": "species",
        "topic": "tuna_fishery_advisory",
        "language": "en",
        "year": "unknown",
        "region": "Indian Ocean Deep Sea",
        "audience": "tuna longliners, commercial fishermen",
    },
    "incois/HiFA Technical Document.pdf": {
        "status": "include",
        "source": "INCOIS",
        "document": "High Resolution Ocean Forecasting and Fishing Advisory (HiFA)",
        "document_type": "report",
        "domain": "PFZ",
        "topic": "ocean_forecasting_hifa",
        "language": "en",
        "year": 2024,
        "region": "Indian Coastal Waters",
        "audience": "fishermen, scientists",
    },
    "incois/INCOIS _ Indian National Centre for Ocean Information Services.pdf": {
        "status": "include",
        "source": "INCOIS",
        "document": "INCOIS Ocean Information and Early Warning Services Overview",
        "document_type": "report",
        "domain": "oceanography",
        "topic": "incois_ocean_services",
        "language": "en",
        "year": "unknown",
        "region": "Indian Ocean",
        "audience": "general, coastal stakeholders",
    },
    "incois/INCOIS - Regional Specialized Meteorological Centre (RSMC).pdf": {
        "status": "include",
        "source": "INCOIS",
        "document": "Operational Marine Meteorology and Storm Surge Services",
        "document_type": "report",
        "domain": "marine_safety",
        "topic": "marine_meteorology_services",
        "language": "en",
        "year": "unknown",
        "region": "North Indian Ocean",
        "audience": "mariners, coastal emergency managers",
    },
    "incois/Marine Fisheries.pdf": {
        "status": "include",
        "source": "INCOIS",
        "document": "Satellite Oceanography Applications in Marine Fisheries",
        "document_type": "report",
        "domain": "fisheries",
        "topic": "satellite_oceanography_fisheries",
        "language": "en",
        "year": "unknown",
        "region": "Indian Coastal Waters",
        "audience": "researchers, fisheries managers",
    },
    # 6. Fisheries Policy & PMMSY
    "Guidelines/89f0158000ddb527f339428aef82a676.pdf": {
        "status": "include",
        "source": "Department of Fisheries, MoFAHD",
        "document": "Pradhan Mantri Matsya Sampada Yojana (PMMSY) Operational Guidelines",
        "document_type": "guidelines",
        "domain": "policy",
        "topic": "pmmsy_operational_guidelines",
        "language": "en",
        "year": 2020,
        "region": "All India",
        "audience": "fishermen, fish farmers, cooperatives, state departments",
    },
    "Guidelines/Pradhan Mantri Matsya Sampada Yojana _ Department of Fisheries, MoCIT, GoI.pdf": {
        "status": "include",
        "source": "Department of Fisheries, MoFAHD",
        "document": "PMMSY Sanctioned Proposals and Financial Overview",
        "document_type": "guidelines",
        "domain": "policy",
        "topic": "pmmsy_financial_overview",
        "language": "en",
        "year": 2024,
        "region": "All India",
        "audience": "policy_makers, fishermen",
    },
    "Guidelines/52d7d3eb0bb1c9c4edc98f4bb1831ffd.pdf": {
        "status": "include",
        "source": "Department of Fisheries, MoFAHD",
        "document": "PMMSY Scheme Implementation Orders and Amendments",
        "document_type": "regulatory_order",
        "domain": "policy",
        "topic": "pmmsy_amendments",
        "language": "en",
        "year": 2020,
        "region": "All India",
        "audience": "state departments, fishers",
    },
    # 7. Marine Safety & Coast Guard
    "Guidelines/MANUAL final 2020 - PRINT.pmd.pdf": {
        "status": "include",
        "source": "Indian Coast Guard",
        "document": "National Maritime Search and Rescue (NMSAR) Manual (2020 Edition)",
        "document_type": "manual",
        "domain": "marine_safety",
        "topic": "maritime_search_and_rescue_safety",
        "language": "en",
        "year": 2020,
        "region": "Indian Search and Rescue Region (ISRR)",
        "audience": "fishermen, mariners, rescue agencies",
    },
    "Guidelines/SAFE WATERS   2026.cdr.pdf": {
        "status": "include",
        "source": "Indian Coast Guard",
        "document": "Safe Waters 2026 - National Maritime Search and Rescue Board Review",
        "document_type": "report",
        "domain": "marine_safety",
        "topic": "safe_waters_maritime_safety_icg",
        "language": "en",
        "year": 2026,
        "region": "Indian Search and Rescue Region (ISRR)",
        "audience": "mariners, fishermen, coastal security",
    },
    "contacts/coast_guard_sar_contacts.json": {
        "status": "include",
        "source": "Indian Coast Guard",
        "document": "Indian Coast Guard MRCC & MRSC Search and Rescue Directory",
        "document_type": "contact_directory",
        "domain": "marine_safety",
        "topic": "coast_guard_sar_directory",
        "language": "en",
        "year": 2026,
        "region": "All India Coastal Regions",
        "audience": "fishermen in distress, port authorities",
    },
}

# Explicit exclusion reasons for raw / superseded / temporary files
EXCLUSIONS_MAP: dict[str, str] = {
    # XLSX files superseded by clean CSV
    "CMFRI/ITEM_WISE_EXPORT_DATA_10_YEARS-24-25.xlsx": "Raw Excel workbook superseded by clean CSV in clean_csv/item_wise_export_clean.csv",
    "CMFRI/MARKET_WISE_EXPORT_DATA_10_YEARS-24-25.xlsx": "Raw Excel workbook superseded by clean CSV in clean_csv/market_wise_export_clean.csv",
    "CMFRI/PORT_WISE_EXPORT_DATA_10_YEARS-24-25.xlsx": "Raw Excel workbook superseded by clean CSV in clean_csv/port_wise_export_clean.csv",
    # Intermediate Excel-to-CSV dumps
    "CMFRI/preprocessed/excel_to_csv/ITEM_WISE_EXPORT_DATA_10_YEARS-24-25_ITEM.csv": "Intermediate raw CSV dump superseded by normalized item_wise_export_clean.csv",
    "CMFRI/preprocessed/excel_to_csv/MARKET_WISE_EXPORT_DATA_10_YEARS-24-25_MARKET.csv": "Intermediate raw CSV dump superseded by normalized market_wise_export_clean.csv",
    "CMFRI/preprocessed/excel_to_csv/PORT_WISE_EXPORT_DATA_10_YEARS-24-25_PORT.csv": "Intermediate raw CSV dump superseded by normalized port_wise_export_clean.csv",
    # Intermediate and duplicate preprocessed files
    "CMFRI/preprocessed/clean_csv/port_wise_export_clean_backup.csv": "Duplicate backup file of port-wise export data",
    "CMFRI/preprocessed/clean_csv/port_wise_export_metadata.json": "Intermediate script metadata artifact",
    "CMFRI/preprocessed/bilingual_files.txt": "Internal scratchpad file list",
    "CMFRI/preprocessed/mpeda_clean/MPEDA_Annual_Report_25-26_clean.txt": "Duplicate of final_english/MPEDA_Annual_Report_25-26_clean.txt",
    # Raw bilingual PDFs whose clean English text exists in final_english
    "CMFRI/CMFRI_Annual_Report_2025.pdf": "Raw 40MB PDF superseded by clean English extraction in final_english/CMFRI_Annual_Report_2025_english_clean.txt",
    "CMFRI/MPEDA_Annual_Report_25-26.pdf": "Raw 22MB PDF superseded by clean English extraction in final_english/MPEDA_Annual_Report_25-26_clean.txt",
    "incois/MPEDA_Annual_Report_25-26.pdf": "Duplicate 22MB raw PDF in incois folder superseded by final_english/MPEDA_Annual_Report_25-26_clean.txt",
    "CMFRI/FishingBan.pdf": "Raw bilingual PDF superseded by clean English extraction in final_english/FishingBan_english.txt",
    "CMFRI/Aquaculture_2024.pdf": "Raw bilingual PDF superseded by clean English extraction in final_english/Aquaculture_2024_english.txt",
    "CMFRI/bilingual_1.pdf": "Raw bilingual PDF superseded by clean English extraction in final_english/bilingual_1_english.txt",
    "CMFRI/bilingual_2.pdf": "Raw bilingual PDF superseded by clean English extraction in final_english/bilingual_2_english.txt",
    "CMFRI/Guideline_l_(Seaweed).pdf": "Raw bilingual PDF superseded by clean English extraction in final_english/Guideline_l_(Seaweed)_english.txt",
    "CMFRI/Guideline_m_(cage_and_pen_culture).pdf": "Raw bilingual PDF superseded by clean English extraction in final_english/Guideline_m_(cage_and_pen_culture)_english.txt",
    "CMFRI/Guidelines_for_Regulating_Coastal_Aquaculture.pdf": "Raw bilingual PDF superseded by clean English extraction in final_english/Guidelines_for_Regulating_Coastal_Aquaculture_english.txt",
    "CMFRI/Gazette_Notification_CAA_Rule_3_Amend.pdf": "Raw bilingual PDF superseded by clean English extraction in final_english/Gazette_Notification_CAA_Rule_3_Amend_english.txt",
    # Intermediate bilingual_english folder (superseded by final_english)
    "CMFRI/preprocessed/bilingual_english/Aquaculture_2024_english.txt": "Intermediate bilingual extraction superseded by final_english/Aquaculture_2024_english.txt",
    "CMFRI/preprocessed/bilingual_english/CMFRI_Annual_Report_2025_english.txt": "Intermediate bilingual extraction superseded by final_english/CMFRI_Annual_Report_2025_english_clean.txt",
    "CMFRI/preprocessed/bilingual_english/FishingBan_english.txt": "Intermediate bilingual extraction superseded by final_english/FishingBan_english.txt",
    "CMFRI/preprocessed/bilingual_english/Gazette14-09-12_english.txt": "Corrupted/empty extraction (35 bytes) from scanned image PDF",
    "CMFRI/preprocessed/bilingual_english/Gazette_Notification_CAA_Rule_3_Amend_english.txt": "Intermediate bilingual extraction superseded by final_english",
    "CMFRI/preprocessed/bilingual_english/Guideline_l_(Seaweed)_english.txt": "Intermediate bilingual extraction superseded by final_english",
    "CMFRI/preprocessed/bilingual_english/Guideline_m_(cage_and_pen_culture)_english.txt": "Intermediate bilingual extraction superseded by final_english",
    "CMFRI/preprocessed/bilingual_english/Guidelines_for_Regulating_Coastal_Aquaculture_english.txt": "Intermediate bilingual extraction superseded by final_english",
    "CMFRI/preprocessed/bilingual_english/MPEDA_Annual_Report_25-26_english.txt": "Intermediate bilingual extraction superseded by final_english",
    "CMFRI/preprocessed/bilingual_english/bilingual_1_english.txt": "Intermediate bilingual extraction superseded by final_english",
    "CMFRI/preprocessed/bilingual_english/bilingual_2_english.txt": "Intermediate bilingual extraction superseded by final_english",
    # Daily ephemeral bulletins
    "Guidelines/Fishermen-Marine-Forecast.pdf": "Ephemeral daily forecast bulletin; live marine telemetry APIs handle real-time conditions",
    "Guidelines/Fishermen-Marine-Forecast (1).pdf": "Ephemeral daily forecast bulletin; live marine telemetry APIs handle real-time conditions",
    "Guidelines/Fishermen-Marine-Forecast (2).pdf": "Ephemeral daily forecast bulletin; live marine telemetry APIs handle real-time conditions",
    "Guidelines/Fishermen-Marine-Forecast (3).pdf": "Ephemeral daily forecast bulletin; live marine telemetry APIs handle real-time conditions",
    "Guidelines/Fishermen-Marine-Forecast (4).pdf": "Ephemeral daily forecast bulletin; live marine telemetry APIs handle real-time conditions",
    "Guidelines/Fishermen-Marine-Forecast (6).pdf": "Ephemeral daily forecast bulletin; live marine telemetry APIs handle real-time conditions",
    "Guidelines/Fishermen-Marine-Forecast (7).pdf": "Ephemeral daily forecast bulletin; live marine telemetry APIs handle real-time conditions",
    # Visual graphics without prose knowledge
    "incois/Highcharts Stacked Bar Chart.pdf": "Visual chart artifact without extractable textual knowledge",
    # Preprocessing python scripts
    "CMFRI/clean_cmfri_annual_report.py": "Preprocessing script, not a knowledge document",
    "CMFRI/clean_export_csv.py": "Preprocessing script, not a knowledge document",
    "CMFRI/convert_excel_to_csv.py": "Preprocessing script, not a knowledge document",
    "CMFRI/detect_encoding_garbage.py": "Preprocessing script, not a knowledge document",
    "CMFRI/extract_english_from_bilingual.py": "Preprocessing script, not a knowledge document",
    "CMFRI/extract_mpeda_clean.py": "Preprocessing script, not a knowledge document",
    "CMFRI/fix_port_years.py": "Preprocessing script, not a knowledge document",
    "CMFRI/validate_preprocessed_files.py": "Preprocessing script, not a knowledge document",
}

DEFERRED_MAP: dict[str, str] = {
    "CMFRI/CMFRI Annual Report 2024.pdf": "Large 108MB legacy annual report superseded by clean CMFRI Annual Report 2025",
    "CMFRI/Gazette14-09-12.pdf": "Scanned image PDF containing no machine-readable extractable text (35 bytes raw text)",
    "CMFRI/preprocessed/landing_centres/Handbook Fisheries Statistics 19.01.2023 (Final File).cdr.pdf": "41MB CorelDraw graphic export PDF with complex vector layouts",
    "Guidelines/Handbook Fisheries Statistics 19.01.2023 (Final File).cdr.pdf": "41MB CorelDraw graphic export PDF with complex vector layouts",
    "CMFRI/Marine Fisheries Census_2016_India.pdf": "15MB legacy 2016 census superseded by 5th Marine Fisheries Census 2025",
}


@dataclass
class RawDocument:
    """A raw document extracted from the knowledge base."""

    content: str
    source: str
    document: str
    document_type: str
    domain: str
    topic: str
    language: str = "en"
    year: int | str | None = None
    region: str | None = None
    audience: str | None = None
    file_path: str = ""
    pages: list[tuple[int, str]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class DocumentLoader:
    """Discovers, filters, and loads clean documents from orca-knowledge."""

    def __init__(self, knowledge_path: Path) -> None:
        self.knowledge_path = knowledge_path.resolve()
        self.manifest_data: dict[str, Any] = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "knowledge_root": str(self.knowledge_path),
            "included": [],
            "excluded": [],
            "deferred": [],
            "statistics": {
                "total_discovered": 0,
                "total_included": 0,
                "total_excluded": 0,
                "total_deferred": 0,
                "total_chunks": 0,
            },
        }

    def load(self) -> list[RawDocument]:
        """Load all included documents and build manifest records."""
        if not self.knowledge_path.exists():
            raise FileNotFoundError(f"Knowledge root not found: {self.knowledge_path}")

        loaded_documents: list[RawDocument] = []
        all_discovered = sorted(self.knowledge_path.rglob("*"))

        for file_path in all_discovered:
            if not file_path.is_file():
                continue

            rel_str = str(file_path.relative_to(self.knowledge_path)).replace("\\", "/")
            self.manifest_data["statistics"]["total_discovered"] += 1

            # Check explicit exclusions
            if rel_str in EXCLUSIONS_MAP:
                self.manifest_data["excluded"].append({
                    "file_path": rel_str,
                    "reason": EXCLUSIONS_MAP[rel_str],
                })
                continue

            # Check explicit deferrals
            if rel_str in DEFERRED_MAP:
                self.manifest_data["deferred"].append({
                    "file_path": rel_str,
                    "reason": DEFERRED_MAP[rel_str],
                })
                continue

            # Check if included in registry
            if rel_str in KNOWLEDGE_REGISTRY and KNOWLEDGE_REGISTRY[rel_str]["status"] == "include":
                reg_meta = KNOWLEDGE_REGISTRY[rel_str]
                raw_doc = self._load_file(file_path, rel_str, reg_meta)
                if raw_doc and (raw_doc.content.strip() or raw_doc.pages):
                    loaded_documents.append(raw_doc)
                    self.manifest_data["included"].append({
                        "source": raw_doc.source,
                        "document": raw_doc.document,
                        "document_type": raw_doc.document_type,
                        "domain": raw_doc.domain,
                        "topic": raw_doc.topic,
                        "language": raw_doc.language,
                        "year": raw_doc.year,
                        "region": raw_doc.region,
                        "audience": raw_doc.audience,
                        "file_path": rel_str,
                        "ingestion_date": datetime.now(timezone.utc).isoformat(),
                        "chunk_count": 0,  # Updated after chunking
                    })
                else:
                    self.manifest_data["deferred"].append({
                        "file_path": rel_str,
                        "reason": "Failed to extract meaningful text or empty content",
                    })
                continue

            # File not explicitly registered: evaluate safely
            ext = file_path.suffix.lower()
            if ext in {".py", ".xlsx"}:
                self.manifest_data["excluded"].append({
                    "file_path": rel_str,
                    "reason": f"Unsupported or intermediate file type {ext}",
                })
            else:
                self.manifest_data["deferred"].append({
                    "file_path": rel_str,
                    "reason": "Unregistered knowledge candidate — deferred for manual evaluation",
                })

        self.manifest_data["statistics"]["total_included"] = len(self.manifest_data["included"])
        self.manifest_data["statistics"]["total_excluded"] = len(self.manifest_data["excluded"])
        self.manifest_data["statistics"]["total_deferred"] = len(self.manifest_data["deferred"])

        logger.info(
            "Discovery complete: %d discovered, %d included, %d excluded, %d deferred",
            self.manifest_data["statistics"]["total_discovered"],
            self.manifest_data["statistics"]["total_included"],
            self.manifest_data["statistics"]["total_excluded"],
            self.manifest_data["statistics"]["total_deferred"],
        )
        return loaded_documents

    def _load_file(
        self, file_path: Path, rel_path: str, reg_meta: dict[str, Any]
    ) -> RawDocument | None:
        """Load text from TXT, CSV, JSON, or PDF file."""
        ext = file_path.suffix.lower()

        try:
            if ext == ".txt":
                text = file_path.read_text(encoding="utf-8", errors="replace")
                return RawDocument(
                    content=text,
                    source=reg_meta["source"],
                    document=reg_meta["document"],
                    document_type=reg_meta["document_type"],
                    domain=reg_meta["domain"],
                    topic=reg_meta["topic"],
                    language=reg_meta.get("language", "en"),
                    year=reg_meta.get("year"),
                    region=reg_meta.get("region"),
                    audience=reg_meta.get("audience"),
                    file_path=rel_path,
                )

            elif ext == ".csv":
                text = self._load_csv(file_path, reg_meta)
                return RawDocument(
                    content=text,
                    source=reg_meta["source"],
                    document=reg_meta["document"],
                    document_type=reg_meta["document_type"],
                    domain=reg_meta["domain"],
                    topic=reg_meta["topic"],
                    language=reg_meta.get("language", "en"),
                    year=reg_meta.get("year"),
                    region=reg_meta.get("region"),
                    audience=reg_meta.get("audience"),
                    file_path=rel_path,
                )

            elif ext == ".json":
                text = self._load_contacts_json(file_path)
                return RawDocument(
                    content=text,
                    source=reg_meta["source"],
                    document=reg_meta["document"],
                    document_type=reg_meta["document_type"],
                    domain=reg_meta["domain"],
                    topic=reg_meta["topic"],
                    language=reg_meta.get("language", "en"),
                    year=reg_meta.get("year"),
                    region=reg_meta.get("region"),
                    audience=reg_meta.get("audience"),
                    file_path=rel_path,
                )

            elif ext == ".pdf":
                pages = self._load_pdf(file_path)
                if not pages:
                    return None
                combined_content = "\n\n".join(t for _, t in pages)
                return RawDocument(
                    content=combined_content,
                    source=reg_meta["source"],
                    document=reg_meta["document"],
                    document_type=reg_meta["document_type"],
                    domain=reg_meta["domain"],
                    topic=reg_meta["topic"],
                    language=reg_meta.get("language", "en"),
                    year=reg_meta.get("year"),
                    region=reg_meta.get("region"),
                    audience=reg_meta.get("audience"),
                    file_path=rel_path,
                    pages=pages,
                )

        except Exception as e:
            logger.warning("Error loading %s: %s", rel_path, e)
            return None

        return None

    def _load_csv(self, file_path: Path, reg_meta: dict[str, Any]) -> str:
        """Convert tabular CSV export data into semantically rich structured text."""
        blocks = []
        doc_name = reg_meta.get("document", "Export Statistics")

        with open(file_path, encoding="utf-8", errors="replace") as fp:
            reader = csv.DictReader(fp)
            rows = list(reader)

        # Group rows by entity
        by_entity: dict[str, list[dict[str, str]]] = {}
        for r in rows:
            ent = r.get("entity", "General")
            by_entity.setdefault(ent, []).append(r)

        for ent, ent_rows in by_entity.items():
            lines = [
                f"# {doc_name} — {ent}",
                f"Source: MPEDA Marine Export Database (India)",
                f"Item/Entity: {ent}",
                "Historical Trends and Statistics:",
            ]
            for r in ent_rows:
                metric = r.get("metric", "Metric")
                unit = r.get("unit", "")
                yr = r.get("financial_year", "")
                val = r.get("value", "")
                lines.append(f"- FY {yr}: {metric} = {val} {unit}".strip())

            blocks.append("\n".join(lines))

        return "\n\n---\n\n".join(blocks)

    def _load_contacts_json(self, file_path: Path) -> str:
        """Convert Coast Guard SAR contact directory into structured textual entries."""
        data = json.loads(file_path.read_text(encoding="utf-8", errors="replace"))
        agencies = data.get("agencies", [])
        blocks = [
            "# Indian Coast Guard — National Maritime Search and Rescue (NMSAR) Directory",
            "Emergency Contact Directory for Maritime Search and Rescue Coordination Centres (MRCC) and Sub-Centres (MRSC) across India.",
            "Distress Communications: VHF Marine Channel 16 (156.8 MHz), MF 2182 kHz, INMARSAT-C, EPIRB 406 MHz.",
        ]

        for ag in agencies:
            name = ag.get("agency", "")
            ag_type = ag.get("agency_type", "")
            region = ag.get("region", "")
            addr = ag.get("postal_address", "")
            email = ag.get("email", "")
            phones = ag.get("phone", [])
            fax = ag.get("fax", "")

            if isinstance(phones, list):
                phone_str = ", ".join(phones)
            else:
                phone_str = str(phones)

            if isinstance(email, list):
                email_str = ", ".join(email)
            else:
                email_str = str(email)

            entry = (
                f"## {name} ({ag_type})\n"
                f"- Region: {region}\n"
                f"- Emergency Phone / 24x7 Operations: {phone_str}\n"
                f"- Email: {email_str}\n"
                f"- Address: {addr}\n"
                f"- Fax: {fax}"
            )
            blocks.append(entry)

        return "\n\n".join(blocks)

    def _load_pdf(self, file_path: Path) -> list[tuple[int, str]]:
        """Extract text from PDF page by page using pypdf."""
        import pypdf

        pages: list[tuple[int, str]] = []
        reader = pypdf.PdfReader(str(file_path))

        for idx, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text() or ""
                cleaned = " ".join(page_text.split())
                # Keep pages with meaningful readable text
                if len(cleaned) >= 40:
                    pages.append((idx + 1, page_text.strip()))
            except Exception as e:
                logger.debug("Page %d of %s extract failed: %s", idx + 1, file_path.name, e)

        return pages
