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

echo "=== 4. Reescribiendo nginx (80 + 443 + 8080) ==="
# Las locations viven en un snippet para no duplicarlas en cada server block.
mkdir -p /etc/nginx/snippets
cat > /etc/nginx/snippets/rutyn-locations.conf <<'SNIPPET'
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
SNIPPET

CONF=/etc/nginx/sites-available/rutyn.com.br
CERT=/etc/letsencrypt/live/rutyn.com.br/fullchain.pem

cat > "$CONF" <<'NGINXUP'
upstream rutynapp {
    server 127.0.0.1:3000;
}
NGINXUP

if [ -f "$CERT" ]; then
  echo "  certificado encontrado -> HTTPS en 443, 80 redirige"
  cat >> "$CONF" <<'NGINXSSL'

server {
    listen 80;
    listen [::]:80;
    server_name rutyn.com.br www.rutyn.com.br;
    root /var/www/rutyn;

    location /.well-known/acme-challenge/ {
        root /var/www/rutyn;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name rutyn.com.br www.rutyn.com.br;
    root /var/www/rutyn;

    ssl_certificate /etc/letsencrypt/live/rutyn.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rutyn.com.br/privkey.pem;

    include /etc/nginx/snippets/rutyn-locations.conf;
}

server {
    listen 8080;
    server_name _;
    root /var/www/rutyn;
    include /etc/nginx/snippets/rutyn-locations.conf;
}
NGINXSSL
else
  echo "  sin certificado -> HTTP en 80 y 8080"
  cat >> "$CONF" <<'NGINXPLAIN'

server {
    listen 80;
    listen [::]:80;
    listen 8080;
    server_name _;
    root /var/www/rutyn;
    include /etc/nginx/snippets/rutyn-locations.conf;
}
NGINXPLAIN
fi

ln -sf "$CONF" /etc/nginx/sites-enabled/rutyn.com.br

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  echo "  ufw: 80 y 443 liberados"
fi

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
echo "-- Via nginx /app/ (8080) --"
curl -s -I "http://127.0.0.1:8080/app/assets/$JS" | grep -i -E "HTTP/|content-type"
echo "-- Via nginx /app/ (80) --"
curl -s -I -H 'Host: rutyn.com.br' "http://127.0.0.1:80/app/" | grep -i -E "HTTP/|content-type"
echo "-- Landing en / (80) --"
curl -s -H 'Host: rutyn.com.br' "http://127.0.0.1:80/" | grep -o '<title>[^<]*</title>'
echo "-- HTML servido en /app/ --"
curl -s "http://127.0.0.1:8080/app/" | grep -o '<title>[^<]*</title>'
curl -s "http://127.0.0.1:8080/app/" | grep -o 'src="[^"]*"' | head -3

echo "-- Puertos escuchando --"
ss -lntp 2>/dev/null | grep -E ':(80|443|3000|8080)\b' || netstat -lntp 2>/dev/null | grep -E ':(80|443|3000|8080)\b'
echo "-- Firewall --"
ufw status 2>/dev/null | head -8 || echo "  ufw no instalado"
iptables -S INPUT 2>/dev/null | grep -E "DROP|REJECT" | head -5 || true
echo ""
echo "LISTO -> http://rutyn.com.br/app/"
