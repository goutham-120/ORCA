"""Test RAG retrieval with representative ORCA domain queries.

Queries tested:
1. Species: "What environmental conditions are associated with Indian mackerel?"
2. Sardine: "What environmental parameters affect Indian oil sardine?"
3. PFZ: "What is a Potential Fishing Zone advisory?"
4. Fishing restriction: "What are the 2026 fishing ban dates?"
5. Marine safety: "What should fishermen do during a maritime distress situation?"
6. Export: "What are India's marine product export trends?"
7. PMMSY: "What types of fisheries activities are supported under PMMSY?"
8. Marine heatwave: "What is a marine heatwave?"

For every query, prints:
- Query
- Retrieved chunk IDs
- Relevance score / distance
- Document title & source file
- Page number (if available)
- Metadata fields
- Text preview (first 250 characters)
- Evaluation classification: RELEVANT / PARTIALLY_RELEVANT / IRRELEVANT / NO_RESULT

Produces a final evaluation summary table.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

# Ensure UTF-8 output on Windows console
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# Ensure backend package is importable
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.models.rag import RAGResult
from app.rag.config import get_rag_settings
from app.rag.retriever import RAGRetriever

logging.basicConfig(level=logging.WARNING)

BENCHMARK_QUERIES = [
    {
        "id": "q1_mackerel",
        "category": "Species / Mackerel",
        "query": "What environmental conditions are associated with Indian mackerel?",
        "expected_keywords": ["mackerel", "rastrelliger", "temperature", "salinity", "chlorophyll", "dissolved oxygen", "cmfri", "habitat"],
        "min_relevance": 0.50,
    },
    {
        "id": "q2_sardine",
        "category": "Species / Sardine",
        "query": "What environmental parameters affect Indian oil sardine?",
        "expected_keywords": ["sardine", "sardinella", "upwelling", "temperature", "salinity", "chlorophyll", "bloom", "sst"],
        "min_relevance": 0.50,
    },
    {
        "id": "q3_pfz",
        "category": "PFZ Advisory",
        "query": "What is a Potential Fishing Zone advisory?",
        "expected_keywords": ["potential fishing zone", "pfz", "incois", "chlorophyll", "sst", "front", "thermal", "advisory"],
        "min_relevance": 0.50,
    },
    {
        "id": "q4_fishing_ban",
        "category": "Regulations / Ban",
        "query": "What are the 2026 fishing ban dates?",
        "expected_keywords": ["ban", "fishing", "2026", "east coast", "west coast", "days", "monsoon", "conservation", "exclusive economic zone"],
        "min_relevance": 0.50,
    },
    {
        "id": "q5_marine_safety",
        "category": "Marine Safety",
        "query": "What should fishermen do during a maritime distress situation?",
        "expected_keywords": ["distress", "safety", "coast guard", "sar", "emergency", "life jacket", "dat", "radio", "rescue", "vessel"],
        "min_relevance": 0.50,
    },
    {
        "id": "q6_export",
        "category": "Economics / Export",
        "query": "What are India's marine product export trends?",
        "expected_keywords": ["export", "mpeda", "shrimp", "seafood", "frozen", "usa", "china", "market", "quantity", "value", "crore", "usd"],
        "min_relevance": 0.50,
    },
    {
        "id": "q7_pmmsy",
        "category": "Fisheries Policy",
        "query": "What types of fisheries activities are supported under PMMSY?",
        "expected_keywords": ["pmmsy", "pradhan mantri matsya sampada yojana", "subsidy", "aquaculture", "infrastructure", "vessels", "fisheries", "cage"],
        "min_relevance": 0.50,
    },
    {
        "id": "q8_marine_heatwave",
        "category": "Marine Hazards",
        "query": "What is a marine heatwave?",
        "expected_keywords": ["marine heatwave", "mhw", "temperature", "anomaly", "sst", "incois", "thermal", "extreme", "duration"],
        "min_relevance": 0.50,
    },
]


def classify_result(result: RAGResult, expected_keywords: list[str]) -> str:
    """Classify the retrieval quality of a query result."""
    if not result.retrieved_chunks:
        return "NO_RESULT"

    combined_text = " ".join([c.content.lower() for c in result.retrieved_chunks])
    matched_keywords = [kw for kw in expected_keywords if kw in combined_text]
    top_score = result.retrieved_chunks[0].relevance_score

    match_ratio = len(matched_keywords) / max(len(expected_keywords), 1)

    if match_ratio >= 0.35 and top_score >= 0.70:
        return "RELEVANT"
    elif match_ratio >= 0.20 or top_score >= 0.60:
        return "PARTIALLY_RELEVANT"
    else:
        return "IRRELEVANT"


def run_retrieval_tests(top_k: int = 5) -> dict[str, str]:
    # Force settings with enabled=True for test execution
    base_settings = get_rag_settings()
    test_settings = type(base_settings)(
        enabled=True,
        vector_db=base_settings.vector_db,
        collection=base_settings.collection,
        embedding_model=base_settings.embedding_model,
        top_k=top_k,
        min_relevance_score=0.40,
        knowledge_path=base_settings.knowledge_path,
        persist_directory=base_settings.persist_directory,
    )

    retriever = RAGRetriever(settings=test_settings)

    print("=" * 80)
    print("ORCA RAG RETRIEVAL BENCHMARK TEST SUITE")
    print(f"Collection: {test_settings.collection} | Model: {test_settings.embedding_model}")
    print("=" * 80)

    classifications: dict[str, str] = {}

    for idx, test_case in enumerate(BENCHMARK_QUERIES, 1):
        q_id = test_case["id"]
        category = test_case["category"]
        query = test_case["query"]
        expected_kw = test_case["expected_keywords"]

        print(f"\n[{idx}/8] Query ({category}):")
        print(f"      \"{query}\"")
        print("-" * 80)

        result = retriever.retrieve(query=query, top_k=top_k)

        classification = classify_result(result, expected_kw)
        classifications[q_id] = classification

        if not result.retrieved_chunks:
            print(f"      [NO CHUNKS RETRIEVED] Status: {result.retrieval_status} Error: {result.error}")
            print(f"      Classification: {classification}")
            continue

        print(f"      Status: {result.retrieval_status} | Retrieved: {len(result.retrieved_chunks)} chunks")
        for chunk_idx, chunk in enumerate(result.retrieved_chunks, 1):
            page_str = f"p.{chunk.metadata.get('page_number')}" if chunk.metadata.get("page_number", -1) != -1 else "n/a"
            print(f"      ({chunk_idx}) Score: {chunk.relevance_score:.4f} | Doc: {chunk.document} [{page_str}]")
            print(f"          ID: {chunk.id}")
            print(f"          Source: {chunk.source}")
            # Text preview (first 200 chars clean)
            preview = " ".join(chunk.content.split())[:200]
            print(f"          Preview: {preview}...")

        print(f"      => Quality Assessment: {classification}")

    print("\n" + "=" * 80)
    print("RETRIEVAL BENCHMARK SUMMARY")
    print("=" * 80)
    for test_case in BENCHMARK_QUERIES:
        q_id = test_case["id"]
        status = classifications.get(q_id, "UNKNOWN")
        icon = "[PASS]" if status in ("RELEVANT", "PARTIALLY_RELEVANT") else "[FAIL]"
        print(f"{icon} {status:<18} | {test_case['category']:<22} | {test_case['query']}")
    print("=" * 80)

    return classifications


def main() -> None:
    classifications = run_retrieval_tests()
    failed = [k for k, v in classifications.items() if v in ("IRRELEVANT", "NO_RESULT")]
    if failed:
        print(f"\nWarning: {len(failed)} queries had poor retrieval: {failed}")
    else:
        print("\nAll benchmark queries retrieved relevant or partially relevant knowledge!")


if __name__ == "__main__":
    main()
