#!/usr/bin/env python3
"""Rasterize a smooth fixed-width ASCII font atlas for SDL on PS4."""
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

font_path, output_path = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
cell_w, cell_h, columns = 64, 80, 16
font = ImageFont.truetype(str(font_path), 56)
atlas = Image.new("RGB", (cell_w * columns, cell_h * 6), (0, 0, 0))
draw = ImageDraw.Draw(atlas)
for code in range(32, 127):
    index = code - 32
    if hasattr(font, "getbbox"):
        bbox = font.getbbox(chr(code))
        width, height = bbox[2] - bbox[0], bbox[3] - bbox[1]
    else:
        width, height = font.getsize(chr(code))
    x = (index % columns) * cell_w + (cell_w - min(width, cell_w)) // 2
    y = (index // columns) * cell_h + max(0, (cell_h - height) // 2 - 3)
    draw.text((x, y), chr(code), font=font, fill=(255, 255, 255))
output_path.parent.mkdir(parents=True, exist_ok=True)
atlas.save(output_path, format="BMP")

