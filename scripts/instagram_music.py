"""Instagram catalog MUSIC selection for Macca's Rockstar-media lane.

Facebook Login token is separate from the existing Instagram publishing token.
No original_sound fallback and no unreleated first-result track.
"""
from __future__ import annotations
import json
import os
from urllib import request, parse, error


def choose_music(account_id: str) -> tuple[str, str]:
    """Find suitable licensed MUSIC using the already configured tokens.

    Keep the original Instagram publishing token unchanged; optional audio
    token access failures must not prevent trying the original Page token.
    """
    candidates = list(dict.fromkeys(filter(None, (
        os.environ.get("INSTAGRAM_AUDIO_ACCESS_TOKEN", "").strip(),
        os.environ.get("INSTAGRAM_ACCESS_TOKEN", "").strip(),
    ))))
    if not candidates:
        raise RuntimeError("No Instagram token configured for MUSIC selection.")
    version = os.environ.get("INSTAGRAM_GRAPH_VERSION", "v26.0")
    blocked = ("romaria", "gospel", "worship", "padre", "christmas", "nossa senhora",
               "ave maria", "religious", "hino", "oracao", "oração")
    suitable = ("phonk", "synth", "electro", "beat", "bass", "trap", "hip hop",
                "instrumental", "ambient", "cinematic", "neon", "drift",
                "funk", "techno", "house", "gaming", "future", "rock")
    for token in candidates:
        after = ""
        visited: set[str] = set()
        for _ in range(8):
            params = {"audio_type": "music", "user_id": account_id, "access_token": token}
            if after:
                params["after"] = after
            url = f"https://graph.facebook.com/{version}/ig_audio?" + parse.urlencode(params)
            req = request.Request(url, headers={"Accept": "application/json"})
            try:
                with request.urlopen(req, timeout=30) as response:
                    payload = json.load(response)
            except (error.HTTPError, error.URLError, ValueError):
                break
            rows = payload.get("audio", [])
            for row in rows if isinstance(rows, list) else []:
                if not isinstance(row, dict):
                    continue
                audio_id = str(row.get("audio_id") or row.get("id") or "").strip()
                title = str(row.get("title") or row.get("name") or "")
                artist = str(row.get("display_artist") or row.get("artist") or "")
                identity = (title + " " + artist).lower()
                if not audio_id or any(t in identity for t in blocked):
                    continue
                if not any(t in identity for t in suitable):
                    continue
                print(f"Instagram MUSIC selected: {title} - {artist}.")
                return json.dumps({"audio_id": audio_id, "audio_volume": 100,
                                   "video_volume": 0}, separators=(",", ":")), title
            after = str(((payload.get("paging") or {}).get("cursors") or {}).get("after") or "")
            if not after or after in visited:
                break
            visited.add(after)
    raise RuntimeError("No suitable Instagram catalog MUSIC found; video stays queued.")
