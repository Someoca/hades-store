#!/usr/bin/env python3
"""Prepare sharp, offline BMP covers for the native PS4 catalog."""
import concurrent.futures
import io
import json
import pathlib
import subprocess
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = pathlib.Path(sys.argv[1]).resolve()
CATALOG = pathlib.Path(sys.argv[2])
OUT = pathlib.Path(sys.argv[3])
OUT.mkdir(parents=True, exist_ok=True)
W, H = 256, 384


def fallback(item):
    """Create an individual PS4-style catalog cover when official art is unavailable."""
    name = item.get("name", "HADES STORE")
    platform = item.get("version", "PS4")
    seed = sum((i + 1) * ord(char) for i, char in enumerate(item.get("id", "") + name))
    palettes = [
        ((8, 28, 57), (31, 154, 255)),
        ((25, 13, 49), (177, 112, 255)),
        ((7, 37, 38), (60, 226, 192)),
        ((48, 18, 19), (255, 115, 73)),
        ((15, 24, 47), (236, 190, 92)),
        ((17, 16, 26), (239, 93, 145)),
    ]
    base, accent = palettes[seed % len(palettes)]
    image = Image.new("RGB", (W, H), base)
    pixels = image.load()
    center_x = 50 + seed % 156
    center_y = 95 + seed % 150
    for y in range(H):
        for x in range(W):
            distance = min(1.0, (((x - center_x) / 265) ** 2 + ((y - center_y) / 320) ** 2) ** 0.5)
            glow = (1.0 - distance) * 0.48
            pixels[x, y] = tuple(int(base[i] + (accent[i] - base[i]) * glow) for i in range(3))

    draw = ImageDraw.Draw(image)
    # Distinct geometric key art and lighting, with no repeated generic poster.
    shift = seed % 46
    draw.polygon([(0, 260 + shift), (72, 144), (132, 245), (190, 112 + shift), (W, 258), (W, H), (0, H)], fill=tuple(int(v * 0.66) for v in base))
    draw.polygon([(0, 302), (92, 215 + shift // 2), (154, 286), (219, 188), (W, 294), (W, H), (0, H)], fill=tuple(int(v * 0.82) for v in base))
    draw.ellipse((center_x - 45, center_y - 45, center_x + 45, center_y + 45), fill=accent)
    draw.ellipse((center_x - 34, center_y - 34, center_x + 34, center_y + 34), fill=base)
    draw.line([(0, 176 + shift), (W, 88 + shift)], fill=accent, width=3)
    draw.line([(12, 196 + shift), (W - 12, 109 + shift)], fill=(225, 241, 255), width=1)
    draw.rectangle((0, 244, W, H), fill=(3, 8, 18))
    draw.rectangle((12, 254, W - 12, H - 14), outline=accent, width=2)

    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    title_font = ImageFont.truetype(font_path, 19) if pathlib.Path(font_path).exists() else ImageFont.load_default()
    small_font = ImageFont.truetype(font_path, 11) if pathlib.Path(font_path).exists() else ImageFont.load_default()
    draw.text((22, 267), "HADES STORE  /  " + platform, font=small_font, fill=accent)
    words, lines, current = name.split(), [], ""
    for word in words:
        candidate = (current + " " + word).strip()
        if hasattr(draw, "textbbox"):
            bbox = draw.textbbox((0, 0), candidate, font=title_font)
            text_width = bbox[2] - bbox[0]
        else:
            text_width = draw.textsize(candidate, font=title_font)[0]
        if text_width > W - 44 and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    y = 292
    for line in lines[:3]:
        draw.text((22, y), line, font=title_font, fill=(248, 250, 255), stroke_width=0)
        y += 25
    draw.rectangle((22, H - 38, 62, H - 14), fill=accent)
    draw.text((28, H - 36), platform, font=small_font, fill=(5, 10, 20))
    return image


def load_image(item):
    url = item.get("imageUrl", "")
    # The single legacy SVG is a generic placeholder; generate a per-title cover instead.
    if url.endswith("game-cover.svg"):
        return fallback(item)
    try:
        if url.startswith("http://") or url.startswith("https://"):
            request = urllib.request.Request(url, headers={"User-Agent": "HADES-Store-Catalog/1.0"})
            with urllib.request.urlopen(request, timeout=20) as response:
                data = response.read(12 * 1024 * 1024)
            return Image.open(io.BytesIO(data)).convert("RGB")
        source = (ROOT / url).resolve()
        source.relative_to(ROOT)
        if source.suffix.lower() == ".svg":
            raster = subprocess.run(["rsvg-convert", "-w", "512", "-h", "768", str(source)], check=True, stdout=subprocess.PIPE).stdout
            with Image.open(io.BytesIO(raster)) as im:
                return im.convert("RGBA")
        with Image.open(source) as im:
            return im.convert("RGB")
    except Exception as exc:
        print("Cover fallback: %s (%s)" % (item.get("id", "?"), exc), file=sys.stderr)
        return fallback(item)


def prepare(index_item):
    index, item = index_item
    image = load_image(item)
    # Keep portrait art centered and sharp while standardizing every card.
    resampling = getattr(Image, "Resampling", Image)
    image = ImageOps.fit(image, (W, H), method=resampling.LANCZOS, centering=(0.5, 0.42))
    target = OUT / (item.get("id") or "item-%03d" % index)
    target = target.with_suffix(".bmp")
    image.convert("RGB").save(target, format="BMP")
    return target.stat().st_size


items = json.loads(CATALOG.read_text(encoding="utf-8-sig"))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    sizes = list(pool.map(prepare, enumerate(items)))
print("Prepared %d covers (%d bytes total)" % (len(sizes), sum(sizes)))

