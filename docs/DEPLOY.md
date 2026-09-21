# Deploy — Edge Functions, Push, Stripe

Guia dos comandos que precisam credenciais suas (não posso rodar autonomamente).

---

## Pré-requisitos

- [Supabase CLI](https://supabase.com/docs/guides/cli): `npx supabase --version` (já testado, v2.117+)
- Conta Supabase logada
- Access token pessoal (gera em https://supabase.com/dashboard/account/tokens)

## 1. Login e link

```bash
cd app
npx supabase login          # abre browser, cola access token
npx supabase link --project-ref nkmfabceawstzndrxdwj
```

## 2. VAPID keys (para Push notifications)

```bash
npx web-push generate-vapid-keys
```
Output:
```
Public Key: BM...longa...
Private Key: xx...secreta...
```
- Cola a **Public** em `app/.env.local`:
  ```
  VITE_VAPID_PUBLIC_KEY=BM...
  ```
- Guarda a **Private** para o próximo passo.

## 3. Segredos das Edge Functions

```bash
# VAPID (send-push)
npx supabase secrets set \
  VAPID_PUBLIC_KEY="BM...publica..." \
  VAPID_PRIVATE_KEY="xx...privada..." \
  VAPID_SUBJECT="mailto:seu@email.com"

# Stripe (stripe-*)
npx supabase secrets set \
  STRIPE_SECRET_KEY="sk_test_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  STRIPE_PRICE_PRO="price_..." \
  STRIPE_PRICE_MASTER="price_..." \
  STRIPE_PRICE_ELITE="price_..."
```

`STRIPE_WEBHOOK_SECRET` você pega DEPOIS de criar o endpoint de webhook no dashboard do Stripe (passo 5).

## 4. Deploy das funções

```bash
npx supabase functions deploy create-student
npx supabase functions deploy charge-cron
npx supabase functions deploy send-push
npx supabase functions deploy stripe-create-checkout
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

⚠️ `stripe-webhook` **precisa** de `--no-verify-jwt` porque o Stripe autentica via header `stripe-signature`, não via JWT do Supabase.

## 5. Configurar webhook no Stripe

1. https://dashboard.stripe.com/webhooks → **Add endpoint**
2. Endpoint URL: `https://nkmfabceawstzndrxdwj.functions.supabase.co/stripe-webhook`
3. Events to listen: selecione:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Add endpoint → clique no endpoint criado → **Reveal signing secret** → copia `whsec_...`
5. Adiciona no Supabase (passo 3): `STRIPE_WEBHOOK_SECRET="whsec_..."`
6. Re-deploy: `npx supabase functions deploy stripe-webhook --no-verify-jwt`

## 6. Criar produtos e preços no Stripe

Dashboard → **Products → + Add product** para cada plano:
- **Pro**: recurring, mensal, no seu preço local (99,99 BRL / 19,99 EUR / …)
- **Master**: idem, 149,99 / 29,99…
- **Elite**: idem, 199,99 / 39,99…

Copia o `price_...` de cada e cola nos secrets (passo 3).

Para preços por moeda: use [Stripe adaptive pricing](https://docs.stripe.com/products-prices/pricing-models#multi-currency) ou crie um `price_...` separado por moeda e escolha server-side com base em `profile.country`.

## 7. Cron: agendar charge-cron

No SQL Editor:

```sql
-- Habilita pg_cron (se ainda não estiver)
create extension if not exists pg_cron;

-- Roda charge-cron toda madrugada (08:00 UTC = 05:00 BRT)
select cron.schedule(
  'rutyn-charge-cron',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://nkmfabceawstzndrxdwj.functions.supabase.co/charge-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

Precisa gravar o service_role_key como setting (uma vez):
```sql
alter database postgres set app.settings.service_role_key = 'eyJhbGc...service_role_key...';
```

Ver jobs: `select * from cron.job;`
Ver execuções: `select * from cron.job_run_details order by start_time desc limit 20;`

## 8. Trigger push automático em notifications

Para que cada notification gerada dispare um push automaticamente, adicione:

```sql
create extension if not exists pg_net;

create or replace function public.on_notification_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://nkmfabceawstzndrxdwj.functions.supabase.co/send-push',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'user_id', new.user_id,
      'title', new.title,
      'body', new.body,
      'url', case
        when new.type = 'payment' then '/aluno/mensalidade'
        when new.type = 'invite' then '/professor/convites'
        else '/'
      end
    )
  );
  return new;
end $$;

drop trigger if exists notif_push on public.notifications;
create trigger notif_push after insert on public.notifications
  for each row execute function public.on_notification_insert();
```

## 9. URLs de Redirect no Supabase Auth

Já configurado no ambiente atual, mas se subir a produção:

Authentication → URL Configuration:
- **Site URL**: `https://seu-dominio.com`
- **Redirect URLs**: `https://seu-dominio.com/**`, `http://localhost:5173/**`

## 10. Deploy do frontend

Fica a critério (Vercel / Netlify / Cloudflare Pages / static hosting). Só precisa das env vars:

```
VITE_SUPABASE_URL=https://nkmfabceawstzndrxdwj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_VAPID_PUBLIC_KEY=BM...
```

E `npm run build` → serve `dist/`.

---

## Checklist de smoke test após deploy

- [ ] `POST /functions/v1/create-student` (com JWT de professor) → cria aluno + envia e-mail invite
- [ ] Ativar push nas Configurações → aparecer permission prompt do browser → notificação de teste chega
- [ ] Clicar "Assinar Pro" no paywall → redireciona pra Stripe Checkout → após pagar, `profile.plan='pro'` no DB
- [ ] Criar cobrança pendente vencendo em 5 dias → esperar cron → aluno recebe notificação
- [ ] Login com Google → volta autenticado
