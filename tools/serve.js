#!/usr/bin/env node
/* Dependency-free static preview server:  node tools/serve.js [port]
   Serves the repo the way the host does: "/" -> index.html, missing paths -> 404.html. */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2] || 8901);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8", ".json": "application/json",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon",
  ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2"
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  let rel = url === "/" ? "index.html" : url.replace(/^\/+/, "");
  let file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end("forbidden"); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  /* clean-URL fallback, mirroring the .htaccess rule */
  if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file = file + ".html";
  if (!fs.existsSync(file)) {
    const notFound = path.join(ROOT, "404.html");
    const body = fs.existsSync(notFound) ? fs.readFileSync(notFound) : "404";
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" }).end(body);
    return;
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log("http://127.0.0.1:" + PORT));
