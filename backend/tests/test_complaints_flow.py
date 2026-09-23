"""End-to-end integration tests for Fisherman & Marine Operator -> Coastal Authority complaint communication flow."""

import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import users
from app.api.auth import _hash_password, _issue_token


class TestComplaintsCommunicationFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

        # Create or fetch test users
        pw_hash = _hash_password("TestPassword123!")

        # Fisherman A
        user_a = users.by_email("fisherman_a@orca.test")
        if not user_a:
            user_a = users.create(
                email="fisherman_a@orca.test",
                display_name="Fisherman A",
                name="Fisherman A",
                password_hash=pw_hash,
                role="fisherman",
                approval_status="approved",
            )
        cls.token_a = _issue_token(user_a)
        cls.user_a = user_a

        # Marine Operator B
        user_b = users.by_email("marine_b@orca.test")
        if not user_b:
            user_b = users.create(
                email="marine_b@orca.test",
                display_name="Marine Operator B",
                name="Marine Operator B",
                password_hash=pw_hash,
                role="marine_disaster_ops",
                approval_status="approved",
            )
        cls.token_b = _issue_token(user_b)
        cls.user_b = user_b

        # Coastal Authority C
        user_c = users.by_email("authority_c@orca.test")
        if not user_c:
            user_c = users.create(
                email="authority_c@orca.test",
                display_name="Coastal Authority C",
                name="Coastal Authority C",
                password_hash=pw_hash,
                role="coastal_authority",
                approval_status="approved",
            )
        cls.token_c = _issue_token(user_c)
        cls.user_c = user_c

    def test_e2e_complaints_flow(self):
        headers_a = {"Authorization": f"Bearer {self.token_a}"}
        headers_b = {"Authorization": f"Bearer {self.token_b}"}
        headers_c = {"Authorization": f"Bearer {self.token_c}"}

        # TEST 1: Fisherman A sends "Test Fisherman Message A" -> Authority receives it
        res_a = self.client.post(
            "/coastal/complaints",
            json={
                "message": "Test Fisherman Message A",
                "region": "Visakhapatnam Coast",
                "location": "Kasimedu Berth 1",
            },
            headers=headers_a,
        )
        self.assertEqual(res_a.status_code, 201)
        data_a = res_a.json()
        msg_a_id = data_a["id"]
        self.assertEqual(data_a["senderName"], "Fisherman A")
        self.assertEqual(data_a["senderRole"], "Fisherman")

        # Authority C checks complaints
        res_auth1 = self.client.get("/coastal/complaints", headers=headers_c)
        self.assertEqual(res_auth1.status_code, 200)
        auth_msgs1 = res_auth1.json()
        found_a = [m for m in auth_msgs1 if m["id"] == msg_a_id]
        self.assertTrue(len(found_a) > 0, "Coastal Authority must receive Fisherman A's message.")

        # TEST 2: Marine Operator B sends "Test Marine Message B" -> Authority receives it
        res_b = self.client.post(
            "/coastal/complaints",
            json={
                "message": "Test Marine Message B",
                "region": "Visakhapatnam Coast",
                "location": "Fairway Channel Entrance",
            },
            headers=headers_b,
        )
        self.assertEqual(res_b.status_code, 201)
        data_b = res_b.json()
        msg_b_id = data_b["id"]
        self.assertEqual(data_b["senderRole"], "Marine Operator")

        # Authority C checks complaints
        res_auth2 = self.client.get("/coastal/complaints", headers=headers_c)
        self.assertEqual(res_auth2.status_code, 200)
        auth_msgs2 = res_auth2.json()
        found_b = [m for m in auth_msgs2 if m["id"] == msg_b_id]
        self.assertTrue(len(found_b) > 0, "Coastal Authority must receive Marine Operator B's message.")

        # TEST 3: Fisherman A sees ONLY their own message, NOT Marine Operator B's
        res_my_a = self.client.get("/coastal/complaints/my", headers=headers_a)
        self.assertEqual(res_my_a.status_code, 200)
        my_a_msgs = res_my_a.json()
        my_a_ids = [m["id"] for m in my_a_msgs]
        self.assertIn(msg_a_id, my_a_ids)
        self.assertNotIn(msg_b_id, my_a_ids, "Fisherman A must NOT see Marine Operator B's message.")

        # TEST 4: Marine Operator B sees ONLY their own message, NOT Fisherman A's
        res_my_b = self.client.get("/coastal/complaints/my", headers=headers_b)
        self.assertEqual(res_my_b.status_code, 200)
        my_b_msgs = res_my_b.json()
        my_b_ids = [m["id"] for m in my_b_msgs]
        self.assertIn(msg_b_id, my_b_ids)
        self.assertNotIn(msg_a_id, my_b_ids, "Marine Operator B must NOT see Fisherman A's message.")

        # TEST 5: Coastal Authority responds to Fisherman A
        res_resp_a = self.client.post(
            f"/coastal/complaints/{msg_a_id}/respond",
            json={"response": "Authority Response to Fisherman A"},
            headers=headers_c,
        )
        self.assertEqual(res_resp_a.status_code, 200)

        # Fisherman A verifies response appears under correct message
        res_my_a2 = self.client.get("/coastal/complaints/my", headers=headers_a)
        my_a2_msgs = res_my_a2.json()
        msg_a_updated = next((m for m in my_a2_msgs if m["id"] == msg_a_id), None)
        self.assertIsNotNone(msg_a_updated)
        self.assertEqual(msg_a_updated["status"], "Responded")
        self.assertEqual(msg_a_updated["response"], "Authority Response to Fisherman A")

        # TEST 6: Marine Operator B verifies Fisherman A's response is NOT visible to B
        res_my_b2 = self.client.get("/coastal/complaints/my", headers=headers_b)
        my_b2_msgs = res_my_b2.json()
        self.assertFalse(any(m["id"] == msg_a_id for m in my_b2_msgs))

        # TEST 7: Coastal Authority responds to Marine Operator B & B sees response
        res_resp_b = self.client.post(
            f"/coastal/complaints/{msg_b_id}/respond",
            json={"response": "Authority Response to Marine Operator B"},
            headers=headers_c,
        )
        self.assertEqual(res_resp_b.status_code, 200)

        res_my_b3 = self.client.get("/coastal/complaints/my", headers=headers_b)
        my_b3_msgs = res_my_b3.json()
        msg_b_updated = next((m for m in my_b3_msgs if m["id"] == msg_b_id), None)
        self.assertIsNotNone(msg_b_updated)
        self.assertEqual(msg_b_updated["status"], "Responded")
        self.assertEqual(msg_b_updated["response"], "Authority Response to Marine Operator B")


if __name__ == "__main__":
    unittest.main()
