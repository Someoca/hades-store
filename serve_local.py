"""Small, LAN-only static host for the HADES Store web interface."""

from __future__ import annotations

import argparse
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
STATIC_FILES = {
    "/": (ROOT / "index.html", "text/html; charset=utf-8"),
    "/index.html": (ROOT / "index.html", "text/html; charset=utf-8"),
    "/app.js": (ROOT / "app.js", "text/javascript; charset=utf-8"),
    "/style.css": (ROOT / "style.css", "text/css; charset=utf-8"),
    "/catalog/catalog.json": (ROOT / "catalog" / "catalog.json", "application/json; charset=utf-8"),
    "/assets/hades-gamer.svg": (ROOT / "assets" / "hades-gamer.svg", "image/svg+xml; charset=utf-8"),
}


class StoreHandler(BaseHTTPRequestHandler):
    server_version = "HADESStoreLocal/1.0"

    def do_GET(self) -> None:
        route = urlsplit(self.path).path
        entry = STATIC_FILES.get(route)
        if entry is None:
            cover_match = re.fullmatch(r"/assets/covers/(ps4-extra-\d{3}\.svg)", route)
            if cover_match:
                entry = (ROOT / "assets" / "covers" / cover_match.group(1), "image/svg+xml; charset=utf-8")
        if entry is None:
            self.send_error(404)
            return

        file_path, content_type = entry
        if not file_path.is_file():
            self.send_error(404)
            return

        payload = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format: str, *args: object) -> None:
        # Keep the console quiet; the launcher redirects errors to a temp log.
        return


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the HADES Store on a local network interface.")
    parser.add_argument("--host", default="127.0.0.1", help="Interface address to bind (default: loopback only).")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), StoreHandler)
    print(f"HADES Store local host running at http://{args.host}:{args.port}/", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()

