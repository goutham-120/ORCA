import tempfile
import unittest
from pathlib import Path

from fastapi import HTTPException

from app.api.auth import login, me, register, update_profile
from app.api.deps import get_current_user
from app.database.session import database
from app.models.user import users
from app.schemas.auth import LoginRequest, ProfileUpdateRequest, RegisterRequest


class AuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.original_path = database.sqlite_path
        self.original_is_postgres = database.is_postgres
        database.sqlite_path = Path(self.tempdir.name) / "auth-test.db"
        # Auth unit tests use an isolated SQLite database even when the
        # developer environment has Postgres configured.
        database.is_postgres = False

    def tearDown(self):
        database.sqlite_path = self.original_path
        database.is_postgres = self.original_is_postgres
        self.tempdir.cleanup()

    def register(self, email="user@example.com"):
        return register(RegisterRequest(display_name="User", email=email, password="secure-password"))

    def assert_status(self, status_code, callable_value):
        with self.assertRaises(HTTPException) as error:
            callable_value()
        self.assertEqual(error.exception.status_code, status_code)

    def test_registration_hashes_password_and_rejects_duplicates(self):
        response = self.register()
        self.assertIsNotNone(response.access_token)
        stored = users.by_email("user@example.com")
        self.assertIsNotNone(stored)
        self.assertNotEqual(stored.password_hash, "secure-password")
        self.assertTrue(stored.password_hash.startswith("$2b$") or stored.password_hash.startswith("pbkdf2_sha256$"))
        self.assert_status(409, self.register)

    def test_login_me_and_unauthorized_access(self):
        self.register()
        authenticated = login(LoginRequest(email="user@example.com", password="secure-password"))
        self.assertIsNotNone(authenticated.access_token)
        self.assert_status(401, lambda: login(LoginRequest(email="user@example.com", password="wrong-password")))
        self.assert_status(401, lambda: me(None))
        user = get_current_user(f"Bearer {authenticated.access_token}")
        self.assertEqual(me(user).email, "user@example.com")

    def test_profile_requires_auth_and_accepts_only_allowed_categories(self):
        token = self.register().access_token
        self.assert_status(401, lambda: update_profile(ProfileUpdateRequest(user_category="general_user"), None))
        
        user = get_current_user(f"Bearer {token}")

        for category in ("fisher_marine_operator", "researcher_scientist", "coastal_authority", "general_user"):
            response = update_profile(ProfileUpdateRequest(user_category=category), user)
            self.assertEqual(response.user_category, category)

        second = self.register("other@example.com")
        second_user = get_current_user(f"Bearer {second.access_token}")
        update_profile(ProfileUpdateRequest(user_category="coastal_authority"), second_user)
        self.assertEqual(users.by_email("user@example.com").user_category, "general_user")

    def test_personalization_preferences(self):
        token = self.register().access_token
        user = get_current_user(f"Bearer {token}")
        prefs = {"default_location": {"latitude": 13.0827, "longitude": 80.2707}, "alert_sound": True}
        response = update_profile(ProfileUpdateRequest(preferences=prefs), user)
        self.assertEqual(response.preferences.get("alert_sound"), True)
        self.assertEqual(response.preferences.get("default_location", {}).get("latitude"), 13.0827)

        # Retrieve via /me
        user_me = me(user)
        self.assertEqual(user_me.preferences.get("alert_sound"), True)

    def test_reports_persistence(self):
        from app.services.report_service import ReportService
        from app.schemas.resources import ReportCreateRequest

        report_service = ReportService()
        req = ReportCreateRequest(title="Marine Safety Briefing - Chennai Coast", query_id="query-101", content={"risk_score": 0.2, "status": "favorable"})
        created = report_service.create(req)
        self.assertIsNotNone(created.id)
        self.assertEqual(created.title, "Marine Safety Briefing - Chennai Coast")

        # Fetch report
        fetched = report_service.get(created.id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.title, "Marine Safety Briefing - Chennai Coast")
        self.assertEqual(fetched.content.get("risk_score"), 0.2)

        # List reports
        all_reports = report_service.list()
        self.assertTrue(any(r.id == created.id for r in all_reports))

        # Delete report
        deleted = report_service.delete(created.id)
        self.assertTrue(deleted)
        self.assertIsNone(report_service.get(created.id))
