from __future__ import annotations

import os
import random
import shutil
import subprocess
import tempfile
from pathlib import Path

from src.instagram_trending_audio import normalized_name, refresh

ROOT = Path(__file__).resolve().parents[1]
MUSIC_DIR = ROOT / "assets" / "audio" / "instagram"
TREND_CACHE = ROOT / "blog" / "instagram-trending-audio.json"
SUPPORTED_MUSIC = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}


def instagram_music_track() -> Path | None:
    explicit = os.environ.get("INSTAGRAM_MUSIC_PATH", "").strip()
    if explicit:
        candidate = Path(explicit)
        if candidate.is_file() and candidate.suffix.lower() in SUPPORTED_MUSIC:
            return candidate
        raise RuntimeError("INSTAGRAM_MUSIC_PATH does not point to a supported local audio file.")

    tracks = sorted(
        path for path in MUSIC_DIR.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_MUSIC
    ) if MUSIC_DIR.exists() else []
    if not tracks:
        return None

    try:
        trends = refresh(TREND_CACHE).get("items", [])
    except Exception as exc:
        print(f"Instagram trend refresh failed ({type(exc).__name__}); using local fallback.")
        trends = []

    by_stem = {normalized_name(path.stem): path for path in tracks}
    for trend in trends:
        wanted = normalized_name(str(trend.get("name", "")))
        if wanted in by_stem:
            print(f"Selected current Instagram trend: {trend.get('name')} ({trend.get('source')}).")
            return by_stem[wanted]

    print("No current trend matched the licensed local audio library; using a local fallback track.")
    return random.choice(tracks)


def mix_instagram_audio(source: Path, output: Path) -> Path:
    """Mix a supplied local music track under narration for Instagram only.

    This preserves the source file for YouTube. It does not attach a track from
    Instagram's native music library; the supplied file must already be licensed
    for the intended use.
    """
    music = instagram_music_track()
    if not music:
        return source

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("FFmpeg is required to mix Instagram background music.")

    output.parent.mkdir(parents=True, exist_ok=True)
    start = max(0.0, float(os.environ.get("INSTAGRAM_MUSIC_START_SECONDS", "0") or 0))
    music_lufs = float(os.environ.get("INSTAGRAM_MUSIC_LUFS", "-18") or -18)
    voice_lufs = float(os.environ.get("INSTAGRAM_VOICE_LUFS", "-23") or -23)
    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source)]
    if start:
        command += ["-ss", f"{start:.3f}"]
    command += [
        "-stream_loop", "-1", "-i", str(music),
        "-filter_complex",
        f"[0:a]loudnorm=I={voice_lufs:g}:TP=-1.5:LRA=11[voice];"
        f"[1:a]loudnorm=I={music_lufs:g}:TP=-8:LRA=7[music];"
        "[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]",
        "-map", "0:v:0", "-map", "[aout]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
        "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart",
        str(output),
    ]
    subprocess.run(command, check=True)
    print(f"Instagram-only background track mixed under narration: {music.name}")
    return output
