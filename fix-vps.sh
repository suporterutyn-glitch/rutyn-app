#!/bin/bash
set -e
APP=/var/www/rutyn/app
cd "$APP"

echo "=== 1. Sincronizando codigo desde GitHub ==="
git reset --hard HEAD
git pull origin main
grep -n "base:" vite.config.ts || echo "  ADVERTENCIA: sin base en vite.config.ts"

echo "=== 2. Reconstruyendo dist con base /app/ ==="
[ -d node_modules ] || npm install
npm run build

echo "=== 3. Rutas generadas en dist/index.html ==="
grep -o 'src="[^"]*"' dist/index.html | head -5

echo "=== 4. Reescribiendo nginx ==="
cat > /etc/nginx/sites-available/rutyn.com.br <<'NGINXCONF'
upstream rutynapp {
    server 127.0.0.1:3000;
}

server {
    listen 8080;
    server_name rutyn.com.br www.rutyn.com.br;
    root /var/www/rutyn;

    location /.well-known/acme-challenge/ {
        root /var/www/rutyn;
    }

    location = /app {
        return 301 /app/;
    }

    location /app/ {
        proxy_pass http://rutynapp/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        alias /var/www/rutyn/landing/;
        try_files $uri $uri/ /index.html;
    }
}
NGINXCONF

nginx -t
systemctl reload nginx

echo "=== 5. Reiniciando servidor Node ==="
pkill -f 'node server' 2>/dev/null || true
rm -f "$APP/server.cjs"
sleep 1
cd "$APP"
setsid nohup node server.js > /tmp/rutyn-server.log 2>&1 < /dev/null &
sleep 3

echo "=== 6. VERIFICACION ==="
JS=$(basename "$(ls dist/assets/*.js | head -1)")
echo "-- Node directo --"
curl -s -I "http://127.0.0.1:3000/assets/$JS" | grep -i -E "HTTP/|content-type"
echo "-- Via nginx /app/ --"
curl -s -I "http://127.0.0.1:8080/app/assets/$JS" | grep -i -E "HTTP/|content-type"
echo "-- HTML servido en /app/ --"
curl -s "http://127.0.0.1:8080/app/" | grep -o '<title>[^<]*</title>'
curl -s "http://127.0.0.1:8080/app/" | grep -o 'src="[^"]*"' | head -3
echo ""
echo "LISTO -> http://179.197.67.10:8080/app/"
