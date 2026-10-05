"""Create, render, upload, and persist Macca Blog YouTube Shorts."""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from src.youtube.auth import YouTubeAuthenticationError
from src.youtube.shorts import create_short, create_thumbnail
from src.youtube.upload import upload_video, set_thumbnail

ROOT = Path(__file__).resolve().parents[1]
QUEUE = Path(os.environ.get("YOUTUBE_QUEUE_FILE", ROOT / "blog" / "youtube-queue.json"))
PUBLISHED = Path(os.environ.get("YOUTUBE_PUBLISHED_FILE", ROOT / "blog" / "youtube-published.json"))
SOCIAL_VIDEO_DIR = Path(os.environ.get("SOCIAL_VIDEO_DIR", Path(os.environ.get("RUNNER_TEMP", ".")) / "macca-social-videos"))
def read_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return fallback


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def youtube_title(item: dict) -> str:
    """Keep the important phrase first and remove channel-name filler."""
    preferred = str(item.get("youtubeTitle") or item.get("socialHook") or item.get("title") or "GTA & Rockstar News").strip()
    preferred = " ".join(preferred.split())
    if len(preferred) <= 78:
        return preferred
    shortened = preferred[:78].rsplit(" ", 1)[0].rstrip(" ,:;–—-")
    return shortened or preferred[:78]


def youtube_tags(item: dict) -> list[str]:
    """Use tags mainly for spelling/name variants; discovery relies on content metadata."""
    text = f"{item.get('title', '')} {' '.join(map(str, item.get('tags', [])))}".lower()
    tags = ["GTA", "Grand Theft Auto", "Rockstar Games", "Macca the Gator"]
    if "gta 6" in text or "gta vi" in text or "grand theft auto 6" in text or "grand theft auto vi" in text:
        tags.extend(["GTA 6", "GTA VI", "Grand Theft Auto 6", "Grand Theft Auto VI"])
    if "gta online" in text:
        tags.append("GTA Online")
    for tag in item.get("tags", [])[:5]:
        value = str(tag).strip()
        if value and len(value) <= 40:
            tags.append(value)
    return list(dict.fromkeys(tags))[:15]


def youtube_description(item: dict) -> str:
    hook = str(item.get("socialHook") or item.get("description") or item.get("title") or "").strip()
    blocks = [hook[:500]]
    article_url = str(item.get("articleUrl", "")).strip()
    if article_url:
        blocks.append(f"Full story and latest links: https://macca-lab.onrender.com/social/?utm_source=youtube&utm_medium=short&utm_campaign=macca_short\nArticle: {article_url}?utm_source=youtube&utm_medium=short&utm_campaign=macca_short")
    sources = item.get("sources", [])
    references = [f"- {source.get('title', 'Source')}: {source.get('url', '')}" for source in sources[:3] if source.get("url")]
    if references:
        blocks.append("Sources\n" + "\n".join(references)[:1000])
    blocks.append("More GTA & Rockstar coverage: https://www.youtube.com/@macca_the_gator_oficial")

    text = f"{item.get('title', '')} {' '.join(map(str, item.get('tags', [])))}".lower()
    hashtags = ["#RockstarGames", "#Shorts"]
    hashtags.insert(0, "#GTA6" if ("gta 6" in text or "gta vi" in text) else "#GTA")
    body = "\n\n".join(block for block in blocks if block)
    hashtag_text = " ".join(dict.fromkeys(hashtags))
    return body[:5000 - len(hashtag_text) - 2] + "\n\n" + hashtag_text


def publish_pending() -> int:
    queue = read_json(QUEUE, [])
    published = read_json(PUBLISHED, [])
    published_keys = {item.get("publicationKey") or item.get("slug") for item in published}

    pending = [
        item for item in queue
        if item.get("slug") and (item.get("publicationKey") or item.get("slug")) not in published_keys
    ]
    pending.sort(
        key=lambda item: (
            int(item.get("socialScore") or 0),
            str(item.get("queuedAt") or ""),
        ),
        reverse=True,
    )

    selected = pending[:1]
    remaining = pending[1:]
    success_count = 0

    for queue_index, item in enumerate(selected):
        slug = item.get("slug")
        publication_key = item.get("publicationKey") or slug
        title = youtube_title(item)
        description = youtube_description(item)
        try:
            cached_video = SOCIAL_VIDEO_DIR / f"{slug}.mp4"
            upload_options = {
                "title": title,
                "description": description,
                "tags": youtube_tags(item),
                "privacy_status": "public",
            }
            with tempfile.TemporaryDirectory(prefix="macca-youtube-meta-") as meta_temp:
                thumbnail = create_thumbnail(item, Path(meta_temp) / "thumbnail.jpg", meta_temp)
                if cached_video.is_file():
                    result = upload_video(cached_video, **upload_options)
                else:
                    with tempfile.TemporaryDirectory(prefix="macca-youtube-") as temp:
                        path = create_short(item, Path(temp) / "macca-short.mp4", temp)
                        result = upload_video(path, **upload_options)
                try:
                    set_thumbnail(result["id"], thumbnail)
                    print(f"Custom thumbnail set for {slug}.")
                except Exception as exc:
                    print(f"Thumbnail update skipped for {slug}: {exc}")
            record = {
                "slug": slug,
                "publicationKey": publication_key,
                "articleUrl": item.get("articleUrl", ""),
                "youtubeVideoId": result["id"],
                "youtubeUrl": result["url"],
                "socialScore": item.get("socialScore", 0),
                "publishedAt": datetime.now(timezone.utc).isoformat(),
            }
            published.append(record)
            published_keys.add(publication_key)
            success_count += 1
            print(f"Public YouTube Short uploaded for {slug}: {result['url']}")
        except YouTubeAuthenticationError as exc:
            remaining.extend(selected[queue_index:])
            print(str(exc))
            print("YouTube queue retained for retry; authentication failure stopped this run.")
            break
        except Exception:
            remaining.append(item)
            print(f"YouTube upload failed for {slug}; item retained for retry.")

    # Preserve one copy of each remaining item, highest score first.
    deduped = {}
    for item in remaining:
        slug = item.get("slug")
        key = item.get("publicationKey") or slug
        if slug and key not in published_keys:
            if key not in deduped or int(item.get("socialScore") or 0) > int(deduped[key].get("socialScore") or 0):
                deduped[key] = item
    remaining = sorted(
        deduped.values(),
        key=lambda item: (int(item.get("socialScore") or 0), str(item.get("queuedAt") or "")),
        reverse=True,
    )

    if remaining:
        write_json(QUEUE, remaining)
    else:
        QUEUE.unlink(missing_ok=True)
    if success_count:
        write_json(PUBLISHED, published)
    print(
        f"YouTube queue result: {success_count} uploaded; "
        f"{len(remaining)} retained; no local daily publication cap is applied."
    )
    return success_count


if __name__ == "__main__":
    publish_pending()
