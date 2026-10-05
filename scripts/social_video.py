"""Render one shared local video per queued article and stage Reels on optional R2."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

import boto3
from botocore.config import Config

from src.youtube.shorts import create_short
from src.youtube.r2_limits import MAX_OBJECTS_PER_RUN, MAX_ATTEMPTS_PER_OBJECT, MAX_OBJECT_BYTES, consume_reserved_r2_attempt, remaining_r2_attempts_after_cleanup, reserve_r2_upload

ROOT = Path(__file__).resolve().parents[1]
VIDEO_DIR = Path(os.environ.get("SOCIAL_VIDEO_DIR", Path(os.environ.get("RUNNER_TEMP", ".")) / "macca-social-videos"))
MANIFEST = Path(os.environ.get("INSTAGRAM_REEL_MANIFEST_FILE", Path(os.environ.get("RUNNER_TEMP", ".")) / "macca-reel-manifest.json"))
USAGE_FILE = Path(os.environ.get("R2_USAGE_FILE", ROOT / "blog" / "r2-upload-usage.json"))


def _read(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return fallback


def _write(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def _published_last_24h(records, *, exclude_content_type: str | None = None) -> int:
    cutoff = datetime.now(timezone.utc).timestamp() - 24 * 3600
    if isinstance(records, dict):
        values = records.values()
    else:
        values = records or []
    total = 0
    for record in values:
        if exclude_content_type and record.get("contentType") == exclude_content_type:
            continue
        try:
            stamp = datetime.fromisoformat(str(record.get("publishedAt", "")).replace("Z", "+00:00")).timestamp()
        except (ValueError, AttributeError):
            continue
        if stamp >= cutoff:
            total += 1
    return total


def _hours_since_latest(records) -> float | None:
    latest = None
    values = records.values() if isinstance(records, dict) else (records or [])
    for record in values:
        try:
            stamp = datetime.fromisoformat(str(record.get("publishedAt", "")).replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            continue
        if latest is None or stamp > latest:
            latest = stamp
    if latest is None:
        return None
    return (datetime.now(timezone.utc) - latest).total_seconds() / 3600


def _ranked(items):
    return sorted(
        items or [],
        key=lambda item: (int(item.get("socialScore") or 0), str(item.get("queuedAt") or "")),
        reverse=True,
    )


def _r2_configured() -> bool:
    names = (
        "CLOUDFLARE_R2_ACCOUNT_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID",
        "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_BUCKET",
        "CLOUDFLARE_R2_PUBLIC_BASE_URL",
    )
    return all(os.environ.get(name) for name in names)


def _r2_client():
    account = os.environ["CLOUDFLARE_R2_ACCOUNT_ID"]
    return boto3.client(
        "s3", endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["CLOUDFLARE_R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["CLOUDFLARE_R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        # Disable botocore's hidden retries; explicit retry loops below are capped.
        config=Config(retries={"total_max_attempts": 1, "mode": "standard"}),
    )


def main() -> None:
    ig_queue = _read(Path(os.environ.get("INSTAGRAM_QUEUE_FILE", ROOT / "blog" / "instagram-queue.json")), [])
    yt_queue = _read(Path(os.environ.get("YOUTUBE_QUEUE_FILE", ROOT / "blog" / "youtube-queue.json")), [])
    # The hourly workflow itself is the pacing mechanism: at most one queued
    # article is rendered per platform on each run. There is no local daily cap
    # or multi-hour spacing guard.
    ig_queue = _ranked(ig_queue)[:1]
    yt_queue = _ranked(yt_queue)[:1]
    if os.environ.get("INSTAGRAM_RETRY_ONLY_FIRST") == "true":
        ig_queue = ig_queue[:1]
        yt_queue = []
        print("Instagram-only retry enabled; rendering only the highest-priority pending Instagram item.")
    posts = _read(ROOT / "blog" / "posts.json", [])
    slugs = list(dict.fromkeys(item.get("slug") for item in [*ig_queue, *yt_queue] if item.get("slug")))
    print(f"Social render budget: {len(ig_queue)} Instagram and {len(yt_queue)} YouTube item(s) selected; no local daily cap or spacing guard.")
    by_slug = {item.get("slug"): item for item in posts}
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {"schemaVersion": 1, "videos": {}}
    r2_ready = _r2_configured()
    usage = _read(USAGE_FILE, {"schemaVersion": 1, "month": "", "monthlyUploadAttempts": 0, "recentUploadAttempts24h": [], "articles": {}})
    objects_reserved_this_run = 0

    for slug in slugs:
        article = by_slug.get(slug)
        if not article:
            print(f"Queued social video skipped; article not found: {slug}")
            continue
        output = VIDEO_DIR / f"{slug}.mp4"
        if not output.is_file():
            with tempfile.TemporaryDirectory(prefix="macca-render-") as work:
                create_short(article, output, work)
        entry = {"localPath": str(output)}
        queued_for_instagram = any(item.get("slug") == slug for item in ig_queue)
        if r2_ready and os.environ.get("SHORTS_RENDERER", "narrated").lower() != "legacy" and queued_for_instagram:
            reservation = usage.get("articles", {}).get(slug)
            object_key = f"instagram-reels/{uuid.uuid4().hex}-{slug}.mp4"
            attempts = 0
            reason = ""
            if objects_reserved_this_run >= MAX_OBJECTS_PER_RUN:
                reason = "Per-run R2 object limit reached."
            elif reservation:
                reserved = min(MAX_ATTEMPTS_PER_OBJECT, int(reservation.get("attemptsReserved", 0)))
                remaining = remaining_r2_attempts_after_cleanup(reservation)
                if reservation.get("deletedAt") and remaining > 0 and output.stat().st_size <= MAX_OBJECT_BYTES:
                    object_key = reservation.get("objectKey", "")
                    if object_key.startswith("instagram-reels/"):
                        attempts = remaining
                        reservation["retryReservedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                        _write(USAGE_FILE, usage)
                        print(f"Resuming the remaining pre-reserved attempt for {slug} with the same R2 object key; no quota increase.")
                    else:
                        reason = "Existing R2 object key is outside the Instagram Reel prefix."
                elif reservation.get("deletedAt") and remaining > 0:
                    reason = "MP4 exceeds the 25 MB R2 limit."
                else:
                    reason = "This article has no unused pre-reserved R2 attempt."
            else:
                attempts, reason = reserve_r2_upload(
                    usage, slug=slug, object_key=object_key, size_bytes=output.stat().st_size,
                    objects_reserved_this_run=objects_reserved_this_run,
                )
                if attempts:
                    reservation = usage["articles"][slug]
                    _write(USAGE_FILE, usage)
                    print(f"Reserved {attempts} bounded R2 attempt(s) for {slug}; quota is persisted before network upload.")
            if attempts:
                objects_reserved_this_run += 1
                entry.update({"r2ObjectKey": object_key, "attemptsReserved": attempts, "uploadStarted": False})
            else:
                print(f"R2 blocked for {slug}: {reason} Instagram item remains queued for a future Reel retry.")
        manifest["videos"][slug] = entry
        _write(MANIFEST, manifest)
        print(f"Prepared shared vertical video for {slug} ({output.stat().st_size} bytes).")
    if not slugs:
        _write(MANIFEST, manifest)
    if not r2_ready:
        print("R2 Reel staging is not configured; Instagram will use its existing square-image fallback.")


def upload_reel_objects() -> None:
    manifest = _read(MANIFEST, {"videos": {}})
    if not _r2_configured():
        print("R2 is not configured; no video was sent. Instagram item remains queued for a future Reel retry.")
        return
    items = list(manifest.get("videos", {}).items())
    s3 = None
    uploaded_objects_this_run = 0
    for slug, entry in items:
        key = entry.get("r2ObjectKey")
        attempts = min(MAX_ATTEMPTS_PER_OBJECT, int(entry.get("attemptsReserved", 0)))
        if not key or attempts <= 0:
            continue
        if uploaded_objects_this_run >= MAX_OBJECTS_PER_RUN:
            print("R2 per-run guard stopped unexpected additional object uploads.")
            break
        uploaded_objects_this_run += 1
        path = Path(entry.get("localPath", ""))
        try:
            size = path.stat().st_size
        except OSError:
            print(f"R2 blocked for {slug}: local MP4 is missing; Instagram item remains queued for a future Reel retry.")
            continue
        if size > MAX_OBJECT_BYTES:
            print(f"R2 blocked for {slug}: MP4 exceeds 25 MB; Instagram item remains queued for a future Reel retry.")
            continue
        if s3 is None:
            try:
                s3 = _r2_client()
            except Exception as error:
                print(f"R2 unavailable ({type(error).__name__}); Instagram item remains queued for a future Reel retry.")
                return
        entry["uploadStarted"] = True
        _write(MANIFEST, manifest)
        payload = path.read_bytes()
        success = False
        for attempt in range(1, attempts + 1):
            usage = _read(USAGE_FILE, {"articles": {}})
            consumed, reason = consume_reserved_r2_attempt(usage, slug=slug, object_key=key)
            if not consumed:
                print(f"R2 PUT skipped for {slug}: {reason}")
                break
            # Persist the consumed attempt before making the network request so
            # retries or interrupted runs cannot reuse an already-started PUT.
            _write(USAGE_FILE, usage)
            try:
                s3.put_object(
                    Bucket=os.environ["CLOUDFLARE_R2_BUCKET"], Key=key,
                    Body=payload, ContentLength=len(payload), ContentType="video/mp4",
                    CacheControl="public, max-age=3600",
                )
                entry["uploaded"] = True
                success = True
                print(f"R2 object uploaded for {slug} (attempt {attempt}/{attempts}).")
                break
            except Exception as error:
                print(f"R2 upload attempt {attempt}/{attempts} failed ({type(error).__name__}); no unbounded retry.")
        if success:
            usage = _read(USAGE_FILE, {"schemaVersion": 1, "month": "", "monthlyUploadAttempts": 0, "recentUploadAttempts24h": [], "articles": {}})
            reservation = usage.get("articles", {}).get(slug)
            if reservation and reservation.get("objectKey") == key:
                reservation["uploadedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            public_base = os.environ["CLOUDFLARE_R2_PUBLIC_BASE_URL"].rstrip("/")
            url = f"{public_base}/{key}"
            request = Request(url, method="HEAD", headers={"User-Agent": "MaccaSocialPublisher/1.0"})
            try:
                with urlopen(request, timeout=20) as response:
                    if response.status == 200 and response.headers.get("content-type", "").startswith("video/mp4"):
                        entry["reelUrl"] = url
                        if reservation and reservation.get("objectKey") == key:
                            reservation["publicVerifiedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                        print(f"R2 public URL verified: {url} (HTTP 200, video/mp4).")
                    else:
                        print(f"Temporary R2 video is not publicly reachable as video/mp4 (HTTP {response.status}); the Reel will be retried later.")
            except Exception as error:
                print(f"Temporary R2 video could not be verified ({type(error).__name__}); the Reel will be retried later.")
            _write(USAGE_FILE, usage)
        if not entry.get("reelUrl"):
            print(f"Reel staging unavailable for {slug}; Instagram item remains queued for a future Reel retry.")
        _write(MANIFEST, manifest)


def cleanup() -> None:
    data = _read(MANIFEST, {"videos": {}})
    names = ("CLOUDFLARE_R2_ACCOUNT_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_BUCKET")
    if all(os.environ.get(name) for name in names):
        s3 = None
        usage = _read(USAGE_FILE, {"articles": {}})
        pending = {}
        for slug, entry in data.get("videos", {}).items():
            key = entry.get("r2ObjectKey")
            if key and entry.get("uploadStarted"):
                pending[key] = slug
        for slug, reservation in usage.get("articles", {}).items():
            key = reservation.get("objectKey")
            if key and reservation.get("uploadedAt") and not reservation.get("deletedAt"):
                pending[key] = slug

        for key, slug in pending.items():
            try:
                if s3 is None:
                    s3 = _r2_client()
                deleted = False
                for attempt in range(1, MAX_ATTEMPTS_PER_OBJECT + 1):
                    try:
                        s3.delete_object(Bucket=os.environ["CLOUDFLARE_R2_BUCKET"], Key=key)
                        deleted = True
                        break
                    except Exception as error:
                        print(f"R2 cleanup attempt {attempt}/{MAX_ATTEMPTS_PER_OBJECT} failed ({type(error).__name__}).")
                if deleted:
                    reservation = usage.get("articles", {}).get(slug)
                    if reservation and reservation.get("objectKey") == key:
                        reservation["deletedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                    print("Temporary Instagram Reel object deleted from R2.")
                else:
                    print("R2 deletion did not complete; the configured one-day lifecycle remains the fallback.")
            except Exception as error:
                print(f"R2 cleanup unavailable ({type(error).__name__}); the one-day lifecycle remains the fallback.")
        if pending:
            _write(USAGE_FILE, usage)
    else:
        print("R2 cleanup credentials are unavailable; the one-day lifecycle remains the fallback.")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "cleanup":
        cleanup()
    elif len(sys.argv) > 1 and sys.argv[1] == "upload":
        upload_reel_objects()
    else:
        main()
