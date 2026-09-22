#!/bin/bash
set -e
APP=/var/www/rutyn/app
cd "$APP"

echo "=== 1. Sincronizando codigo desde GitHub ==="
git reset --hard HEAD
git pull origin main
grep -n "base:" vite.config.ts || echo "  ADVERTENCIA: sin base en vite.config.ts"

echo "=== 2. Reconstruyendo dist ==="
[ -d node_modules ] || npm install
npm run build

echo "=== 3. Rutas generadas en dist/index.html ==="
grep -o 'src="[^"]*"' dist/index.html | head -5

echo "=== 4. Reescribiendo nginx ==="
# La app vive en app.rutyn.com.br (raiz del subdominio). El apex rutyn.com.br es
# transitorio: sigue sirviendo la landing y redirige /app/ al subdominio, hasta que
# su DNS apunte al hosting compartido. n8n y Evolution viven en twoart-servicios.
mkdir -p /etc/nginx/snippets
rm -f /etc/nginx/snippets/rutyn-locations.conf

cat > /etc/nginx/snippets/rutyn-app.conf <<'SNIPPET'
location / {
    proxy_pass http://rutynapp;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
SNIPPET

CONF=/etc/nginx/sites-available/rutyn.com.br
APP_CERT=/etc/letsencrypt/live/app.rutyn.com.br/fullchain.pem
APEX_CERT=/etc/letsencrypt/live/rutyn.com.br/fullchain.pem

cat > "$CONF" <<'NGINXUP'
upstream rutynapp {
    server 127.0.0.1:3000;
}
NGINXUP

# --- app.rutyn.com.br : la aplicacion ---
if [ -f "$APP_CERT" ]; then
  echo "  app.rutyn.com.br -> HTTPS (443), 80 redirige"
  cat >> "$CONF" <<'APPSSL'

server {
    listen 80;
    listen [::]:80;
    server_name app.rutyn.com.br;
    location /.well-known/acme-challenge/ { root /var/www/rutyn; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.rutyn.com.br;

    ssl_certificate /etc/letsencrypt/live/app.rutyn.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.rutyn.com.br/privkey.pem;

    include /etc/nginx/snippets/rutyn-app.conf;
}
APPSSL
else
  echo "  app.rutyn.com.br -> HTTP (todavia sin certificado)"
  cat >> "$CONF" <<'APPPLAIN'

server {
    listen 80;
    listen [::]:80;
    server_name app.rutyn.com.br;
    location /.well-known/acme-challenge/ { root /var/www/rutyn; }
    include /etc/nginx/snippets/rutyn-app.conf;
}
APPPLAIN
fi

# --- rutyn.com.br : transitorio, se retira cuando el DNS del apex se mude ---
if [ -f "$APEX_CERT" ] && [ -d /var/www/rutyn/landing ]; then
  echo "  rutyn.com.br -> landing + /app/ redirige al subdominio (transitorio)"
  cat >> "$CONF" <<'APEXSSL'

server {
    listen 80;
    listen [::]:80;
    server_name rutyn.com.br www.rutyn.com.br;
    location /.well-known/acme-challenge/ { root /var/www/rutyn; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name rutyn.com.br www.rutyn.com.br;
    root /var/www/rutyn;

    ssl_certificate /etc/letsencrypt/live/rutyn.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rutyn.com.br/privkey.pem;

    location = /app { return 301 https://app.rutyn.com.br/; }
    location /app/  { return 301 https://app.rutyn.com.br/; }

    location / {
        alias /var/www/rutyn/landing/;
        try_files $uri $uri/ /index.html;
    }
}
APEXSSL
else
  echo "  rutyn.com.br -> no se sirve (landing retirada o sin certificado)"
fi

# --- 8080 : acceso directo a la app, sin depender de DNS ni certificado ---
cat >> "$CONF" <<'PORT8080'

server {
    listen 8080 default_server;
    server_name _;
    include /etc/nginx/snippets/rutyn-app.conf;
}
PORT8080

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
echo "-- App via 8080 (acceso directo) --"
curl -s -I "http://127.0.0.1:8080/assets/$JS" | grep -i -E "HTTP/|content-type"
curl -s "http://127.0.0.1:8080/" | grep -o '<title>[^<]*</title>'
curl -s "http://127.0.0.1:8080/" | grep -o 'src="[^"]*"' | head -3
echo "-- app.rutyn.com.br en 80 --"
curl -s -I -H 'Host: app.rutyn.com.br' "http://127.0.0.1:80/" | grep -i -E "HTTP/|location"
echo "-- rutyn.com.br/app/ debe redirigir al subdominio --"
curl -s -I -H 'Host: rutyn.com.br' "http://127.0.0.1:80/app/" | grep -i -E "HTTP/|location"
echo "-- Landing en rutyn.com.br/ --"
curl -s -H 'Host: rutyn.com.br' "http://127.0.0.1:80/" | grep -oE '<title>[^<]*</title>|^HTTP.*'

echo "-- Puertos escuchando --"
ss -lntp 2>/dev/null | grep -E ':(80|443|3000|8080)\b' || netstat -lntp 2>/dev/null | grep -E ':(80|443|3000|8080)\b'
echo "-- Firewall --"
ufw status 2>/dev/null | head -8 || echo "  ufw no instalado"
iptables -S INPUT 2>/dev/null | grep -E "DROP|REJECT" | head -5 || true
echo ""
echo "LISTO -> https://app.rutyn.com.br/"
