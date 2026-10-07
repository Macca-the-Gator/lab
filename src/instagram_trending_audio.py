from __future__ import annotations

import html
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SOURCES = (
    ("later", "https://later.com/blog/instagram-reels-trends/"),
    ("buffer", "https://buffer.com/resources/trending-audio-instagram/"),
)

_SKIP = {"original audio", "mix", "audio", "trending audio"}


def _clean(value: str) -> str:
    value = html.unescape(re.sub(r"<[^>]+>", " ", value))
    return re.sub(r"\s+", " ", value).strip(" \t\r\n:-–—")


def _extract_later(text: str) -> list[str]:
    return [_clean(v) for v in re.findall(r"Audio:\s*</?[^>]*>?\s*([^<\n]+)", text, flags=re.I)]


def _extract_buffer(text: str) -> list[str]:
    values = []
    for match in re.finditer(r"<h4[^>]*>\s*(?:\d+\.\s*)?([^<]+)</h4>", text, flags=re.I):
        values.append(_clean(match.group(1)))
    return values


def refresh(cache_path: Path) -> dict:
    ranked: list[dict] = []
    seen: set[str] = set()
    errors: list[str] = []
    for source, url in SOURCES:
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "MaccaTrendAudio/1.0"})
            with urllib.request.urlopen(request, timeout=20) as response:
                page = response.read(2_000_000).decode("utf-8", "replace")
            values = _extract_later(page) if source == "later" else _extract_buffer(page)
            for value in values:
                key = value.casefold()
                if not value or key in _SKIP or key in seen:
                    continue
                seen.add(key)
                ranked.append({"name": value, "source": source, "sourceUrl": url})
        except Exception as exc:
            errors.append(f"{source}:{type(exc).__name__}")
    if not ranked and cache_path.exists():
        return json.loads(cache_path.read_text(encoding="utf-8"))
    data = {
        "schemaVersion": 1,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "items": ranked[:12],
        "errors": errors,
    }
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return data


def normalized_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")
