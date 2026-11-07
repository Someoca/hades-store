#!/usr/bin/env python3
"""Generate the compact native catalog from the web catalog."""
import json
import pathlib
import sys
import unicodedata

source = pathlib.Path(sys.argv[1])
output = pathlib.Path(sys.argv[2])
items = json.loads(source.read_text(encoding="utf-8-sig"))

def ascii_text(value):
    return unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")

def cpp(value):
    return json.dumps(ascii_text(value), ensure_ascii=True)

rows = []
for index, item in enumerate(items):
    category = item.get("category", "")
    if category == "Jogos":
        url = item.get("storeProductUrl") or item.get("downloadUrl", "")
    else:
        url = item.get("downloadUrl", "")
    image_path = "/app0/sce_sys/covers/%s.png" % ascii_text(item.get("id") or "item-%03d" % index)
    rows.append("    {%s, %s, %s, %s, %s}," % (
        cpp(item.get("name")), cpp(category), cpp(item.get("description")), cpp(url), cpp(image_path)
    ))

output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(
    "// Generated from catalog/catalog.json. Do not edit by hand.\n"
    "struct StoreItem { const char* name; const char* category; const char* description; const char* url; const char* imagePath; };\n"
    "static const StoreItem STORE_ITEMS[] = {\n" + "\n".join(rows) + "\n};\n"
    "static const int STORE_ITEM_COUNT = sizeof(STORE_ITEMS) / sizeof(STORE_ITEMS[0]);\n",
    encoding="utf-8",
)


