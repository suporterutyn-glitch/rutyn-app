# -*- coding: utf-8 -*-
"""Plantillas de correo de Supabase en pt/es/en según user_metadata.language."""
import json
L = '{{ $l := printf "%v" .Data.language }}'

def tri(pt, es, en):
    return L + '{{ if eq $l "es" }}' + es + '{{ else if eq $l "en" }}' + en + '{{ else }}' + pt + '{{ end }}'

def cuerpo(titulo, texto, boton, url, nota):
    b = ('<p style="margin:28px 0"><a href="%s" style="background:#7CB342;color:#ffffff;text-decoration:none;'
         'font-weight:bold;padding:14px 28px;border-radius:999px;display:inline-block">%s</a></p>' % (url, boton)) if boton else ''
    return ('<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1E1E1E">'
            '<div style="font-size:24px;font-weight:900;color:#7CB342;margin-bottom:24px">Rutyn</div>'
            '<h2 style="font-size:20px;margin:0 0 12px">%s</h2><p style="font-size:15px;line-height:1.5;margin:0">%s</p>%s'
            '<p style="font-size:12px;color:#888;line-height:1.5">%s</p></div>') % (titulo, texto, b, nota)

U = '{{ .ConfirmationURL }}'
T = {
 'recovery': (
   ('Redefinir sua senha', 'Recuperar tu contraseña', 'Reset your password'),
   [cuerpo('Redefinir sua senha', 'Recebemos um pedido para redefinir a senha da sua conta Rutyn. Toque no botão para escolher uma nova.', 'Redefinir senha', U, 'Se não foi você, ignore este e-mail: sua senha continua a mesma.'),
    cuerpo('Recuperar tu contraseña', 'Recibimos un pedido para restablecer la contraseña de tu cuenta Rutyn. Tocá el botón para elegir una nueva.', 'Restablecer contraseña', U, 'Si no fuiste vos, ignorá este correo: tu contraseña sigue igual.'),
    cuerpo('Reset your password', 'We received a request to reset the password of your Rutyn account. Tap the button to choose a new one.', 'Reset password', U, "If this wasn't you, ignore this email: your password stays the same.")]),
 'confirmation': (
   ('Confirme seu e-mail', 'Confirmá tu correo', 'Confirm your email'),
   [cuerpo('Confirme seu e-mail', 'Falta pouco para usar o Rutyn. Toque no botão para confirmar seu e-mail.', 'Confirmar e-mail', U, 'Se você não criou uma conta no Rutyn, ignore este e-mail.'),
    cuerpo('Confirmá tu correo', 'Falta poco para usar Rutyn. Tocá el botón para confirmar tu correo.', 'Confirmar correo', U, 'Si no creaste una cuenta en Rutyn, ignorá este correo.'),
    cuerpo('Confirm your email', "You're almost ready to use Rutyn. Tap the button to confirm your email.", 'Confirm email', U, "If you didn't create a Rutyn account, ignore this email.")]),
 'invite': (
   ('Você foi convidado para o Rutyn', 'Te invitaron a Rutyn', "You've been invited to Rutyn"),
   [cuerpo('Você foi convidado para o Rutyn', 'Seu professor criou uma conta para você no Rutyn. Toque no botão para aceitar e definir sua senha.', 'Aceitar convite', U, 'Se você não esperava este convite, ignore este e-mail.'),
    cuerpo('Te invitaron a Rutyn', 'Tu profesor te creó una cuenta en Rutyn. Tocá el botón para aceptar y definir tu contraseña.', 'Aceptar invitación', U, 'Si no esperabas esta invitación, ignorá este correo.'),
    cuerpo("You've been invited to Rutyn", 'Your trainer created a Rutyn account for you. Tap the button to accept and set your password.', 'Accept invite', U, "If you weren't expecting this invite, ignore this email.")]),
 'magic_link': (
   ('Seu link para entrar no Rutyn', 'Tu enlace para entrar a Rutyn', 'Your Rutyn sign-in link'),
   [cuerpo('Seu link para entrar', 'Toque no botão para entrar no Rutyn. O link vale por pouco tempo e só pode ser usado uma vez.', 'Entrar', U, 'Se não foi você, ignore este e-mail.'),
    cuerpo('Tu enlace para entrar', 'Tocá el botón para entrar a Rutyn. El enlace vence pronto y se puede usar una sola vez.', 'Entrar', U, 'Si no fuiste vos, ignorá este correo.'),
    cuerpo('Your sign-in link', 'Tap the button to sign in to Rutyn. The link expires soon and works only once.', 'Sign in', U, "If this wasn't you, ignore this email.")]),
 'email_change': (
   ('Confirme seu novo e-mail', 'Confirmá tu nuevo correo', 'Confirm your new email'),
   [cuerpo('Confirme seu novo e-mail', 'Toque no botão para confirmar {{ .NewEmail }} como o novo e-mail da sua conta Rutyn.', 'Confirmar novo e-mail', U, 'Se você não pediu essa troca, ignore este e-mail.'),
    cuerpo('Confirmá tu nuevo correo', 'Tocá el botón para confirmar {{ .NewEmail }} como el nuevo correo de tu cuenta Rutyn.', 'Confirmar nuevo correo', U, 'Si no pediste este cambio, ignorá este correo.'),
    cuerpo('Confirm your new email', 'Tap the button to confirm {{ .NewEmail }} as the new email of your Rutyn account.', 'Confirm new email', U, "If you didn't request this change, ignore this email.")]),
 'reauthentication': (
   ('{{ .Token }} é seu código de verificação', '{{ .Token }} es tu código de verificación', '{{ .Token }} is your verification code'),
   [cuerpo('Seu código de verificação', 'Use este código para confirmar sua identidade: <strong style="font-size:22px;letter-spacing:4px">{{ .Token }}</strong>', None, None, 'O código vale por pouco tempo.'),
    cuerpo('Tu código de verificación', 'Usá este código para confirmar tu identidad: <strong style="font-size:22px;letter-spacing:4px">{{ .Token }}</strong>', None, None, 'El código vence pronto.'),
    cuerpo('Your verification code', 'Use this code to confirm your identity: <strong style="font-size:22px;letter-spacing:4px">{{ .Token }}</strong>', None, None, 'The code expires soon.')]),
}
cfg = {}
for k, (asunto, cuerpos) in T.items():
    cfg['mailer_subjects_' + k] = tri(*asunto)
    cfg['mailer_templates_' + k + '_content'] = tri(*cuerpos)
json.dump(cfg, open(__file__.replace('generar.py', 'plantillas.json'), 'w'), ensure_ascii=False, indent=1)
# chequeo de balance de llaves
for k, v in cfg.items():
    assert v.count('{{') == v.count('}}'), k
    assert v.count('{{ if') == v.count('{{ end }}'), k
print('ok', len(cfg))
