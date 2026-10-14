"""Offline safety tests for temporary GitHub-hosted Instagram video URLs."""
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock

from scripts import github_reel_media as hosting


class GitHubReelTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {
            "GITHUB_REPOSITORY": "Macca-the-Gator/lab",
            "GITHUB_RUN_ID": "1234",
            "GITHUB_RUN_ATTEMPT": "1",
            "GH_TOKEN": "never-a-real-secret",
        })
        self.env.start()
        self.addCleanup(self.env.stop)

    def test_deterministic_unique_tag_and_public_url(self):
        tag = hosting.release_tag("gta-6-update")
        self.assertRegex(tag, hosting.TAG)
        self.assertIn("releases/download/", hosting.release_url(tag, "short.mp4"))
        with patch.dict(os.environ, {"GITHUB_RUN_ATTEMPT": "2"}):
            self.assertNotEqual(tag, hosting.release_tag("gta-6-update"))

    def test_does_not_run_in_wrong_repository(self):
        with patch.dict(os.environ, {"GITHUB_REPOSITORY": "PkLavc/lab"}):
            with self.assertRaisesRegex(RuntimeError, "Macca public repository"):
                hosting._gh("release", "list")

    def test_refuses_to_delete_non_media_release(self):
        with self.assertRaisesRegex(RuntimeError, "non-Macca"):
            hosting.delete_video("v1.0-production")

    @patch.object(hosting, "_gh", return_value=(True, ""))
    @patch("scripts.github_reel_media.time", create=True)
    @patch("urllib.request.urlopen")
    def test_public_mp4_created_and_validated(self, urlopen, fake_time, gh):
        response = Mock(status=200)
        response.read.return_value = b"\x00\x00\x00\x18ftypisom0000"
        urlopen.return_value.__enter__.return_value = response
        with tempfile.TemporaryDirectory() as tmp:
            video = Path(tmp) / "short.mp4"
            video.write_bytes(b"ftyp fake-test-body")
            tag, url = hosting.upload_video(video, "article-slug")
        self.assertTrue(hosting.TAG.fullmatch(tag))
        self.assertIn(tag, url)
        self.assertEqual(gh.call_count, 1)
        self.assertEqual(gh.call_args.args[0:2], ("release", "create"))

    @patch.object(hosting, "_gh", return_value=(True, ""))
    def test_cleanup_deletes_only_old_prefixed_releases(self, gh):
        old = (datetime.now(timezone.utc) - timedelta(hours=4)).isoformat()
        new = datetime.now(timezone.utc).isoformat()
        import json
        gh.side_effect = [
            (True, json.dumps([
                {"tag_name": "v2.0.0", "created_at": old},
                {"tag_name": "macca-ig-reel-1234-1-abcdef123456", "created_at": old},
                {"tag_name": "macca-ig-reel-1234-1-111111111111", "created_at": new},
            ])),
            (True, ""),
        ]
        self.assertEqual(hosting.cleanup_stale(), 1)
        self.assertEqual(gh.call_args_list[1].args[:3],
                         ("release", "delete", "macca-ig-reel-1234-1-abcdef123456"))


if __name__ == "__main__":
    unittest.main()
