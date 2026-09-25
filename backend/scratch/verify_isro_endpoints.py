import asyncio
from fastapi.testclient import TestClient
from app.main import app

def test_live_apis():
    client = TestClient(app)
    
    print("--- 1. Testing ISRO Satellite Overpasses Endpoint ---")
    resp = client.get("/map/satellite-overpasses?latitude=17.6868&longitude=83.2185")
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Active Missions: {[m['name'] for m in data.get('active_missions', [])]}")
    print(f"Swaths Count: {len(data.get('swaths', []))}")
    assert resp.status_code == 200
    assert len(data.get("active_missions", [])) >= 2
    
    print("\n--- 2. Testing ISRO NavIC Status Endpoint ---")
    resp = client.get("/map/navic/status?latitude=17.6868&longitude=83.2185")
    print(f"Status: {resp.status_code}")
    navic_data = resp.json()
    print(f"Device: {navic_data.get('device_model')}")
    print(f"Tracked Satellites: {navic_data.get('tracked_satellites')}")
    print(f"Signal Status: {navic_data.get('signal_status')}")
    assert resp.status_code == 200
    assert navic_data.get("tracked_satellites") >= 7
    
    print("\n--- 3. Testing ISRO NavIC SOS Distress Broadcast Endpoint ---")
    resp = client.post("/map/navic/sos", json={
        "vessel_name": "MATSYA-SHAKTI-07",
        "registration_id": "IND-AP-07-MM-4421",
        "latitude": 17.6868,
        "longitude": 83.2185,
        "nature_of_distress": "Severe rough sea warning"
    })
    print(f"Status: {resp.status_code}")
    sos_data = resp.json()
    print(f"SOS Transmitted: {sos_data.get('sos_transmitted')}")
    print(f"Packet ID: {sos_data.get('packet_id')}")
    print(f"MRCC Channels: {sos_data.get('receiving_coordination_centres')}")
    assert resp.status_code == 200
    assert sos_data.get("sos_transmitted") is True

    print("\n--- 4. Testing Ask ORCA Evidence Generation with ISRO Payloads ---")
    resp = client.post("/orca/query", json={
        "query": "Is it safe to venture into the sea near Visakhapatnam today?",
        "location": {"latitude": 17.6868, "longitude": 83.2185, "label": "Visakhapatnam Harbor"},
        "language": "en"
    })
    print(f"Status: {resp.status_code}")
    chat_data = resp.json()
    print(f"Answer length: {len(chat_data.get('answer', ''))}")
    evidence = chat_data.get("evidence", [])
    print(f"Evidence items: {len(evidence)}")
    for ev in evidence:
        print(f"  - Source: {ev.get('source')} | Sat: {ev.get('satellite_mission')}")
    assert resp.status_code == 200
    assert len(evidence) > 0

    print("\n[SUCCESS] ALL ISRO & NAVIC ENDPOINTS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    test_live_apis()
