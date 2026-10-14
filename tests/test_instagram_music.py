"""Offline music selection compatibility tests; no API calls or secrets."""
import io
import json
import os
import unittest
from unittest.mock import patch, MagicMock
from urllib.error import HTTPError
from scripts.instagram_music import choose_music


class InstagramMusicFallbackTests(unittest.TestCase):
    @patch("scripts.instagram_music.request.urlopen")
    def test_original_publishing_token_is_tried_after_audio_token_denied(self, urlopen):
        blocked = HTTPError("https://graph.facebook.com/", 403, "denied", None, None)
        success = MagicMock()
        success.__enter__.return_value = io.BytesIO(json.dumps({
            "audio": [{"audio_id": "track-music-id", "title": "Night Phonk Beat", "artist": "DJ"}]
        }).encode())
        urlopen.side_effect = [blocked, success]
        with patch.dict(os.environ, {
            "INSTAGRAM_AUDIO_ACCESS_TOKEN": "unusable-audio-token",
            "INSTAGRAM_ACCESS_TOKEN": "existing-publishing-token",
        }):
            config, title = choose_music("17841427029514284")
        self.assertEqual(json.loads(config)["audio_id"], "track-music-id")
        self.assertEqual(json.loads(config)["video_volume"], 0)
        self.assertEqual(title, "Night Phonk Beat")
        self.assertEqual(urlopen.call_count, 2)
        self.assertIn("existing-publishing-token", urlopen.call_args.args[0].full_url)

    @patch("scripts.instagram_music.request.urlopen")
    def test_no_original_sound_fallback_if_catalog_unavailable(self, urlopen):
        urlopen.side_effect = HTTPError("https://graph.facebook.com/", 403, "denied", None, None)
        with patch.dict(os.environ, {"INSTAGRAM_ACCESS_TOKEN": "old-token",
                                         "INSTAGRAM_AUDIO_ACCESS_TOKEN": ""}):
            with self.assertRaisesRegex(RuntimeError, "stays queued"):
                choose_music("17841427029514284")


if __name__ == "__main__":
    unittest.main()
