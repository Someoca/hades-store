#!/usr/bin/env python3
"""Create a minimal GP4 project using the official OpenOrbis SDL sample layout."""
import pathlib
import sys
import xml.etree.ElementTree as ET

template, output, content_id = sys.argv[1:]
tree = ET.parse(template)
root = tree.getroot()
package = root.find("./volume/package")
if package is None:
    raise SystemExit("OpenOrbis sample GP4 has no package metadata")
package.set("content_id", content_id)
files = root.find("./files")
if files is None:
    raise SystemExit("OpenOrbis sample GP4 has no files section")
for child in list(files):
    files.remove(child)
for target, source in [
    ("sce_sys/icon0.png", "sce_sys/icon0.png"),
    ("sce_sys/param.sfo", "sce_sys/param.sfo"),
    ("eboot.bin", "../eboot.bin"),
    ("sce_sys/about/right.sprx", "sce_sys/about/right.sprx"),
    ("sce_module/libc.prx", "sce_module/libc.prx"),
    ("sce_module/libSceFios2.prx", "sce_module/libSceFios2.prx"),
]:
    ET.SubElement(files, "file", {"targ_path": target, "orig_path": source})
pathlib.Path(output).parent.mkdir(parents=True, exist_ok=True)
tree.write(output, encoding="utf-8", xml_declaration=True)

