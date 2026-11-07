#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NATIVE="$ROOT/ps4-native"
BUILD="$NATIVE/build"
OUT="$NATIVE/dist"
CONTENT_ID="IV0000-HADS00001_00-HADESSTORE000001"
SDK_ARCHIVE="${TMPDIR:-/tmp}/hades-openorbis-v0.5.1.tar.gz"
SDK_URL="https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain/releases/download/v0.5.1/v0.5.1.tar.gz"

: "${OO_PS4_TOOLCHAIN:?Run inside an OpenOrbis toolchain environment}"
command -v clang++ >/dev/null
command -v make >/dev/null
command -v python3 >/dev/null
command -v curl >/dev/null

rm -rf "$BUILD"
mkdir -p "$BUILD/build" "$BUILD/pkg/sce_sys/about" "$BUILD/pkg/sce_module" "$OUT"
curl -fL --retry 3 --retry-delay 2 "$SDK_URL" -o "$SDK_ARCHIVE"
tar -xzf "$SDK_ARCHIVE" -C "$BUILD" \
  samples/SDL2/Makefile \
  samples/SDL2/pkg/pkg.gp4 \
  bin/data/param.sfo \
  bin/data/modules/libc.prx \
  bin/data/modules/libSceFios2.prx \
  bin/data/right.sprx
mv "$BUILD/samples/SDL2/Makefile" "$BUILD/Makefile"
cp "$BUILD/bin/data/modules/libc.prx" "$BUILD/pkg/sce_module/libc.prx"
cp "$BUILD/bin/data/modules/libSceFios2.prx" "$BUILD/pkg/sce_module/libSceFios2.prx"
cp "$BUILD/bin/data/right.sprx" "$BUILD/pkg/sce_sys/about/right.sprx"
cp "$BUILD/bin/data/param.sfo" "$BUILD/pkg/sce_sys/param.sfo"
cp "$NATIVE/src/main.cpp" "$BUILD/build/main.cpp"
python3 "$NATIVE/generate_catalog.py" "$ROOT/catalog/catalog.json" "$BUILD/build/generated_catalog.h"
python3 "$NATIVE/generate_icon.py" "$BUILD/pkg/sce_sys/icon0.png"
python3 "$NATIVE/generate_gp4.py" "$BUILD/samples/SDL2/pkg/pkg.gp4" "$BUILD/pkg/pkg.gp4" "$CONTENT_ID"

sed -i 's|^LIBS        := .*|LIBS        := -lc -lkernel -lc++ -lSceUserService -lSceVideoOut -lSceAudioOut -lScePad -lSceSysmodule -lSceSystemService -lSceFreeType -lSDL2 -lSDL2_image|' "$BUILD/Makefile"
make -C "$BUILD" clean
make -C "$BUILD" -j2

PKGTOOL="$OO_PS4_TOOLCHAIN/bin/linux/PkgTool.Core"
"$PKGTOOL" sfo_setentry "$BUILD/pkg/sce_sys/param.sfo" APP_TYPE --type Integer --maxsize 4 --value 1
"$PKGTOOL" sfo_setentry "$BUILD/pkg/sce_sys/param.sfo" APP_VER --type Utf8 --maxsize 8 --value '1.00'
"$PKGTOOL" sfo_setentry "$BUILD/pkg/sce_sys/param.sfo" ATTRIBUTE --type Integer --maxsize 4 --value 0
"$PKGTOOL" sfo_setentry "$BUILD/pkg/sce_sys/param.sfo" CATEGORY --type Utf8 --maxsize 4 --value 'gd'
"$PKGTOOL" sfo_setentry "$BUILD/pkg/sce_sys/param.sfo" CONTENT_ID --type Utf8 --maxsize 48 --value "$CONTENT_ID"
"$PKGTOOL" sfo_setentry "$BUILD/pkg/sce_sys/param.sfo" DOWNLOAD_DATA_SIZE --type Integer --maxsize 4 --value 0
"$PKGTOOL" sfo_setentry "$BUILD/pkg/sce_sys/param.sfo" SYSTEM_VER --type Integer --maxsize 4 --value 0
"$PKGTOOL" sfo_setentry "$BUILD/pkg/sce_sys/param.sfo" TITLE --type Utf8 --maxsize 128 --value 'HADES Store'
"$PKGTOOL" sfo_setentry "$BUILD/pkg/sce_sys/param.sfo" TITLE_ID --type Utf8 --maxsize 12 --value 'HADS00001'
"$PKGTOOL" sfo_setentry "$BUILD/pkg/sce_sys/param.sfo" VERSION --type Utf8 --maxsize 8 --value '1.00'

(cd "$BUILD" && "$PKGTOOL" pkg_build pkg/pkg.gp4 .)
cp "$BUILD/$CONTENT_ID.pkg" "$OUT/HADES-Store-PS4-v1.0.pkg"
sha256sum "$OUT/HADES-Store-PS4-v1.0.pkg" | tee "$OUT/SHA256SUMS.txt"

