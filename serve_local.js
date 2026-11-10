"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = __dirname;
const args = process.argv.slice(2);

function option(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Informe um valor para ${name}.`);
  return value;
}

let host;
let port;
try {
  host = option("--host", "127.0.0.1");
  const rawPort = option("--port", "8000");
  port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Porta inválida: "${rawPort}". Use um número inteiro entre 1 e 65535.`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".ico", "image/x-icon"],
  [".woff2", "font/woff2"]
]);

const rootRoutes = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/app.js", "app.js"],
  ["/style.css", "style.css"],
  ["/sw.js", "sw.js"]
]);
const publicPrefixes = ["assets/", "catalog/"];

function resolveRoute(route) {
  const rootFile = rootRoutes.get(route);
  if (rootFile) return rootFile;

  const relative = route.replace(/^\/+/, "");
  if (!relative || relative.includes("\0")) return null;
  if (!publicPrefixes.some((prefix) => relative.startsWith(prefix))) return null;
  if (!contentTypes.has(path.extname(relative).toLowerCase())) return null;
  if (relative.split("/").some((segment) => segment === "." || segment === ".." || segment.startsWith("."))) return null;

  const absolute = path.resolve(root, relative);
  if (absolute !== root && !absolute.startsWith(root + path.sep)) return null;
  return relative;
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
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

  const relative = resolveRoute(route);
  if (!relative) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const filePath = path.join(root, relative);
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes.get(path.extname(relative).toLowerCase()),
      "Content-Length": stat.size,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") response.end();
    else fs.createReadStream(filePath).pipe(response);
  });
});

server.on("error", (error) => {
  console.error(`Não foi possível iniciar o servidor local em ${host}:${port}. ${error.message}`);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`HADES Store local host running at http://${host}:${port}/`);
});
