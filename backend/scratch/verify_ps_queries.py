"""
Verification script for all 8 Problem Statement typical queries.
Tests each query against OrcaOrchestrator and prints intent, agents, decision, and response.
"""
import asyncio
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.orchestrator import OrcaOrchestrator
from app.schemas.orca import OrcaQueryRequest
from app.schemas.common import Location

PS_QUERIES = [
    {
        "id": 1,
        "query": "Where is the nearest Potential Fishing Zone today?",
        "location": {"latitude": 17.6868, "longitude": 83.2185, "label": "Visakhapatnam Coast"},
    },
    {
        "id": 2,
        "query": "Is it safe to venture into the sea tomorrow morning?",
        "location": {"latitude": 17.6868, "longitude": 83.2185, "label": "Visakhapatnam Coast"},
    },
    {
        "id": 3,
        "query": "What are the tide, weather, and sea conditions near my fishing location?",
        "location": {"latitude": 17.6868, "longitude": 83.2185, "label": "Visakhapatnam Coast"},
    },
    {
        "id": 4,
        "query": "Are there any lightning or cyclone alerts in my area?",
        "location": {"latitude": 17.6868, "longitude": 83.2185, "label": "Visakhapatnam Coast"},
    },
    {
        "id": 5,
        "query": "Which regions show high chlorophyll concentration and favourable sea surface temperature?",
        "location": {"latitude": 17.6868, "longitude": 83.2185, "label": "Visakhapatnam Coast"},
    },
    {
        "id": 6,
        "query": "What is the safest route for a fishing vessel considering weather and sea-state conditions?",
        "location": {"latitude": 13.1250, "longitude": 80.2995, "label": "Chennai Harbor"},
    },
    {
        "id": 7,
        "query": "Why has fish productivity declined in a particular coastal region?",
        "location": {"latitude": 9.9816, "longitude": 76.2999, "label": "Kochi Coastal Sector"},
    },
    {
        "id": 8,
        "query": "Which fishing zones should be avoided due to hazardous marine conditions or geofencing restrictions?",
        "location": {"latitude": 13.1250, "longitude": 80.2995, "label": "Chennai / Palk Strait"},
    },
    # Bonus: Regional language check (Hindi & Telugu)
    {
        "id": 9,
        "query": "क्या कल सुबह समुद्र में मछली पकड़ने जाना सुरक्षित है?",
        "location": {"latitude": 17.6868, "longitude": 83.2185, "label": "विशाखापत्तनम"},
    },
    {
        "id": 10,
        "query": "ఈ రోజు సమీపంలో చేపల వేట ప్రాంతం (PFZ) ఎక్కడ ఉంది?",
        "location": {"latitude": 17.6868, "longitude": 83.2185, "label": "విశాఖపట్నం"},
    },
]

async def main():
    sys.stdout.reconfigure(encoding='utf-8')
    orchestrator = OrcaOrchestrator()
    print("=" * 80)
    print("VERIFYING ALL PROBLEM STATEMENT QUERIES & RESPONSES IN ORCA")
    print("=" * 80)

    for item in PS_QUERIES:
        qid = item["id"]
        qtext = item["query"]
        loc = item["location"]
        print(f"\n--- QUERY #{qid}: \"{qtext}\" ---")
        print(f"Location: {loc['label']} ({loc['latitude']}, {loc['longitude']})")

        req = OrcaQueryRequest(
            query=qtext,
            location=Location(latitude=loc["latitude"], longitude=loc["longitude"], label=loc["label"]),
        )
        try:
            res = await orchestrator.handle(req)
            print(f"Intent: {res.intent}")
            print(f"Language: {res.language}")
            print(f"Agents Used: {res.agents_used}")
            print(f"Evidence Count: {len(res.evidence)}")
            if res.assessment:
                lvl = getattr(res.assessment, 'level', None)
                summ = getattr(res.assessment, 'summary', None)
                print(f"Assessment Risk Level: {lvl} | Summary: {summ}")
            if res.rag and res.rag.used:
                print(f"RAG Used: True | Sources: {res.rag.sources}")
            print(f"Response Preview:\n{res.answer[:450]}")
            print("Status: [PASS]")
        except Exception as exc:
            print(f"Status: [FAIL] - Exception: {exc}")

if __name__ == "__main__":
    asyncio.run(main())
