import json
import os
import shutil
import subprocess
import tempfile
import unittest
import math
import struct
import wave
from pathlib import Path
from unittest.mock import patch

from PIL import Image, ImageDraw

from src.youtube.shorts import CTA_TEXT, MAX_SLIDES, _article_script, _layout_text, _wrap, create_short, create_thumbnail


class FakeNarrator:
    """Fast deterministic local WAV source for renderer tests."""

    def __init__(self, metadata_path):
        self.engine = "test-fake"
        self.voice = "en-us"
        self.model_load_seconds = 0.0
        self.synthesis_seconds = 0.01

    def synthesize(self, texts, paths, speed):
        for text, path in zip(texts, paths):
            duration = max(0.4, len(text.split()) * 0.2 / speed)
            sample_rate = 24000
            with wave.open(str(path), "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(sample_rate)
                frames = bytearray()
                for n in range(int(sample_rate * duration)):
                    sample = int(800 * math.sin(2 * math.pi * 440 * n / sample_rate))
                    frames.extend(struct.pack("<h", sample))
                wav.writeframes(frames)
        return {
            "engine": self.engine,
            "voice": self.voice,
            "speed": speed,
            "modelLoadSeconds": self.model_load_seconds,
            "synthesisSeconds": self.synthesis_seconds,
            "fallbackReason": "",
        }


class SharedShortRendererTests(unittest.TestCase):
    def setUp(self):
        self.article = {
            "title": "Rockstar confirms a new GTA six update today",
            "description": "Rockstar confirmed a new trailer date for Grand Theft Auto six. The studio shared the announcement on its official newsroom.",
            "sections": [{"heading": "The announcement", "paragraphs": [
                "The trailer will arrive on the date stated in the company's official announcement.",
                "GameSpot reports that GTA 6 won't launch with a multiplayer mode, according to its sources.",
                "World or other.",
            ]}],
            "articleUrl": "https://example.test/blog/article/",
            "thumbnail": "",
            "inlineImages": [],
        }

    def test_script_has_at_most_four_nonempty_useful_cards_and_short_cta(self):
        beats = _article_script(self.article)
        self.assertLessEqual(len(beats), MAX_SLIDES)
        self.assertTrue(all(headline.strip() and narration.strip() for headline, narration in beats))
        self.assertEqual(CTA_TEXT, beats[-1][0])
        all_text = " ".join(headline for headline, _ in beats)
        self.assertNotIn("World or other.", all_text)
        self.assertNotIn("GameSpot reports that GTA 6 won't", all_text)
        self.assertTrue(any("Rockstar confirmed" in headline for headline, _ in beats))
        self.assertEqual(self.article["title"], beats[0][1])
        self.assertNotIn("here is the latest story", " ".join(narration for _, narration in beats).lower())

    def test_script_prefers_complete_concise_facts_before_slowing_or_rushing_voice(self):
        long_fact = "Rockstar Games shared a lengthy announcement about a complicated development update affecting several different parts of the Grand Theft Auto community across the global fanbase this week."
        article = {
            "title": "Rockstar shares GTA update",
            "description": f"{long_fact} The studio confirmed the update will arrive later this month.",
            "sections": [],
        }
        beats = _article_script(article)
        facts = [headline for headline, _ in beats[1:-1]]
        self.assertEqual("The studio confirmed the update will arrive later this month.", facts[0])
        self.assertIn(long_fact, facts[1:])

    def test_text_wrap_stays_within_card_width_and_font_shrinks_for_long_copy(self):
        canvas = Image.new("RGB", (400, 400))
        draw = ImageDraw.Draw(canvas)
        short = "A useful complete story block fits clearly inside this card."
        font_short, lines_short, _ = _layout_text(draw, short, 340, 250, max_font_size=86)
        long = " ".join([short] * 4)
        font_long, lines_long, _ = _layout_text(draw, long, 340, 250, max_font_size=86, min_font_size=18)
        self.assertLess(font_long.size, font_short.size)
        for font, lines in ((font_short, lines_short), (font_long, lines_long)):
            self.assertTrue(lines)
            for line in lines:
                box = draw.textbbox((0, 0), line, font=font)
                self.assertLessEqual(box[2] - box[0], 340)
        self.assertGreater(len(_wrap(draw, long, font_long, 340)), 1)

    def test_custom_thumbnail_is_original_1280x720_jpeg(self):
        with tempfile.TemporaryDirectory(prefix="macca-thumb-test-") as temp:
            output = Path(temp) / "thumbnail.jpg"
            thumb = create_thumbnail(self.article, output, Path(temp) / "work")
            with Image.open(thumb) as image:
                self.assertEqual((1280, 720), image.size)
                self.assertEqual("JPEG", image.format)

    @unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "FFmpeg/ffprobe required")
    def test_renders_vertical_h264_aac_30fps_in_target_duration(self):
        with tempfile.TemporaryDirectory(prefix="macca-short-test-") as temp:
            output = Path(temp) / "test.mp4"
            with patch("src.youtube.shorts.LocalNarrator", FakeNarrator), patch.dict(os.environ, {"SHORTS_MUSIC_PATH": "", "SHORTS_RENDERER": "narrated"}):
                video = create_short(self.article, output, Path(temp) / "work")
            probe = json.loads(subprocess.check_output([
                "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video)
            ], text=True))
            stream = next(item for item in probe["streams"] if item["codec_type"] == "video")
            audio = next(item for item in probe["streams"] if item["codec_type"] == "audio")
            duration = float(probe["format"]["duration"])
            self.assertEqual("h264", stream["codec_name"])
            self.assertEqual(1080, stream["width"])
            self.assertEqual(1920, stream["height"])
            self.assertEqual("30/1", stream["r_frame_rate"])
            self.assertEqual("aac", audio["codec_name"])
            self.assertEqual("48000", audio["sample_rate"])
            self.assertEqual(2, audio["channels"])
            self.assertGreaterEqual(duration, 15)
            self.assertLessEqual(duration, 20)
            self.assertLessEqual(len(list((Path(temp) / "work").glob("scene-*.jpg"))), MAX_SLIDES)
            self.assertFalse((Path(temp) / "work" / "captions.ass").exists())
            self.assertGreater(output.stat().st_size, 50000)

    @unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "FFmpeg/ffprobe required")
    def test_legacy_slideshow_remains_available_for_rollback(self):
        article = {"title": "Legacy renderer rollback test", "description": "The old renderer stays available.", "sections": []}
        with tempfile.TemporaryDirectory(prefix="macca-legacy-test-") as temp:
            output = Path(temp) / "legacy.mp4"
            with patch.dict(os.environ, {"SHORTS_RENDERER": "legacy"}):
                video = create_short(article, output, Path(temp) / "work")
            probe = json.loads(subprocess.check_output([
                "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video)
            ], text=True))
            stream = next(item for item in probe["streams"] if item["codec_type"] == "video")
            self.assertEqual("h264", stream["codec_name"])
            self.assertEqual(1080, stream["width"])
            self.assertEqual(1920, stream["height"])


if __name__ == "__main__":
    unittest.main()
