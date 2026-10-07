"""Publish scheduled GTA VI Shorts/Reels using Rockstar's official media clips.

This lane is separate from the hourly news pipeline:
- official GTA VI clips are downloaded from Rockstar's public media ZIP and cached by Actions;
- narration/text comes from already-published Macca Blog articles, so no extra AI call is required;
- source audio is muted; the clip is moving B-roll under Macca narration/branding;
- publications are recorded with contentType=rockstar-media so article caps stay independent.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import tempfile
import uuid
import urllib.error
import urllib.parse
import urllib.request
import wave
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import boto3
from botocore.config import Config
from PIL import Image, ImageDraw

from src.youtube.kokoro_tts import LocalNarrator
from src.youtube.shorts import (
    FPS,
    HEIGHT,
    MAX_DURATION,
    MAX_SLIDES,
    MIN_DURATION,
    WIDTH,
    _article_script,
    _font,
    _layout_text,
    _music_track,
)
from src.youtube.upload import upload_video

ROOT = Path(__file__).resolve().parents[1]
POSTS_FILE = ROOT / "blog" / "posts.json"
STATE_FILE = ROOT / "blog" / "rockstar-media-state.json"
YOUTUBE_PUBLISHED = ROOT / "blog" / "youtube-published.json"
INSTAGRAM_PUBLISHED = ROOT / "blog" / "instagram-published.json"
MEDIA_CACHE = Path(os.environ.get("ROCKSTAR_MEDIA_CACHE", ROOT / ".cache" / "rockstar-media"))
MEDIA_ZIP_URL = os.environ.get(
    "ROCKSTAR_MEDIA_ZIP_URL",
    "https://media-rockstargames-com.akamaized.net/VI/downloads/videos/GTAVI_Videos.zip",
)
MEDIA_SOURCE_PAGE = "https://www.rockstargames.com/VI/media/videos"
MAX_R2_BYTES = 25 * 1024 * 1024


def read_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return fallback


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_time(value: object) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
    except ValueError:
        return None


def published_values(records):
    return list(records.values()) if isinstance(records, dict) else list(records or [])


def recent_count(records, *, content_type: str | None = None) -> int:
    now = datetime.now(timezone.utc)
    total = 0
    for record in published_values(records):
        if content_type is not None and record.get("contentType") != content_type:
            continue
        stamp = parse_time(record.get("publishedAt"))
        if stamp and (now - stamp).total_seconds() < 24 * 3600:
            total += 1
    return total


def latest_publication(*collections) -> datetime | None:
    latest = None
    for records in collections:
        for record in published_values(records):
            stamp = parse_time(record.get("publishedAt"))
            if stamp and (latest is None or stamp > latest):
                latest = stamp
    return latest


def _safe_slug(value: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", str(value).lower()).strip("-")
    return text[:96] or "rockstar-media"


def eligible_articles(posts: list[dict]) -> list[dict]:
    result = []
    for post in posts:
        if post.get("skip") is True or not post.get("slug"):
            continue
        haystack = " ".join(
            [str(post.get("title", "")), str(post.get("category", "")), *map(str, post.get("tags", []))]
        ).lower()
        if not any(term in haystack for term in ("gta 6", "gta vi", "grand theft auto vi", "rockstar")):
            continue
        if not str(post.get("socialHook") or post.get("description") or "").strip():
            continue
        result.append(post)
    result.sort(key=lambda item: str(item.get("publishedAt") or item.get("date") or ""), reverse=True)
    return result


def select_article(posts: list[dict], state: dict) -> dict:
    candidates = eligible_articles(posts)
    if not candidates:
        raise RuntimeError("No eligible GTA/Rockstar article exists in blog/posts.json.")
    recent_slugs = list(state.get("articleHistory") or [])[-24:]
    for post in candidates:
        if post["slug"] not in recent_slugs:
            return post
    return candidates[0]


def _download_zip(zip_path: Path) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    temp = zip_path.with_suffix(".tmp")
    request = urllib.request.Request(MEDIA_ZIP_URL, headers={"User-Agent": "MaccaRockstarMedia/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response, temp.open("wb") as output:
        while True:
            block = response.read(1024 * 1024)
            if not block:
                break
            output.write(block)
    if temp.stat().st_size < 1024:
        temp.unlink(missing_ok=True)
        raise RuntimeError("Rockstar media ZIP download returned an unexpectedly small file.")
    temp.replace(zip_path)


def ensure_official_clips() -> list[Path]:
    clips_dir = MEDIA_CACHE / "clips"
    marker = MEDIA_CACHE / "cache-state.json"
    current_week = datetime.now(timezone.utc).strftime("%G-%V")
    cache_state = read_json(marker, {})
    if cache_state.get("isoWeek") != current_week:
        shutil.rmtree(clips_dir, ignore_errors=True)
        (MEDIA_CACHE / "GTAVI_Videos.zip").unlink(missing_ok=True)

    clips_dir.mkdir(parents=True, exist_ok=True)
    clips = sorted(path for path in clips_dir.iterdir() if path.suffix.lower() in {".mp4", ".mov", ".m4v"})
    if clips:
        return clips

    zip_path = MEDIA_CACHE / "GTAVI_Videos.zip"
    if not zip_path.is_file():
        print(f"Downloading Rockstar official GTA VI media ZIP: {MEDIA_ZIP_URL}")
        _download_zip(zip_path)

    with zipfile.ZipFile(zip_path) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            suffix = Path(info.filename).suffix.lower()
            if suffix not in {".mp4", ".mov", ".m4v"}:
                continue
            target = clips_dir / Path(info.filename).name
            with archive.open(info) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output, length=1024 * 1024)

    clips = sorted(path for path in clips_dir.iterdir() if path.suffix.lower() in {".mp4", ".mov", ".m4v"})
    if not clips:
        raise RuntimeError("The Rockstar media ZIP did not contain a supported video file.")
    write_json(marker, {"isoWeek": current_week, "source": MEDIA_ZIP_URL, "clipCount": len(clips)})
    print(f"Official Rockstar clip library ready: {len(clips)} clip(s).")
    return clips


def select_clip(clips: list[Path], article: dict, state: dict) -> Path:
    title = str(article.get("title", "")).lower()
    preferred_tokens = [
        token for token in ("jason", "lucia", "cal", "boobie", "dre", "dimez", "raul", "brian")
        if token in title
    ]
    recent = set(list(state.get("clipHistory") or [])[-4:])
    return sorted(
        clips,
        key=lambda path: (
            0 if any(token in path.stem.lower() for token in preferred_tokens) else 1,
            1 if path.name in recent else 0,
            path.name.lower(),
        ),
    )[0]


def _audio_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as audio:
        return audio.getnframes() / audio.getframerate()


def _overlay(path: Path, headline: str, index: int, total: int) -> None:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle(
        (48, 150, 1032, 274), radius=34, fill=(10, 7, 20, 185),
        outline=(77, 224, 237, 210), width=3,
    )
    draw.text(
        (82, 188), "MACCA THE GATOR  |  OFFICIAL GTA VI FOOTAGE",
        font=_font(27, True), fill=(245, 245, 245, 255),
    )
    font, lines, line_height = _layout_text(draw, headline, 850, 430, max_font_size=68, min_font_size=30)
    text_height = len(lines) * line_height
    panel_height = max(300, text_height + 120)
    panel_bottom = 1720
    panel_top = panel_bottom - panel_height
    draw.rounded_rectangle(
        (48, panel_top, 1032, panel_bottom), radius=40, fill=(10, 7, 20, 210),
        outline=(255, 104, 173, 215), width=3,
    )
    y = panel_top + (panel_height - text_height) // 2
    for line in lines:
        box = draw.textbbox((0, 0), line, font=font, stroke_width=1)
        x = (WIDTH - (box[2] - box[0])) // 2
        draw.text(
            (x, y), line, font=font, fill=(255, 247, 242, 255),
            stroke_width=1, stroke_fill=(8, 5, 16, 230),
        )
        y += line_height
    draw.text(
        (76, 1760), f"ROCKSTAR OFFICIAL MEDIA  •  {index + 1:02d}/{total:02d}",
        font=_font(24, True), fill=(230, 215, 232, 255),
    )
    image.save(path)


def render_short(article: dict, source_clip: Path, output: Path, work: Path) -> Path:
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise RuntimeError("FFmpeg and ffprobe are required for Rockstar media videos.")
    work.mkdir(parents=True, exist_ok=True)

    beats = _article_script(article)
    narrator = LocalNarrator(work / "tts-metadata.json")
    speed = 1.0
    while True:
        audio_files = [work / f"voice-{index:02d}.wav" for index in range(len(beats))]
        narrator.synthesize([narration for _, narration in beats], audio_files, speed)
        speech = [_audio_duration(path) for path in audio_files]
        durations = [max(value + 0.14, 2.8) for value in speech]
        total_duration = max(MIN_DURATION + 0.2, sum(durations))
        if total_duration <= MAX_DURATION:
            durations[-1] += total_duration - sum(durations)
            break
        if len(beats) == MAX_SLIDES:
            beats = beats[:2] + beats[-1:]
            continue
        if speed < 1.06:
            speed = round(min(1.06, speed + 0.03), 2)
            continue
        raise RuntimeError("Rockstar media narration cannot fit the 15-20 second target without cutting a fact.")

    probe = json.loads(subprocess.check_output(
        [ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "json", str(source_clip)],
        text=True,
    ))
    source_duration = max(0.1, float(probe.get("format", {}).get("duration") or 0.1))

    video_parts = []
    elapsed = 0.0
    for index, ((headline, _), duration) in enumerate(zip(beats, durations)):
        overlay = work / f"overlay-{index:02d}.png"
        _overlay(overlay, headline, index, len(beats))
        part = work / f"part-{index:02d}.mp4"
        start = elapsed % source_duration
        filter_graph = (
            f"[0:v]fps={FPS},split=2[bg][fg];"
            f"[bg]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,"
            f"crop={WIDTH}:{HEIGHT},gblur=sigma=24[bg2];"
            f"[fg]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease[fg2];"
            f"[bg2][fg2]overlay=(W-w)/2:(H-h)/2[base];"
            f"[base][1:v]overlay=0:0:format=auto,format=yuv420p[out]"
        )
        subprocess.run([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-ss", f"{start:.3f}", "-stream_loop", "-1", "-i", str(source_clip),
            "-loop", "1", "-i", str(overlay), "-t", f"{duration:.3f}",
            "-filter_complex", filter_graph, "-map", "[out]", "-an", "-r", str(FPS),
            "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(part),
        ], check=True)
        video_parts.append(part)
        elapsed += duration

    joined_audio = work / "voice.wav"
    with wave.open(str(audio_files[0]), "rb") as first:
        params = first.getparams()
        with wave.open(str(joined_audio), "wb") as combined:
            combined.setparams(params)
            for audio_path, duration in zip(audio_files, durations):
                with wave.open(str(audio_path), "rb") as audio:
                    combined.writeframes(audio.readframes(audio.getnframes()))
                silence_frames = max(0, round((duration - _audio_duration(audio_path)) * params.framerate))
                combined.writeframes(b"\0" * silence_frames * params.nchannels * params.sampwidth)

    listing = work / "parts.txt"
    listing.write_text("\n".join(f"file '{part.as_posix()}'" for part in video_parts) + "\n", encoding="utf-8")
    output.parent.mkdir(parents=True, exist_ok=True)
    music = _music_track()
    command = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "concat", "-safe", "0", "-i", str(listing), "-i", str(joined_audio),
    ]
    if music:
        command += ["-stream_loop", "-1", "-i", str(music)]
        audio_filter = (
            "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[voice];"
            "[2:a]loudnorm=I=-32:TP=-8:LRA=7[music];"
            "[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        )
    else:
        audio_filter = "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[aout]"
    command += [
        "-filter_complex", audio_filter, "-map", "0:v:0", "-map", "[aout]", "-r", str(FPS),
        "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac",
        "-ac", "2", "-ar", "48000", "-b:a", "256k", "-t", f"{total_duration:.3f}",
        "-shortest", "-movflags", "+faststart", str(output),
    ]
    subprocess.run(command, check=True)

    result = json.loads(subprocess.check_output(
        [ffprobe, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(output)],
        text=True,
    ))
    video = next(stream for stream in result["streams"] if stream.get("codec_type") == "video")
    audio = next(stream for stream in result["streams"] if stream.get("codec_type") == "audio")
    actual = float(result["format"]["duration"])
    if (video.get("codec_name"), video.get("width"), video.get("height"), video.get("r_frame_rate")) != (
        "h264", WIDTH, HEIGHT, f"{FPS}/1"
    ):
        raise RuntimeError("Rockstar media video failed H.264 1080x1920 30 FPS validation.")
    if audio.get("codec_name") != "aac" or audio.get("sample_rate") != "48000" or audio.get("channels") != 2:
        raise RuntimeError("Rockstar media audio must be AAC stereo at 48 kHz.")
    if not MIN_DURATION <= actual <= MAX_DURATION:
        raise RuntimeError(f"Rockstar media video duration is {actual:.1f}s; expected 15-20s.")
    return output


def youtube_metadata(article: dict) -> tuple[str, str, list[str]]:
    title = " ".join(str(article.get("youtubeTitle") or article.get("title") or "GTA VI").split())
    title = title[:78].rstrip(" ,:;–—-")
    article_url = f"https://macca-lab.onrender.com/blog/{article['slug']}/"
    hook = str(article.get("socialHook") or article.get("description") or article.get("title") or "").strip()
    description = (
        f"{hook}\n\nOfficial GTA VI footage: {MEDIA_SOURCE_PAGE}\n"
        f"Full story: {article_url}?utm_source=youtube&utm_medium=short&utm_campaign=rockstar_media\n\n"
        "#GTA6 #RockstarGames #Shorts"
    )[:5000]
    return title, description, ["GTA 6", "GTA VI", "Grand Theft Auto VI", "Rockstar Games", "Macca the Gator"]


def _post_form(url: str, params: dict[str, str]) -> dict:
    data = urllib.parse.urlencode(params).encode()
    request = urllib.request.Request(url, data=data, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read(4096).decode("utf-8", "replace")
        raise RuntimeError(f"Meta Graph API returned HTTP {exc.code}: {body[:500]}") from None


def _get_json(url: str) -> dict:
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read(4096).decode("utf-8", "replace")
        raise RuntimeError(f"Meta Graph API returned HTTP {exc.code}: {body[:500]}") from None


def _trending_audio_configuration(account_id: str) -> str:
    token = os.environ.get("INSTAGRAM_AUDIO_ACCESS_TOKEN") or os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")
    if not token:
        raise RuntimeError("Instagram Audio API token is not configured.")
    version = os.environ.get("INSTAGRAM_GRAPH_VERSION", "v26.0")
    last_error = ""
    for audio_type in ("music", "original_sound"):
        query = urllib.parse.urlencode({"audio_type": audio_type, "user_id": account_id, "access_token": token})
        try:
            payload = _get_json(f"https://graph.facebook.com/{version}/ig_audio?{query}")
        except Exception as exc:
            last_error = str(exc)
            continue
        rows = payload.get("audio", []) if isinstance(payload, dict) else []
        for row in rows:
            audio_id = str(row.get("audio_id") or row.get("id") or "").strip()
            if not audio_id:
                continue
            title = row.get("title") or row.get("name") or ""
            artist = row.get("display_artist") or row.get("artist") or ""
            label = " - ".join(value for value in (title, artist) if value) or audio_id
            print(f"Instagram trending audio selected from Meta: {label} ({audio_type}).")
            audio_volume = max(0, min(100, int(os.environ.get("INSTAGRAM_TREND_AUDIO_VOLUME", "100"))))
            video_volume = max(0, min(100, int(os.environ.get("INSTAGRAM_VIDEO_AUDIO_VOLUME", "25"))))
            return json.dumps({
                "audio_id": audio_id,
                "audio_volume": audio_volume,
                "video_volume": video_volume,
            }, separators=(",", ":"))
    raise RuntimeError(
        "Instagram Audio API returned no usable trending audio"
        + (f": {last_error}" if last_error else "")
        + ". Reel retained for retry."
    )


def publish_instagram(video: Path, article: dict, publication_key: str) -> dict:
    token = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")
    account = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID", "")
    required_r2 = (
        "CLOUDFLARE_R2_ACCOUNT_ID",
        "CLOUDFLARE_R2_ACCESS_KEY_ID",
        "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
        "CLOUDFLARE_R2_BUCKET",
        "CLOUDFLARE_R2_PUBLIC_BASE_URL",
    )
    if not token or not account or not all(os.environ.get(name) for name in required_r2):
        raise RuntimeError("Instagram or R2 publishing credentials are not configured.")
    if video.stat().st_size > MAX_R2_BYTES:
        raise RuntimeError("Rockstar media MP4 exceeds the 25 MB temporary R2 guard.")

    r2 = boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['CLOUDFLARE_R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["CLOUDFLARE_R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["CLOUDFLARE_R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(retries={"total_max_attempts": 2, "mode": "standard"}),
    )
    key = f"rockstar-media/{uuid.uuid4().hex}-{_safe_slug(article['slug'])}.mp4"
    bucket = os.environ["CLOUDFLARE_R2_BUCKET"]
    public_url = f"{os.environ['CLOUDFLARE_R2_PUBLIC_BASE_URL'].rstrip('/')}/{key}"
    r2.put_object(
        Bucket=bucket, Key=key, Body=video.read_bytes(),
        ContentType="video/mp4", CacheControl="public, max-age=3600",
    )
    try:
        request = urllib.request.Request(public_url, method="HEAD", headers={"User-Agent": "MaccaRockstarMedia/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status != 200 or not str(response.headers.get("content-type", "")).startswith("video/mp4"):
                raise RuntimeError("Temporary R2 object is not publicly reachable as video/mp4.")

        hook = str(article.get("instagramCaptionLead") or article.get("socialHook") or article.get("title") or "").strip()
        article_url = f"https://macca-lab.onrender.com/blog/{article['slug']}/"
        caption = (
            f"{hook}\n\nOfficial GTA VI footage from Rockstar Games.\n"
            f"Full story → {article_url}?utm_source=instagram&utm_medium=reel&utm_campaign=rockstar_media\n\n"
            f"Media source: {MEDIA_SOURCE_PAGE}\n\n#GTA6 #RockstarGames #MaccaTheGator"
        )[:1400]
        version = os.environ.get("INSTAGRAM_GRAPH_VERSION", "v26.0")
        base = f"https://graph.facebook.com/{version}"
        audio_configuration = _trending_audio_configuration(account)
        container = _post_form(f"{base}/{account}/media", {
            "media_type": "REELS",
            "video_url": public_url,
            "caption": caption,
            "share_to_feed": "false",
            "audio_configuration": audio_configuration,
            "access_token": token,
        })
        container_id = container.get("id")
        if not container_id:
            raise RuntimeError("Meta did not return an Instagram media container ID.")

        import time
        status = ""
        for _ in range(30):
            status_data = _get_json(
                f"{base}/{container_id}?fields=status_code,status&access_token={urllib.parse.quote(token)}"
            )
            status = status_data.get("status_code", "")
            if status == "FINISHED":
                break
            if status in {"ERROR", "EXPIRED"}:
                raise RuntimeError(f"Instagram container ended with {status}: {status_data.get('status', '')}")
            time.sleep(5)
        if status != "FINISHED":
            raise RuntimeError(f"Instagram container did not finish processing (last status: {status or 'unknown'}).")

        media = _post_form(f"{base}/{account}/media_publish", {
            "creation_id": container_id,
            "access_token": token,
        })
        media_id = media.get("id")
        if not media_id:
            raise RuntimeError("Meta did not return a published media ID.")
        try:
            info = _get_json(
                f"{base}/{media_id}?fields=permalink&access_token={urllib.parse.quote(token)}"
            )
            permalink = info.get("permalink", "")
        except Exception:
            permalink = ""
        return {
            "contentType": "rockstar-media",
            "publicationKey": publication_key,
            "articleUrl": article_url,
            "mediaId": media_id,
            "permalink": permalink,
            "mediaType": "REELS",
            "publishedAt": datetime.now(timezone.utc).isoformat(),
        }
    finally:
        try:
            r2.delete_object(Bucket=bucket, Key=key)
            print("Temporary Rockstar Reel object deleted from R2.")
        except Exception as exc:
            print(f"R2 cleanup failed ({type(exc).__name__}); bucket lifecycle remains the fallback.")


def run(*, publish: bool) -> int:
    posts = read_json(POSTS_FILE, [])
    state = read_json(
        STATE_FILE,
        {"schemaVersion": 1, "articleHistory": [], "clipHistory": [], "runs": []},
    )
    youtube_records = read_json(YOUTUBE_PUBLISHED, [])
    instagram_records = read_json(INSTAGRAM_PUBLISHED, {})

    # Rockstar media is paced only by its own scheduled workflow times.
    # It does not share the hourly article lane's publication budget.
    youtube_allowed = instagram_allowed = True

    article = select_article(posts, state)
    clips = ensure_official_clips()
    clip = select_clip(clips, article, state)
    publication_key = f"rockstar-media:{article['slug']}:{_safe_slug(clip.stem)}"
    print(f"Rockstar media selection: article={article['slug']}; clip={clip.name}; publish={publish}.")

    with tempfile.TemporaryDirectory(prefix="macca-rockstar-media-") as temp:
        work = Path(temp) / "work"
        output = Path(temp) / "macca-rockstar-media.mp4"
        render_short(article, clip, output, work)

        if not publish:
            preview_dir = Path(
                os.environ.get("ROCKSTAR_MEDIA_PREVIEW_DIR", ROOT / "rockstar-media-preview")
            )
            preview_dir.mkdir(parents=True, exist_ok=True)
            target = preview_dir / f"{_safe_slug(article['slug'])}.mp4"
            shutil.copy2(output, target)
            print(f"Preview rendered: {target}")
            return 0

        successes = 0
        failures = []
        title, description, tags = youtube_metadata(article)

        if youtube_allowed:
            try:
                result = upload_video(
                    output, title=title, description=description,
                    tags=tags, privacy_status="public",
                )
                youtube_records.append({
                    "contentType": "rockstar-media",
                    "slug": article["slug"],
                    "publicationKey": publication_key,
                    "articleUrl": f"https://macca-lab.onrender.com/blog/{article['slug']}/",
                    "sourceMedia": MEDIA_SOURCE_PAGE,
                    "clip": clip.name,
                    "youtubeVideoId": result["id"],
                    "youtubeUrl": result["url"],
                    "publishedAt": datetime.now(timezone.utc).isoformat(),
                })
                write_json(YOUTUBE_PUBLISHED, youtube_records)
                successes += 1
                print(f"Rockstar media Short uploaded to YouTube: {result['url']}")
            except Exception as exc:
                failures.append(f"YouTube: {type(exc).__name__}: {exc}")
        else:
            print("YouTube Rockstar-media cap reached; Instagram may still publish this slot.")

        if instagram_allowed:
            try:
                instagram_record = publish_instagram(output, article, publication_key)
                instagram_records[f"rockstar-media://{publication_key}"] = instagram_record
                write_json(INSTAGRAM_PUBLISHED, instagram_records)
                successes += 1
                print(
                    "Rockstar media Reel published to Instagram: "
                    f"{instagram_record.get('permalink') or instagram_record['mediaId']}"
                )
            except Exception as exc:
                failures.append(f"Instagram: {type(exc).__name__}: {exc}")
        else:
            print("Instagram Rockstar-media cap reached; YouTube may still publish this slot.")

    if successes:
        state.setdefault("articleHistory", []).append(article["slug"])
        state["articleHistory"] = state["articleHistory"][-60:]
        state.setdefault("clipHistory", []).append(clip.name)
        state["clipHistory"] = state["clipHistory"][-36:]
        state.setdefault("runs", []).append({
            "publicationKey": publication_key,
            "articleSlug": article["slug"],
            "clip": clip.name,
            "platformSuccesses": successes,
            "publishedAt": datetime.now(timezone.utc).isoformat(),
        })
        state["runs"] = state["runs"][-60:]
        write_json(STATE_FILE, state)

    for failure in failures:
        print(f"::warning::{failure}")
    return 1 if failures and not successes else 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["preview", "publish"])
    args = parser.parse_args()
    raise SystemExit(run(publish=args.command == "publish"))


if __name__ == "__main__":
    main()
