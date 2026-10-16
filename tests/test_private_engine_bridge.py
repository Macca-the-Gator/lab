"""Regression checks for Macca's optional private generator bridge."""
import contextlib
import io
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from scripts.social_video import _render_with_private_engine


class PrivateEngineBridgeTests(unittest.TestCase):
    ARTICLE = {"title": "Independent Macca news", "slug": "my-article", "sections": []}

    def test_missing_key_leaves_current_public_renderer_active(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "short.mp4"
            with patch.dict(os.environ, {"MACCA_PRIVATE_ENGINE_DIR": ""}):
                self.assertFalse(_render_with_private_engine(self.ARTICLE, output))
            self.assertFalse(output.exists())

    def test_empty_checkout_does_not_break_publishing(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "short.mp4"
            with patch.dict(os.environ, {"MACCA_PRIVATE_ENGINE_DIR": temp}):
                self.assertFalse(_render_with_private_engine(self.ARTICLE, output))

    def test_private_errors_never_print_sensitive_stack_trace(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            script = root / "scripts/private_runner/macca_video.py"
            script.parent.mkdir(parents=True)
            script.write_text("pass", encoding="utf-8")
            path = root / "output.mp4"
            with patch.dict(os.environ, {"MACCA_PRIVATE_ENGINE_DIR": temp}), patch(
                "scripts.social_video.subprocess.run",
                return_value=Mock(returncode=1, stderr="EXPOSE_PRIVATE_SOURCE_123"),
            ):
                stream = io.StringIO()
                with contextlib.redirect_stdout(stream):
                    self.assertFalse(_render_with_private_engine(self.ARTICLE, path))
            self.assertNotIn("EXPOSE_PRIVATE_SOURCE_123", stream.getvalue())

    def test_private_success_stays_independent_of_pklavc_account_tokens(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            script = root / "scripts/private_runner/macca_video.py"
            script.parent.mkdir(parents=True)
            script.write_text("pass", encoding="utf-8")
            path = root / "output.mp4"
            def fake_run(*args, **kwargs):
                path.write_bytes(b"0" * 120_000)
                self.assertNotIn("PKLAVC_INSTAGRAM_ACCESS_TOKEN", kwargs.get("env", {}))
                self.assertEqual(kwargs["cwd"], root.resolve())
                return Mock(returncode=0, stdout="all good", stderr="")
            with patch.dict(os.environ, {"MACCA_PRIVATE_ENGINE_DIR": temp,
                                        "INSTAGRAM_ACCESS_TOKEN": ""}), patch(
                "scripts.social_video.subprocess.run", side_effect=fake_run,
            ):
                self.assertTrue(_render_with_private_engine(self.ARTICLE, path))
            self.assertTrue(path.is_file())


if __name__ == "__main__":
    unittest.main()
