import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = 3000;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

http.createServer((req, res) => {
  // Solo la ruta: sin esto, "/assets/x.js?v=1" no se encuentra y caería en index.html.
  let ruta = '/';
  try { ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { /* ruta inválida: va a index */ }
  let filePath = path.join(distDir, ruta === '/' ? 'index.html' : ruta);

  if (!path.resolve(filePath).startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT' || err.code === 'EISDIR') {
        // Un archivo que falta (JS, CSS, imagen) es un 404 de verdad. Si se respondiera con index.html,
        // el navegador guardaría HTML como si fuera el código de la app y quedaría la pantalla en blanco.
        if (ext && ext !== '.html') {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end('Not found');
          return;
        }
        filePath = path.join(distDir, 'index.html');
        fs.readFile(filePath, (indexErr, indexContent) => {
          if (indexErr) {
            res.writeHead(500);
            res.end('Server Error');
          } else {
            res.writeHead(200, { 'Content-Type': mimeTypes['.html'], 'Cache-Control': 'no-cache' });
            res.end(indexContent);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      // El HTML, el service worker y el manifest se revalidan siempre; el resto lo decide nginx.
      const fijo = /\.(html|webmanifest)$/.test(filePath) || /(^|\/)(sw|registerSW)\.js$/.test(filePath);
      res.writeHead(200, fijo ? { 'Content-Type': contentType, 'Cache-Control': 'no-cache' } : { 'Content-Type': contentType });
      res.end(content);
    }
  });
}).listen(port, () => console.log(`✅ Server running at http://localhost:${port}`));
