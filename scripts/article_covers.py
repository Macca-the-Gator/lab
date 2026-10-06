"""Generate original social and Discover-oriented artwork for Macca Blog."""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / "blog" / "posts.json"
OUT_DIR = ROOT / "blog" / "assets" / "covers"
BACKGROUND_CANDIDATES = (
    ROOT / "images" / "macca-blog-banner.jpg",
    ROOT / "images" / "macca-blog-banner.webp",
)


def font(size: int, bold: bool = False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            pass
    return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt, max_width: int, max_lines: int = 4):
    words = re.sub(r"\s+", " ", text).strip().split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        width = draw.textbbox((0, 0), candidate, font=fnt)[2]
        if current and width > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(" .,:;-") + "…"
    return lines


def base_background(size: tuple[int, int]) -> Image.Image:
    for candidate in BACKGROUND_CANDIDATES:
        if candidate.is_file():
            with Image.open(candidate) as image:
                return ImageOps.fit(
                    image.convert("RGB"),
                    size,
                    method=Image.Resampling.LANCZOS,
                    centering=(0.56, 0.48),
                )
    return Image.new("RGB", size, "#100d1b")


def render_social(post: dict, output: Path):
    base = base_background((1200, 630)).convert("RGBA")
    base = Image.alpha_composite(base, Image.new("RGBA", base.size, (6, 5, 16, 118)))
    draw = ImageDraw.Draw(base, "RGBA")
    draw.rounded_rectangle((54, 248, 1146, 566), radius=34, fill=(13, 9, 28, 224), outline=(255, 104, 173, 195), width=3)
    draw.rounded_rectangle((58, 72, 290, 112), radius=20, fill=(77, 224, 237, 245))
    draw.text((78, 79), "MACCA BLOG", font=font(24, True), fill=(8, 7, 18, 255))
    category = str(post.get("category") or "GTA & ROCKSTAR").upper()[:40]
    draw.text((58, 154), category, font=font(24, True), fill=(77, 224, 237, 255))

    title = str(post.get("title") or "GTA & Rockstar News")
    size = 56
    while size >= 34:
        title_font = font(size, True)
        lines = wrap(draw, title, title_font, 980, 4)
        if len(lines) * int(size * 1.2) <= 245:
            break
        size -= 2
    y = 290
    for line in lines:
        draw.text((86, y), line, font=title_font, fill=(255, 247, 242, 255), stroke_width=1, stroke_fill=(8, 5, 17, 220))
        y += int(size * 1.2)

    draw.text((84, 530), "macca-lab.onrender.com/blog", font=font(22, False), fill=(227, 211, 231, 255))
    output.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(output, "JPEG", quality=91, optimize=True)


def render_discover(post: dict, output: Path):
    """Render a mostly visual 16:9 image suitable for Discover/hero usage."""
    base = base_background((1280, 720)).convert("RGBA")
    # Keep the artwork dominant. Only use a restrained lower-third label.
    overlay = Image.new("RGBA", base.size, (5, 4, 12, 34))
    base = Image.alpha_composite(base, overlay)
    # Keep Discover artwork clean and fully visual. Card metadata is rendered in HTML,
    # so no dark lower-third is baked into the image itself.
    output.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(output, "JPEG", quality=91, optimize=True)


def needs_refresh(output: Path, post: dict) -> bool:
    if not output.is_file():
        return True
    updated = str(post.get("updatedAt") or "").strip()
    if not updated:
        return False
    try:
        updated_at = datetime.fromisoformat(updated.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return False
    return output.stat().st_mtime < updated_at


def main():
    posts = json.loads(POSTS.read_text(encoding="utf-8"))
    changed = False
    for post in posts:
        slug = str(post.get("slug") or "").strip()
        if not slug:
            continue
        social_output = OUT_DIR / f"{slug}.jpg"
        discover_output = OUT_DIR / f"{slug}-discover.jpg"
        if needs_refresh(social_output, post):
            render_social(post, social_output)
            print(f"Generated {social_output.relative_to(ROOT)}")
        if needs_refresh(discover_output, post):
            render_discover(post, discover_output)
            print(f"Generated {discover_output.relative_to(ROOT)}")

        social_path = f"/blog/assets/covers/{slug}.jpg"
        discover_path = f"/blog/assets/covers/{slug}-discover.jpg"
        if post.get("socialImage") != social_path:
            post["socialImage"] = social_path
            changed = True
        if post.get("discoverImage") != discover_path:
            post["discoverImage"] = discover_path
            changed = True

    if changed:
        POSTS.write_text(json.dumps(posts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
