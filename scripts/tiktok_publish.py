"""Publish recent Macca articles to @pklavc TikTok through the PKLavc OIDC backend."""

from __future__ import annotations

import json
import os
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
POSTS_FILE = ROOT / "blog" / "posts.json"
STATE_FILE = Path(os.environ.get("TIKTOK_PUBLISHED_FILE", ROOT / "blog" / "tiktok-published.json"))
API_ROOT = os.environ.get("TIKTOK_PUBLISH_API", "https://api.pklavc.com").rstrip("/")
MAX_AGE_HOURS = float(os.environ.get("TIKTOK_MAX_ARTICLE_AGE_HOURS", "24"))
POLL_SECONDS = float(os.environ.get("TIKTOK_STATUS_POLL_SECONDS", "3"))
MAX_POLLS = int(os.environ.get("TIKTOK_STATUS_MAX_POLLS", "20"))


def _read(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return fallback


def _write(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _request_json(url: str, token: str, *, method: str = "POST", body: bytes | None = None, content_type: str = "application/json"):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": content_type,
        "User-Agent": "MaccaTikTokPublisher/1.0",
    }
    request = Request(url, data=body if body is not None else b"{}", method=method, headers=headers)
    with urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def _published_at(article: dict) -> datetime | None:
    raw = str(article.get("publishedAt") or "")
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def _eligible_articles(posts: list[dict], state: dict) -> list[dict]:
    now = datetime.now(timezone.utc)
    records = state.get("posts", {})
    eligible = []
    for article in posts:
        slug = str(article.get("slug") or "").strip()
        stamp = _published_at(article)
        if not slug or stamp is None:
            continue
        age = (now - stamp).total_seconds() / 3600
        if age < 0 or age > MAX_AGE_HOURS:
            continue
        record = records.get(slug, {})
        if record.get("status") == "PUBLISH_COMPLETE":
            continue
        eligible.append(article)
    eligible.sort(key=lambda item: str(item.get("publishedAt") or ""), reverse=True)
    return eligible


def _poll(token: str, publish_id: str) -> dict:
    for _ in range(MAX_POLLS):
        result = _request_json(
            f"{API_ROOT}/tiktok/publish/status",
            token,
            body=json.dumps({"publish_id": publish_id}).encode("utf-8"),
        )
        status = str(result.get("status") or "")
        if status in {"PUBLISH_COMPLETE", "FAILED"} or result.get("fail_reason"):
            return result
        time.sleep(POLL_SECONDS)
    return {"ok": True, "publish_id": publish_id, "status": "SUBMITTED"}


def _caption(article: dict) -> str:
    lead = str(article.get("socialHook") or article.get("title") or "GTA & Rockstar update").strip()
    tags = ["#GTA6", "#GTAVI", "#RockstarGames"]
    return (lead + "\n\n" + " ".join(tags))[:2200]


def _render_neutral(article: dict, output: Path) -> None:
    os.environ["SOCIAL_VIDEO_BRAND_TEXT"] = ""
    os.environ["SOCIAL_VIDEO_FOOTER_TEXT"] = ""
    os.environ["SOCIAL_VIDEO_CTA_TEXT"] = "More GTA & Rockstar updates soon."
    os.environ["SOCIAL_VIDEO_CTA_SPOKEN"] = "More GTA and Rockstar updates soon."
    os.environ["SOCIAL_VIDEO_NEUTRAL_FALLBACK"] = "true"
    os.environ["SHORTS_RENDERER"] = "narrated"

    from src.youtube.shorts import create_short

    with tempfile.TemporaryDirectory(prefix="macca-tiktok-") as work:
        create_short(article, output, work)


def main() -> None:
    token = os.environ.get("TIKTOK_PUBLISH_OIDC_TOKEN", "").strip()
    if not token:
        raise RuntimeError("TIKTOK_PUBLISH_OIDC_TOKEN is required.")

    posts = _read(POSTS_FILE, [])
    state = _read(STATE_FILE, {"schemaVersion": 1, "posts": {}})
    state.setdefault("schemaVersion", 1)
    records = state.setdefault("posts", {})

    # Finish a previously submitted post before creating another one.
    for slug, record in list(records.items()):
        publish_id = str(record.get("publishId") or "")
        if publish_id and record.get("status") not in {"PUBLISH_COMPLETE", "FAILED"}:
            result = _poll(token, publish_id)
            record.update({
                "status": result.get("status") or record.get("status") or "SUBMITTED",
                "failReason": result.get("fail_reason") or "",
                "updatedAt": _iso_now(),
            })
            _write(STATE_FILE, state)
            print(f"TikTok status for {slug}: {record['status']}")
            if record["status"] != "PUBLISH_COMPLETE":
                return

    eligible = _eligible_articles(posts, state)
    if not eligible:
        print("No recent unpublished Macca article needs TikTok publishing.")
        return

    article = eligible[0]
    slug = str(article["slug"])
    video_dir = Path(os.environ.get("TIKTOK_VIDEO_DIR", Path(os.environ.get("RUNNER_TEMP", ".")) / "macca-tiktok-videos"))
    video_dir.mkdir(parents=True, exist_ok=True)
    output = video_dir / f"{slug}.mp4"
    _render_neutral(article, output)

    params = urlencode({
        "privacy_level": "SELF_ONLY",
        "title": _caption(article),
        "is_aigc": "true",
        "disable_comment": "false",
        "disable_duet": "false",
        "disable_stitch": "false",
    })
    result = _request_json(
        f"{API_ROOT}/tiktok/publish/file?{params}",
        token,
        body=output.read_bytes(),
        content_type="video/mp4",
    )
    publish_id = str(result.get("publish_id") or "")
    if not result.get("ok") or not publish_id:
        raise RuntimeError(f"TikTok publish init failed: {result}")

    records[slug] = {
        "slug": slug,
        "publishId": publish_id,
        "status": str(result.get("status") or "SUBMITTED"),
        "privacyLevel": "SELF_ONLY",
        "articleUrl": f"https://macca-lab.onrender.com/blog/{slug}/",
        "submittedAt": _iso_now(),
        "updatedAt": _iso_now(),
    }
    _write(STATE_FILE, state)

    status = _poll(token, publish_id)
    records[slug].update({
        "status": status.get("status") or records[slug]["status"],
        "failReason": status.get("fail_reason") or "",
        "updatedAt": _iso_now(),
    })
    _write(STATE_FILE, state)
    print(f"TikTok publish for {slug}: {records[slug]['status']}")


if __name__ == "__main__":
    main()
