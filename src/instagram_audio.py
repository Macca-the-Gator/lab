from __future__ import annotations

import os
import random
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MUSIC_DIR = ROOT / "assets" / "audio" / "instagram"
SUPPORTED_MUSIC = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}


def instagram_music_track() -> Path | None:
    explicit = os.environ.get("INSTAGRAM_MUSIC_PATH", "").strip()
    if explicit:
        candidate = Path(explicit)
        if candidate.is_file() and candidate.suffix.lower() in SUPPORTED_MUSIC:
            return candidate
        raise RuntimeError("INSTAGRAM_MUSIC_PATH does not point to a supported local audio file.")
    if not MUSIC_DIR.exists():
        return None
    tracks = sorted(
        path for path in MUSIC_DIR.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_MUSIC
    )
    return random.choice(tracks) if tracks else None


def mix_instagram_audio(source: Path, output: Path) -> Path:
    """Mix a supplied local music track under narration for Instagram only.

    This preserves the source file for YouTube. It does not attach a track from
    Instagram's native music library; the supplied file must already be licensed
    for the intended use.
    """
    music = instagram_music_track()
    if not music:
        if source != output:
            shutil.copy2(source, output)
        return output

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("FFmpeg is required to mix Instagram background music.")

    output.parent.mkdir(parents=True, exist_ok=True)
    start = max(0.0, float(os.environ.get("INSTAGRAM_MUSIC_START_SECONDS", "0") or 0))
    music_lufs = float(os.environ.get("INSTAGRAM_MUSIC_LUFS", "-30") or -30)
    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source)]
    if start:
        command += ["-ss", f"{start:.3f}"]
    command += [
        "-stream_loop", "-1", "-i", str(music),
        "-filter_complex",
        f"[0:a]loudnorm=I=-16:TP=-1.5:LRA=11[voice];"
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
