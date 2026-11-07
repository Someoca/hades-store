"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = __dirname;
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}
const host = option("--host", "127.0.0.1");
const port = Number(option("--port", "8000"));

const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/catalog/catalog.json", ["catalog/catalog.json", "application/json; charset=utf-8"]],
  ["/assets/hades-gamer.svg", ["assets/hades-gamer.svg", "image/svg+xml; charset=utf-8"]],
]);

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "Allow": "GET, HEAD" });
    response.end();
    return;
  }

  let route;
  try {
    route = decodeURIComponent(new URL(request.url, "http://local").pathname);
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }

  let entry = staticFiles.get(route);
  const cover = /^\/assets\/covers\/(ps4-extra-\d{3}\.svg|emulator-(dolphin|m33)\.svg)$/.exec(route);
  if (!entry && cover) entry = [`assets/covers/${cover[1]}`, "image/svg+xml; charset=utf-8"];
  if (!entry) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const filePath = path.join(root, entry[0]);
  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": entry[1],
      "Content-Length": stat.size,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") response.end();
    else fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(port, host, () => {
  console.log(`HADES Store local host running at http://${host}:${port}/`);
});


