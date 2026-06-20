const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const rootDir = __dirname;

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  }[ext] || "application/octet-stream";
}

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.statusCode = status;
  res.setHeader("content-type", contentType);
  res.end(body);
}

function serveStatic(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(rootDir, decodeURIComponent(requested).replace(/^\/+/, "")));
  const rootWithSep = rootDir.endsWith(path.sep) ? rootDir : `${rootDir}${path.sep}`;

  if (!(filePath === rootDir || filePath.startsWith(rootWithSep))) {
    return send(res, 403, "Forbidden");
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    if (url.pathname === "/favicon.ico" || url.pathname === "/favicon.png") {
      return send(res, 204, "");
    }
    return send(res, 404, "Not found");
  }

  res.statusCode = 200;
  res.setHeader("content-type", mimeFor(filePath));
  fs.createReadStream(filePath).pipe(res);
}

async function appHandler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/health") {
    return require("./api/health.js")(req, res);
  }

  if (url.pathname === "/api/app") {
    return require("./api/app.js")(req, res);
  }

  if (url.pathname.startsWith("/api/")) {
    const original = `${url.pathname}${url.search}`;
    req.url = `/api/app?path=${encodeURIComponent(original)}`;
    return require("./api/app.js")(req, res);
  }

  return serveStatic(req, res);
}

module.exports = appHandler;

if (require.main === module) {
  const port = Number(process.env.PORT || 4177);
  http.createServer(appHandler).listen(port, () => {
    console.log(`Teacher evidence app running on http://localhost:${port}`);
  });
}
