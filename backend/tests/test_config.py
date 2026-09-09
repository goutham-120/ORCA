import importlib
import os
import unittest
from pathlib import Path
from unittest.mock import patch

import app.config as config


class SettingsEnvironmentTests(unittest.TestCase):
    def test_database_url_is_loaded_from_backend_dotenv(self):
        env_file = Path(config.__file__).resolve().parent.parent / ".env"
        self.assertTrue(env_file.is_file(), "backend/.env is required for this local configuration test")

        # Reload with no inherited variables to prove the value comes from .env.
        # The URL itself is never included in test output.
        with patch.dict(os.environ, {}, clear=True):
            importlib.reload(config)
            config.get_settings.cache_clear()
            self.assertTrue(config.get_settings().database_url)

            os.environ["ORCA_DATABASE_URL"] = "postgresql://environment-override"
            config.get_settings.cache_clear()
            self.assertEqual(config.get_settings().database_url, "postgresql://environment-override")


if __name__ == "__main__":
    unittest.main()
