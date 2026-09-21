import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = 3000;

http.createServer((req, res) => {
  let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200);
    res.end(content);
  } catch {
    res.writeHead(200);
    res.end(fs.readFileSync(path.join(distDir, 'index.html')));
  }
}).listen(port, () => console.log(`Server running at http://localhost:${port}`));
