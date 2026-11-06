# HADES Store native source manifest.
# Keep this list synchronized with the Windows/OpenOrbis build script.
# Headers are included by translation units and are not compiled separately.

set(HADES_NATIVE_SOURCES
    src/main.cpp
    src/HadesApp.cpp
    src/Catalog.cpp
    src/Json.cpp
    src/DownloadManager.cpp
    src/CatalogService.cpp
    src/Settings.cpp
)

set(HADES_NATIVE_HEADERS
    src/AppLoop.h
    src/AppView.h
    src/Catalog.h
    src/CatalogService.h
    src/ControllerMapping.h
    src/DownloadManager.h
    src/HadesApp.h
    src/Input.h
    src/Json.h
    src/Platform.h
    src/Settings.h
    src/ViewRenderer.h
    src/UiTheme.h
)
