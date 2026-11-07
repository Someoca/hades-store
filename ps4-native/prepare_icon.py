#!/usr/bin/env python3
"""Make the PS4 home-screen icon use the HADES gamer mascot."""
import io
import pathlib
import subprocess
import sys

from PIL import Image, ImageDraw

source, target = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
hero_target = pathlib.Path(sys.argv[3]) if len(sys.argv) > 3 else target.with_name("hades-hero.bmp")
rendered = subprocess.run(
    ["rsvg-convert", "-w", "430", "-h", "488", str(source)],
    check=True,
    stdout=subprocess.PIPE,
).stdout
mascot = Image.open(io.BytesIO(rendered)).convert("RGBA")
size = 512
background = Image.new("RGB", (size, size), (8, 10, 18))
pixels = background.load()
for y in range(size):
    for x in range(size):
        dx, dy = x - 256, y - 255
        glow = max(0.0, 1.0 - ((dx * dx + dy * dy) ** 0.5) / 340.0)
        pixels[x, y] = (int(8 + glow * 43), int(10 + glow * 21), int(18 + glow * 31))
background = background.convert("RGBA")
background.alpha_composite(mascot, ((size - mascot.width) // 2, 12))
draw = ImageDraw.Draw(background)
draw.rectangle((5, 5, size - 6, size - 6), outline=(235, 105, 77, 210), width=5)
target.parent.mkdir(parents=True, exist_ok=True)
background.convert("RGB").save(target, format="PNG", optimize=True)

# Use an uncompressed BMP for the runtime hero so SDL's built-in BMP loader
# can render it on the console without relying on SDL_image's PNG support.
hero_render = subprocess.run(
    ["rsvg-convert", "-w", "720", "-h", "816", str(source)],
    check=True,
    stdout=subprocess.PIPE,
).stdout
hero = Image.open(io.BytesIO(hero_render)).convert("RGBA")
canvas = Image.new("RGB", (720, 816), (8, 9, 14))
canvas.paste(hero, (0, 0), hero)
hero_target.parent.mkdir(parents=True, exist_ok=True)
canvas.save(hero_target, format="BMP")

