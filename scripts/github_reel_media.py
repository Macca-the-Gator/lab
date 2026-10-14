"""Ephemeral MP4 hosting for Macca Instagram Reels: GitHub Releases, never R2.

Uses the public Macca-the-Gator/lab repository. Each video URL exists only
until Meta has processed/published it. Stale releases are deleted separately.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
import subprocess
import urllib.request
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

REPOSITORY = "Macca-the-Gator/lab"
PREFIX = "macca-ig-reel-"
TAG = re.compile(r"^macca-ig-reel-\d+-\d+-[0-9a-f]{12}$")
MAX_VIDEO_BYTES = 25 * 1024 * 1024


def _gh(*args: str, allow_failure: bool = False) -> tuple[bool, str]:
    if os.environ.get("GITHUB_REPOSITORY") != REPOSITORY:
        raise RuntimeError("Temporary releases require the Macca public repository.")
    if not os.environ.get("GH_TOKEN", "").strip():
        raise RuntimeError("Missing GH_TOKEN with temporary GitHub release write permissions.")
    try:
        process = subprocess.run(["gh", *args], capture_output=True, text=True,
                                 timeout=120, check=False)
    except (OSError, subprocess.TimeoutExpired):
        raise RuntimeError("Temporary GitHub release operation failed.") from None
    if process.returncode and not allow_failure:
        raise RuntimeError("GitHub release operation failed; credentials or workflow permissions need review.")
    return process.returncode == 0, process.stdout


def release_tag(key: str) -> str:
    run_id = str(os.environ.get("GITHUB_RUN_ID", ""))
    attempt = str(os.environ.get("GITHUB_RUN_ATTEMPT", "1"))
    if not (run_id.isdecimal() and attempt.isdecimal()):
        raise RuntimeError("Release hosting requires a GitHub Actions run ID.")
    digest = hashlib.sha256(key.encode()).hexdigest()[:12]
    return f"{PREFIX}{run_id}-{attempt}-{digest}"


def release_url(tag: str, filename: str) -> str:
    return f"https://github.com/{REPOSITORY}/releases/download/{tag}/{quote(filename)}"


def upload_video(path: Path, key: str) -> tuple[str, str]:
    path = Path(path)
    size = path.stat().st_size
    if not 0 < size <= MAX_VIDEO_BYTES:
        raise RuntimeError("Instagram video is empty or exceeds 25 MiB.")
    if not TAG.fullmatch(tag := release_tag(key)):
        raise RuntimeError("Invalid temporary GitHub release tag.")
    # On the extremely unlikely case release creation succeeds but gh reports
    # an error, the stale-release cleanup will remove it later.
    _gh("release", "create", tag, str(path), "--repo", REPOSITORY,
        "--prerelease", "--latest=false", "--title", "Temporary Macca Reel",
        "--notes", "Temporary Instagram upload. Automatically removed.")
    url = release_url(tag, path.name)
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "MaccaReelHost/1"})
            with urllib.request.urlopen(req, timeout=35) as resp:
                beginning = resp.read(16)
                if resp.status == 200 and b"ftyp" in beginning:
                    print("GitHub release MP4 is publicly downloadable.")
                    return tag, url
        except Exception:
            pass
        import time
        time.sleep(3)
    raise RuntimeError("GitHub release video URL did not become publicly downloadable.")


def delete_video(tag: str) -> bool:
    if not TAG.fullmatch(tag):
        raise RuntimeError("Refusing to delete a non-Macca media release.")
    done, _ = _gh("release", "delete", tag, "--repo", REPOSITORY,
                  "--cleanup-tag", "--yes", allow_failure=True)
    if done:
        print("Temporary Macca Instagram MP4 and tag deleted.")
    else:
        print(f"::warning::Temporary release {tag} needs scheduled cleanup.")
    return done


def cleanup_stale(*, min_age_hours: int = 3) -> int:
    ok, raw = _gh("api", f"repos/{REPOSITORY}/releases?per_page=100")
    if not ok:
        raise RuntimeError("Cannot inspect stale video releases.")
    import json
    releases = json.loads(raw)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=min_age_hours)
    removed = 0
    for entry in releases:
        tag = entry.get("tag_name", "")
        if not TAG.fullmatch(tag):
            continue
        created_str = entry.get("created_at") or entry.get("published_at")
        try:
            created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
        except (AttributeError, ValueError):
            continue
        if created < cutoff and delete_video(tag):
            removed += 1
    print(f"Removed {removed} stale temporary Macca Reel release(s).")
    return removed


if __name__ == "__main__":
    cleanup_stale()
