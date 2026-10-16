"""Macca social video queue rendering and transient GitHub Reel hosting.

Command (default): render one reusable YouTube MP4 per selected slug and create
an Instagram-only silent/music-ready variant. 'upload': publish public MP4 URL
as an ephemeral GitHub Release. 'cleanup': remove this run's releases.
No R2 operations, billing credentials, or permanent video commits.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from scripts.github_reel_media import upload_video, delete_video, cleanup_stale, release_tag
from src.youtube.shorts import create_short

ROOT = Path(__file__).resolve().parents[1]
VIDEO_DIR = Path(os.environ.get("SOCIAL_VIDEO_DIR", Path(os.environ.get("RUNNER_TEMP", ".")) / "macca-social-videos"))
MANIFEST = Path(os.environ.get("INSTAGRAM_REEL_MANIFEST_FILE", Path(os.environ.get("RUNNER_TEMP", ".")) / "macca-reel-manifest.json"))


def _read(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return fallback


def _write(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def _ranked(items):
    return sorted(items or [], key=lambda item: (
        int(item.get("socialScore") or 0), str(item.get("queuedAt") or "")),
        reverse=True)


def _render_with_private_engine(article: dict, output: Path) -> bool:
    """Consume shared private source in an isolated subprocess, never expose code."""
    shared_dir = os.environ.get("MACCA_PRIVATE_ENGINE_DIR", "").strip()
    if not shared_dir:
        return False
    private_root = Path(shared_dir).resolve()
    module = private_root / "scripts" / "private_runner" / "macca_video.py"
    if not module.is_file():
        print("::notice::Private engine unavailable; keeping the existing Macca renderer.")
        return False
    with tempfile.TemporaryDirectory(prefix="macca-private-video-") as temp:
        source = Path(temp) / "macca-article.json"
        source.write_text(json.dumps(article, ensure_ascii=False), encoding="utf-8")
        args = [
            sys.executable, "-m", "scripts.private_runner.macca_video",
            "--article", str(source), "--output", str(output.resolve()),
            "--workdir", str((Path(temp) / "frames").resolve()),
        ]
        # The private renderer needs files and local model caches, not any
        # Macca Instagram/YouTube/OAuth/AI credentials.
        allowed = (
            "PATH", "HOME", "TMPDIR", "RUNNER_TEMP", "LANG", "LC_ALL",
            "XDG_CACHE_HOME", "HF_HOME", "HF_HUB_CACHE",
            "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY",
        )
        isolated_env = {key: os.environ[key] for key in allowed if key in os.environ}
        isolated_env["PYTHONDONTWRITEBYTECODE"] = "1"
        try:
            completed = subprocess.run(
                args, cwd=private_root, timeout=650, check=False,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                env=isolated_env,
            )
            if completed.returncode == 0 and output.is_file() and output.stat().st_size > 100000:
                print("Shared private animation and captions rendered with Macca branding.")
                return True
            # Never expose private Python source excerpts through public CI logs.
            print("::warning::Private Macca renderer did not complete; using previous public renderer.")
        except (subprocess.TimeoutExpired, OSError):
            print("::warning::Private Macca renderer unavailable; using previous public renderer.")
        output.unlink(missing_ok=True)
        return False


def _music_ready_video(source: Path, target: Path) -> None:
    """Preserve Macca visuals but omit narration; Instagram adds catalog MUSIC."""
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(source),
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
        "-c:a", "aac", "-b:a", "128k", "-shortest",
        "-movflags", "+faststart", str(target)
    ], check=True, timeout=180)


def main() -> None:
    instagram = _ranked(_read(Path(os.environ.get(
        "INSTAGRAM_QUEUE_FILE", ROOT / "blog" / "instagram-queue.json")), []))[:1]
    youtube = _ranked(_read(Path(os.environ.get(
        "YOUTUBE_QUEUE_FILE", ROOT / "blog" / "youtube-queue.json")), []))[:1]
    if os.environ.get("INSTAGRAM_RETRY_ONLY_FIRST") == "true":
        youtube = []
    posts = {item.get("slug"): item for item in _read(ROOT / "blog" / "posts.json", [])}
    slugs = list(dict.fromkeys(item["slug"] for item in [*instagram, *youtube] if item.get("slug")))
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {"schemaVersion": 2, "host": "github-release", "videos": {}}
    for slug in slugs:
        article = posts.get(slug)
        if not article:
            print(f"Cannot render missing article {slug}; retained in queue.")
            continue
        output = VIDEO_DIR / f"{slug}.mp4"
        if not output.is_file():
            if not _render_with_private_engine(article, output):
                with tempfile.TemporaryDirectory(prefix="macca-shorts-") as work:
                    create_short(article, output, work)
        entry = {"localPath": str(output)}
        if any(item.get("slug") == slug for item in instagram):
            # Shared engine supplies an actual caption-free Instagram variant.
            # The fallback renderer continues using its existing mute helper.
            prepared = VIDEO_DIR / f"{slug}-instagram-music.mp4"
            if prepared.is_file():
                insta = prepared
            else:
                insta = VIDEO_DIR / f"{slug}-instagram.mp4"
                _music_ready_video(output, insta)
            entry["instagramPath"] = str(insta)
            entry["releaseTag"] = release_tag(slug)
        manifest["videos"][slug] = entry
        _write(MANIFEST, manifest)
        print(f"Rendered Macca Short for {slug} (YouTube voice, Instagram music-only).")
    _write(MANIFEST, manifest)


def upload() -> None:
    manifest = _read(MANIFEST, {"videos": {}})
    for slug, entry in manifest.get("videos", {}).items():
        if not entry.get("instagramPath"):
            continue
        tag = entry["releaseTag"]
        if entry.get("reelUrl"):
            continue
        try:
            _, url = upload_video(Path(entry["instagramPath"]), slug)
            entry["reelUrl"] = url
            print(f"Temporary GitHub Reel URL prepared for {slug}.")
        except Exception:
            # If an upload was created but verification failed, best effort
            # cleanup and leave the article in the Instagram retry queue.
            try:
                delete_video(tag)
            except Exception:
                pass
            raise
        finally:
            _write(MANIFEST, manifest)


def cleanup() -> None:
    manifest = _read(MANIFEST, {"videos": {}})
    for entry in manifest.get("videos", {}).values():
        if entry.get("releaseTag"):
            try:
                delete_video(entry["releaseTag"])
            except Exception:
                print(f"::warning::Temporary release deletion needs later retry: {entry['releaseTag']}.")
    cleanup_stale()


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "render"
    if mode == "render":
        main()
    elif mode == "upload":
        upload()
    elif mode == "cleanup":
        cleanup()
    else:
        raise SystemExit("Usage: python -m scripts.social_video [render|upload|cleanup]")
