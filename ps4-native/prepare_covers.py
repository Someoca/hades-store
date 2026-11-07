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
    """A clean branded poster used only when a supplied cover is unavailable."""
    image = Image.new("RGB", (W, H), (13, 16, 27))
    pixels = image.load()
    seed = sum(ord(c) for c in item.get("name", "HADES"))
    accent = (169, 149, 219) if seed % 2 else (226, 189, 118)
    for y in range(H):
        for x in range(W):
            glow = max(0.0, 1.0 - (((x - W / 2) / 290) ** 2 + ((y - 170) / 390) ** 2) ** 0.5)
            pixels[x, y] = tuple(int(13 + (c - 13) * glow * 0.38) for c in accent)
    draw = ImageDraw.Draw(image)
    draw.rectangle((18, 18, W - 18, H - 18), outline=accent, width=3)
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    title_font = ImageFont.truetype(font_path, 27) if pathlib.Path(font_path).exists() else ImageFont.load_default()
    small_font = ImageFont.truetype(font_path, 15) if pathlib.Path(font_path).exists() else ImageFont.load_default()
    name = item.get("name", "HADES STORE")
    words, lines, current = name.split(), [], ""
    for word in words:
        candidate = (current + " " + word).strip()
        if draw.textsize(candidate, font=title_font)[0] > W - 52 and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    y = 205
    for line in lines[:5]:
        width, _ = draw.textsize(line, font=title_font)
        draw.text(((W - width) // 2, y), line, font=title_font, fill=(248, 244, 238))
        y += 38
    draw.text((32, H - 68), "HADES STORE  /  PS4", font=small_font, fill=accent)
    return image


def load_image(item):
    url = item.get("imageUrl", "")
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

