import unittest
from datetime import datetime, timedelta, timezone

from scripts.rockstar_media_social import eligible_articles, recent_count, select_article


class RockstarMediaSelectionTests(unittest.TestCase):
    def test_filters_to_gta_or_rockstar_articles(self):
        posts = [
            {"slug": "gta", "title": "GTA 6 News", "socialHook": "Hook", "publishedAt": "2026-10-05T12:00:00Z"},
            {"slug": "other", "title": "Other Game", "socialHook": "Hook", "publishedAt": "2026-10-05T13:00:00Z"},
            {"slug": "rockstar", "title": "Rockstar Update", "socialHook": "Hook", "publishedAt": "2026-10-05T11:00:00Z"},
        ]
        self.assertEqual([item["slug"] for item in eligible_articles(posts)], ["gta", "rockstar"])

    def test_selection_avoids_recent_media_article(self):
        posts = [
            {"slug": "new", "title": "GTA 6 New", "socialHook": "Hook", "publishedAt": "2026-10-05T13:00:00Z"},
            {"slug": "older", "title": "GTA VI Older", "socialHook": "Hook", "publishedAt": "2026-10-05T12:00:00Z"},
        ]
        selected = select_article(posts, {"articleHistory": ["new"]})
        self.assertEqual(selected["slug"], "older")

    def test_media_count_only_counts_requested_content_type(self):
        now = datetime.now(timezone.utc)
        records = [
            {"contentType": "rockstar-media", "publishedAt": now.isoformat()},
            {"publishedAt": now.isoformat()},
            {"contentType": "rockstar-media", "publishedAt": (now - timedelta(days=2)).isoformat()},
        ]
        self.assertEqual(recent_count(records, content_type="rockstar-media"), 1)


if __name__ == "__main__":
    unittest.main()
