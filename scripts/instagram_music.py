"""Instagram catalog MUSIC selection for Macca's Rockstar-media lane.

Facebook Login token is separate from the existing Instagram publishing token.
No original_sound fallback and no unreleated first-result track.
"""
from __future__ import annotations
import json
import os
from urllib import request, parse, error


def choose_music(account_id: str) -> tuple[str, str]:
    token = os.environ.get("INSTAGRAM_AUDIO_ACCESS_TOKEN", "").strip()
    if not token:
        raise RuntimeError("Missing INSTAGRAM_AUDIO_ACCESS_TOKEN Facebook Login credential.")
    version = os.environ.get("INSTAGRAM_GRAPH_VERSION", "v26.0")
    blocked = ("romaria", "gospel", "worship", "padre", "christmas", "nossa senhora",
               "ave maria", "religious", "hino", "oracao", "oração")
    suitable = ("phonk", "synth", "electro", "beat", "bass", "trap", "hip hop",
                "instrumental", "ambient", "cinematic", "neon", "drift",
                "funk", "techno", "house", "gaming", "future", "rock")
    after = ""
    visited: set[str] = set()
    for _ in range(8):
        params = {"audio_type": "music", "user_id": account_id}
        if after:
            params["after"] = after
        url = f"https://graph.facebook.com/{version}/ig_audio?" + parse.urlencode(params)
        req = request.Request(url, headers={
            "Authorization": "Bearer " + token, "Accept": "application/json"})
        try:
            with request.urlopen(req, timeout=30) as response:
                payload = json.load(response)
        except (error.HTTPError, error.URLError):
            raise RuntimeError("Instagram music catalog rejected the Facebook token.") from None
        rows = payload.get("audio", [])
        for row in rows if isinstance(rows, list) else []:
            if not isinstance(row, dict):
                continue
            audio_id = str(row.get("audio_id") or row.get("id") or "").strip()
            title = str(row.get("title") or row.get("name") or "")
            artist = str(row.get("display_artist") or row.get("artist") or "")
            identity = (title + " " + artist).lower()
            if not audio_id or any(s in identity for s in blocked):
                continue
            if not any(s in identity for s in suitable):
                continue
            print(f"Instagram MUSIC selected: {title} - {artist}.")
            return json.dumps({"audio_id": audio_id, "audio_volume": 100,
                               "video_volume": 0}, separators=(",", ":")), title
        after = str(((payload.get("paging") or {}).get("cursors") or {}).get("after") or "")
        if not after or after in visited:
            break
        visited.add(after)
    raise RuntimeError("No relevant Instagram MUSIC available; video remains queued.")
