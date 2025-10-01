const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT = process.cwd();
const PUBLIC_DIR = path.resolve(ROOT, 'public');
const SRC_DIR = path.resolve(ROOT, 'src');
const DATA_DIR = path.resolve(ROOT, 'data');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

function safeJoin(base, target) {
  const p = path.normalize(path.join(base, target));
  if (!p.startsWith(base)) return null; // path traversal guard
  return p;
}

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'Cache-Control': 'no-cache', ...headers });
  if (body instanceof Buffer || typeof body === 'string') return res.end(body);
  return res.end(String(body ?? ''));
}

function serveFile(res, filePath) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not Found');
    const type = contentType(filePath);
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
  });
}

function handler(req, res) {
  try {
    const u = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = decodeURI(u.pathname);

    // Root → public/index.html
    if (pathname === '/' || pathname === '/index.html') {
      return serveFile(res, path.join(PUBLIC_DIR, 'index.html'));
    }

    // Allow /public/* direct access (helpful during dev)
    if (pathname.startsWith('/public/')) {
      const rel = pathname.replace(/^\/public\//, '');
      const fp = safeJoin(PUBLIC_DIR, rel);
      if (!fp) return send(res, 400, 'Bad Request');
      return serveFile(res, fp);
    }

    // Map /assets/*, /manifest.webmanifest, /favicon.ico to public
    if (pathname.startsWith('/assets/') || pathname === '/manifest.webmanifest' || pathname === '/favicon.ico' || pathname === '/robots.txt') {
      const rel = pathname.replace(/^\//, '');
      const fp = safeJoin(PUBLIC_DIR, rel);
      if (!fp) return send(res, 400, 'Bad Request');
      return serveFile(res, fp);
    }

    // Map /src/* to src directory (ESM direct in browser)
    if (pathname.startsWith('/src/')) {
      const rel = pathname.replace(/^\/src\//, '');
      const fp = safeJoin(SRC_DIR, rel);
      if (!fp) return send(res, 400, 'Bad Request');
      return serveFile(res, fp);
    }

    // Map /data/* to data directory
    if (pathname.startsWith('/data/')) {
      const rel = pathname.replace(/^\/data\//, '');
      const fp = safeJoin(DATA_DIR, rel);
      if (!fp) return send(res, 400, 'Bad Request');
      return serveFile(res, fp);
    }

    // Fallback: try public/*
    {
      const rel = pathname.replace(/^\//, '');
      const fp = safeJoin(PUBLIC_DIR, rel);
      if (fp) return serveFile(res, fp);
    }

    return send(res, 404, 'Not Found');
  } catch (e) {
    return send(res, 500, 'Internal Server Error');
  }
}

const server = http.createServer(handler);
server.listen(PORT, () => {
  console.log(`[dev] Liga da Firma server listening on http://localhost:${PORT}`);
});
