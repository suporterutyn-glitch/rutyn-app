const http = require('http');
const fs = require('fs');
const path = require('path');

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
