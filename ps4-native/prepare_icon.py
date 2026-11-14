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
target.parent.mkdir(parents=True, exist_ok=True)
if len(sys.argv) > 10:
    app_icon = Image.open(sys.argv[10]).convert("RGBA")
    app_icon.thumbnail((480, 480), Image.LANCZOS)
    background = Image.new("RGBA", (size, size), (8, 10, 18, 255))
    background.alpha_composite(app_icon, ((size - app_icon.width) // 2, (size - app_icon.height) // 2))
    background.convert("RGB").save(target, format="PNG", optimize=True)
else:
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



# Optional PS4 catalog UI artwork (BMP because the SDL runtime uses SDL_LoadBMP).
def render_extra_svg(source_path, target_path, width, height):
    source_path = pathlib.Path(source_path)
    target_path = pathlib.Path(target_path)
    rendered = subprocess.run(
        ["rsvg-convert", "-w", str(width), "-h", str(height), str(source_path)],
        check=True, stdout=subprocess.PIPE,
    ).stdout
    artwork = Image.open(io.BytesIO(rendered)).convert("RGBA")
    canvas = Image.new("RGBA", (width, height), (4, 10, 24, 255))
    canvas.alpha_composite(artwork, ((width - artwork.width) // 2, (height - artwork.height) // 2))
    target_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(target_path, format="BMP")

if len(sys.argv) > 5:
    render_extra_svg(sys.argv[4], sys.argv[5], 512, 512)
if len(sys.argv) > 7:
    render_extra_svg(sys.argv[6], sys.argv[7], 1000, 220)
if len(sys.argv) > 9:
    render_extra_svg(sys.argv[8], sys.argv[9], 192, 192)
