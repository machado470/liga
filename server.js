// server.js — servidor estático leve p/ Liga da Firma
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT = process.cwd();
const PUBLIC_DIR = path.resolve(ROOT, 'public');
const SRC_DIR    = path.resolve(ROOT, 'src');
const DATA_DIR   = path.resolve(ROOT, 'data');

// MIME types essenciais
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
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

// Guard anti-path traversal (mais rígido)
function safeJoin(base, target) {
  const p = path.normalize(path.join(base, target));
  const baseNorm = path.resolve(base) + path.sep;
  return p.startsWith(baseNorm) ? p : null;
}

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'Cache-Control': 'no-cache', ...headers });
  if (body instanceof Buffer || typeof body === 'string') return res.end(body);
  return res.end(String(body ?? ''));
}

// Cache: index sem cache; assets com 1h (dev)
function serveFile(res, filePath) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not Found');
    const type = contentType(filePath);
    const isIndex = /[/\\]public[/\\]index\.html$/.test(filePath);
    const cache = isIndex ? 'no-cache' : 'public, max-age=3600';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache });
    fs.createReadStream(filePath).pipe(res);
  });
}

function serveIfExists(res, baseDir, relPath) {
  const fp = safeJoin(baseDir, relPath);
  if (!fp) return send(res, 400, 'Bad Request');
  return serveFile(res, fp);
}

function handler(req, res) {
  try {
    const u = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = decodeURI(u.pathname);

    // Raiz → index.html
    if (pathname === '/' || pathname === '/index.html') {
      return serveFile(res, path.join(PUBLIC_DIR, 'index.html'));
    }

    // Mapear assets públicos
    if (
      pathname.startsWith('/assets/') ||
      pathname === '/manifest.webmanifest' ||
      pathname === '/favicon.ico' ||
      pathname === '/robots.txt'
    ) {
      return serveIfExists(res, PUBLIC_DIR, pathname.replace(/^\//, ''));
    }

    // Expor /public/* (útil no dev)
    if (pathname.startsWith('/public/')) {
      return serveIfExists(res, PUBLIC_DIR, pathname.replace(/^\/public\//, ''));
    }

    // Expor módulos ES do front: /src/*
    if (pathname.startsWith('/src/')) {
      return serveIfExists(res, SRC_DIR, pathname.replace(/^\/src\//, ''));
    }

    // Expor dados JSON: /data/*
    if (pathname.startsWith('/data/')) {
      return serveIfExists(res, DATA_DIR, pathname.replace(/^\/data\//, ''));
    }

    // Tentar arquivo em public/
    {
      const rel = pathname.replace(/^\//, '');
      const fp = safeJoin(PUBLIC_DIR, rel);
      if (fp) {
        return fs.stat(fp, (err, st) => {
          if (!err && st.isFile()) return serveFile(res, fp);
          // Fallback SPA: devolve index.html para rotas do front
          return serveFile(res, path.join(PUBLIC_DIR, 'index.html'));
        });
      }
    }

    return send(res, 404, 'Not Found');
  } catch {
    return send(res, 500, 'Internal Server Error');
  }
}

const server = http.createServer(handler);
server.listen(PORT, () => {
  console.log(`[dev] Liga da Firma em http://localhost:${PORT}`);
});
