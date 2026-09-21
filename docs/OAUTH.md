# OAuth Google e Apple para o Rutyn

Passo-a-passo para habilitar login com Google e Apple no Supabase Auth.

---

## 1. Google

### 1.1 — Criar projeto no Google Cloud Console

1. Abra https://console.cloud.google.com/
2. Topo esquerdo: **Select a project → New Project**
3. Nome: `Rutyn`. Sem organização. **Create**.

### 1.2 — Configurar tela de consentimento OAuth

1. Menu → **APIs & Services → OAuth consent screen**
2. User Type: **External** → Create.
3. Preencha:
   - App name: `Rutyn`
   - User support email: seu e-mail
   - App logo: (opcional) o logo do Rutyn
   - Application home page: `https://rutyn.app` (ou seu domínio)
   - Application privacy policy: `https://rutyn.app/privacidade`
   - Application terms of service: `https://rutyn.app/termos`
   - Authorized domains: adicione `supabase.co` (obrigatório) e seu domínio de produção quando tiver
   - Developer contact info: seu e-mail
4. **Save and Continue**.
5. **Scopes**: deixe apenas os padrões (`openid`, `email`, `profile`). Save and Continue.
6. **Test users**: adicione seu próprio e-mail enquanto o app estiver em modo Testing. Save.
7. Volte ao OAuth consent screen e clique **Publish app** quando quiser sair de teste.

### 1.3 — Criar OAuth client ID

1. Menu → **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Name: `Rutyn Web`
4. **Authorized JavaScript origins**: adicione
   - `http://localhost:5173`
   - Seu domínio de produção (`https://rutyn.app` ou o que for)
5. **Authorized redirect URIs**: **copie do Supabase** — vá em Supabase → Authentication → Providers → Google → **Callback URL** (fica algo tipo `https://nkmfabceawstzndrxdwj.supabase.co/auth/v1/callback`).
6. **Create**. Copie o **Client ID** e o **Client Secret**.

### 1.4 — Configurar no Supabase

1. Supabase Dashboard → **Authentication → Providers → Google**
2. Toggle **Enable Sign in with Google** ✅
3. Cole:
   - **Client ID (for OAuth)**: o Client ID de cima
   - **Client Secret (for OAuth)**: o Secret de cima
4. Deixe **Skip nonce checks** desligado.
5. **Save**.

Pronto. O botão "Continuar com Google" no Login (`src/pages/Login.tsx`) já chama:
```ts
supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
```
funciona sem mudança no código.

---

## 2. Apple

Requer conta Apple Developer paga ($99/ano). Só faça se planeja publicar iOS.

### 2.1 — Criar App ID

1. Login em https://developer.apple.com/account/
2. **Certificates, IDs & Profiles → Identifiers → +**
3. Selecione **App IDs**, Continue.
4. Type: **App**, Continue.
5. Description: `Rutyn`. Bundle ID: `app.rutyn.web` (Explicit).
6. Marque **Sign In with Apple**. Continue → Register.

### 2.2 — Criar Services ID (para web)

1. Identifiers → +, escolha **Services IDs**.
2. Description: `Rutyn Web`. Identifier: `app.rutyn.web.signin` (guarde, é o "client_id").
3. Marque **Sign In with Apple** → **Configure**.
4. Primary App ID: escolha o App ID criado acima.
5. **Domains and Subdomains**: `nkmfabceawstzndrxdwj.supabase.co` (o host do seu projeto Supabase).
6. **Return URLs**: cole a Callback URL do Supabase (`https://nkmfabceawstzndrxdwj.supabase.co/auth/v1/callback`).
7. Save → Continue → Register.

### 2.3 — Criar Key para Sign In with Apple

1. Keys → + → Key Name: `Rutyn Apple Sign In`.
2. Marque **Sign In with Apple → Configure**, escolha o App ID e Save.
3. Continue → Register → **Download** o arquivo `.p8` (guarde bem, não dá pra baixar de novo).
4. Anote o **Key ID** (aparece na tela) e seu **Team ID** (topo direito da conta Apple Developer).

### 2.4 — Gerar client secret JWT

Apple exige um JWT assinado (válido por até 6 meses). Gere com este Node script:

```js
// apple-secret.mjs
import jwt from 'jsonwebtoken'
import fs from 'node:fs'

const privateKey = fs.readFileSync('AuthKey_ABC123XYZ.p8', 'utf8')
const token = jwt.sign({}, privateKey, {
  algorithm: 'ES256',
  expiresIn: '180d',
  issuer: '<TEAM_ID>',
  audience: 'https://appleid.apple.com',
  subject: '<SERVICE_ID>',    // app.rutyn.web.signin
  keyid: '<KEY_ID>',
})
console.log(token)
```
```bash
npm i jsonwebtoken
node apple-secret.mjs
```

### 2.5 — Configurar no Supabase

1. Supabase → **Authentication → Providers → Apple**
2. Toggle enable ✅
3. Cole:
   - **Client ID**: o Service ID (`app.rutyn.web.signin`)
   - **Secret Key**: o JWT gerado
4. Save.

O botão "Continuar com Apple" no Login já chama `signInWithOAuth({ provider: 'apple' })`, funciona sem mudança.

⚠️ Precisa regenerar o JWT a cada 6 meses. Automatize com cron ou marque no calendário.

---

## 3. Testando

1. Rode `npm run dev`
2. Abra `http://localhost:5173/login`
3. Clique em "Continuar com Google"
4. Autorize
5. Deve voltar para `/` com sessão criada

Se der erro:
- `redirect_uri_mismatch` — a Callback URL do Supabase não bate com a Redirect URI cadastrada no Google
- `403 access_denied` (Google) — em modo Testing, o e-mail não está na lista de Test users
- Apple: `invalid_client` — Service ID errado ou JWT expirado

---

## 4. Após o primeiro login social

Se o usuário logou com Google/Apple **sem passar pelo cadastro do Rutyn**, o trigger `handle_new_user` cria a fila em `profiles` com role default = **`student`** (porque `raw_user_meta_data.role` não vem preenchido).

Isso funciona pro fluxo "Sou Aluno" mas quebra o fluxo "Sou Professor". Para produção, adicione uma tela intermediária "Complete seu cadastro" que:
- Detecta que o profile tem `role='student'` mas o usuário quis ser professor (persistir escolha em `localStorage` antes do redirect OAuth)
- Chama `UPDATE profiles SET role='teacher'` **antes** de qualquer criação de student_routines/etc.

Ou mais simples: dois botões separados de OAuth ("Entrar como Professor com Google" / "Entrar como Aluno com Google") que passam a role via `queryParams` do `signInWithOAuth`:

```ts
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: window.location.origin,
    queryParams: { role: 'teacher' }, // não é padrão OAuth, mas você lê depois
  },
})
```

E ajustar o trigger `handle_new_user` pra ler a role de `raw_app_meta_data` ou de outra fonte.
