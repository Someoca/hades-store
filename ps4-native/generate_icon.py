#!/usr/bin/env python3
"""Create a small HADES Store PKG icon using only Python's standard library."""
import math
import pathlib
import struct
import sys
import zlib

size = 512
rows = []
for y in range(size):
    row = bytearray([0])
    for x in range(size):
        dx, dy = x - 255, y - 235
        glow = max(0.0, 1.0 - math.sqrt(dx * dx + dy * dy) / 370.0)
        r = int(9 + 28 * glow)
        g = int(11 + 12 * glow)
        b = int(18 + 42 * glow)
        # A bold, centered H mark with cyan and infernal orange edges.
        if 142 <= x < 205 and 130 <= y < 348:
            r, g, b = 238, 93, 67
        if 307 <= x < 370 and 130 <= y < 348:
            r, g, b = 97, 222, 235
        if 190 <= x < 322 and 217 <= y < 273:
            r, g, b = 246, 241, 249
        # Subtle luminous bands around the monogram.
        if 116 <= x < 396 and 108 <= y < 370 and (x in range(116, 124) or x in range(388, 396) or y in range(108, 116) or y in range(362, 370)):
            r, g, b = 76, 54, 65
        row.extend((r, g, b))
    rows.append(bytes(row))

def chunk(kind, data):
    payload = kind + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xffffffff)

png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">2I5B", size, size, 8, 2, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(b"".join(rows), 9))
png += chunk(b"IEND", b"")
pathlib.Path(sys.argv[1]).parent.mkdir(parents=True, exist_ok=True)
pathlib.Path(sys.argv[1]).write_bytes(png)

