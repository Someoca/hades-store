#!/usr/bin/env python3
"""Make the PS4 home-screen icon use the HADES gamer mascot."""
import io
import pathlib
import subprocess
import sys

from PIL import Image, ImageDraw

source, target = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
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

