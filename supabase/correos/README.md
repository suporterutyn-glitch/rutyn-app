# Correos de Supabase en pt/es/en

`generar.py` arma `plantillas.json`: asunto y cuerpo de cada correo de auth
(recuperar contraseña, confirmar correo, invitación, enlace mágico, cambio de
correo, código). El idioma sale de `user_metadata.language` (pt si falta).

Supabase no deja cambiar plantillas en el plan free con su servidor de correo:
hace falta SMTP propio. Una vez configurado, se aplica con:

    curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      https://api.supabase.com/v1/projects/nkmfabceawstzndrxdwj/config/auth -d @plantillas.json

Después de aplicarlo, probar un "esqueci a senha" en cada idioma.
