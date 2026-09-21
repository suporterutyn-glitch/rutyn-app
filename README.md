# Rutyn PWA

App bilíngue (PT/ES) de treino e nutrição — professor & aluno em uma única aplicação. React + Vite + TypeScript + Tailwind, PWA mobile-first (max 430px), backend Supabase (Postgres + Auth + Realtime + Edge Functions).

Reconstrução do app Flutter+Firebase original, seguindo a especificação em [`../Rutyn_Documentacao`](../Rutyn_Documentacao/LEIA-ME.md).

---

## Setup local

```bash
npm install
cp .env.example .env.local   # já preenchido no ambiente de dev
npm run dev                  # → http://localhost:5173
```

`.env.local`:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

O projeto de dev atual: `nkmfabceawstzndrxdwj.supabase.co` · região São Paulo · plano Free.

## Scripts

| Script | Ação |
|---|---|
| `npm run dev` | Vite dev server (porta 5173) |
| `npm run build` | TypeScript check + bundle Vite |
| `npm run preview` | Servir o build local |
| `npm run lint` | oxlint |

## Estrutura

```
app/
├── src/
│   ├── lib/            # supabase, auth (contexto), i18n, plans, countries, assessment (cálculos)
│   ├── components/     # DragSlider, WhatsAppInput, LanguageToggle, OfflineBanner, BottomNavs
│   ├── pages/
│   │   ├── (raiz)      # Splash, Identificacao, Login, EsqueciSenha, StatusGate, Bloqueado,
│   │   │               # Cadastro{Professor,Aluno}, AguardandoAprovacao,
│   │   │               # Chat, Notificacoes, Configuracoes, MeuPerfil, Anamnese
│   │   ├── professor/  # Shell, Home, MeusProjetos + 5 tabs, Alunos, AlunoPerfil,
│   │   │               # Financeiro, DadosBancarios, Assinatura, CompletarPerfil,
│   │   │               # Avaliacao, Convites
│   │   └── aluno/      # Shell, Home, Treinos, TreinoDetalhe, TreinoExecucao, TreinoResumo,
│   │                   # Nutricao, EncontrarProfessor, PerfilProfessor, Mensalidade, Avaliacao
│   └── App.tsx         # rotas
└── supabase/
    ├── migrations/     # 6 arquivos idempotentes (aplicados via SQL Editor)
    └── functions/
        └── create-student/index.ts
```

## Banco de dados

Migrações aplicadas em ordem (todas idempotentes):

1. `20260919_000_fase1_fundacao.sql` — enums, `profiles`, `invites`, trigger `handle_new_user`, RLS base
2. `20260919_001_fix_profiles_rls_recursion.sql` — helpers `security definer` para evitar recursão
3. `20260919_002_fase2_professor.sql` — 15 tabelas do professor + view `v_teacher_stats`
4. `20260920_003_fase4_perfil_dinheiro.sql` — 17 colunas de perfil profissional + `subscriptions`
5. `20260920_004_fase5_avaliacao_chat.sql` — `assessments`, `anamnesis_*`, `conversations`, `messages` (Realtime)
6. `20260920_005_seed_anamnese.sql` — 2 templates globais de anamnese PT/ES

Para (re)aplicar em outro projeto: cole cada arquivo no **SQL Editor** do Supabase e rode. Ordem importa.

## Módulos entregues

| # | Módulo | Rotas principais | Status |
|---|---|---|---|
| 01 | Acesso | `/`, `/identificacao`, `/login`, `/cadastro/*`, `/aguardando`, `/bloqueado` | ✅ |
| 02 | Cadastro professor | `/cadastro/professor`, `/professor/perfil/completar` | ✅ |
| 03 | Cadastro aluno | `/cadastro/aluno` | ✅ |
| 04 | Home professor | `/professor` (dashboard + agenda) | ✅ |
| 05 | Alunos | `/professor/alunos`, `/professor/alunos/:id` | ✅ |
| 06 | Avaliação física | `/professor/avaliacoes/:id`, `/aluno/avaliacao` | ✅ (essencial + cálculos IMC/FC/WHR) |
| 07 | Rotinas e exercícios | `/professor/projetos` (tab Rotinas + Exercícios) | ✅ |
| 08 | Dietas, alimentos, receitas | `/professor/projetos` (tab Dietas + Alimentos + Receitas) | ✅ |
| 09 | Financeiro professor | `/professor/financeiro`, `/professor/dados-bancarios` | ✅ |
| 10 | Assinatura + perfil + config | `/professor/assinatura`, `/professor/configuracoes`, `/professor/perfil` | ✅ |
| 11 | Home aluno | `/aluno` (dashboard: mensalidade, hidratação, frequência) | ✅ |
| 12 | Encontrar professor | `/aluno/encontrar-professor`, `/aluno/encontrar-professor/:id` | ✅ |
| 13 | Treino aluno | `/aluno/treinos`, `/aluno/treinos/:id`, `/aluno/treinos/:id/execucao`, `/aluno/treinos/:id/resumo` | ✅ |
| 14 | Nutrição aluno | `/aluno/nutricao` (revezamento A/B/C + lista de compras WhatsApp) | ✅ |
| 15 | Chat | `/professor/mensagens`, `/aluno/chat`, `/*/mensagens/:id` (realtime) | ✅ (text-only) |

Extras: Anamneses (`/professor/anamnese/:id`, `/aluno/anamneses`), Notificações (`/*/notificacoes`), Convites (`/professor/convites`), Mensalidade aluno (`/aluno/mensalidade`).

## Design system

Todos os tokens do doc estão no `tailwind.config.ts` + `src/index.css`:

- Fundo `#1A1A1A`, cards `#1E1E1E`/`#2D2D2D`, bordas `#333333`.
- Cor de marca `#7CB342`, gradiente primário `brand-v` (`#91C145→#445B21`).
- Fonte Montserrat via Google Fonts.
- Radius nomeados: `card` 16, `bubble` 18, `sheet` 20, `btn-pill` 27, `menu` 30, `nav` 17.
- Utilities Rutyn: `text-rt-{6-72}` (px exatos do doc), `bg-{brand-v|save|purchase|charge|revenue|water|whatsapp|google|apple}`, `shadow-{glow|nav-center|badge-red}`.
- Componentes prontos em `@layer components`: `.btn-primary-pill`, `.btn-save`, `.btn-google`, `.btn-apple`, `.btn-outline-white`, `.input-dark`, `.input-light-underline`, `.card-dark`.

## i18n

`src/lib/i18n.ts` — 17 namespaces, paridade PT ↔ ES completa. `setLang('pt'|'es')` persiste em `localStorage` e troca em tempo real. Ao logar, o profile grava `language` (definido no cadastro pelo país do WhatsApp: `BR/PT → pt`, restantes → `es`).

## RLS (segurança)

Cada tabela tem RLS ativado. Padrões usados:

- **Self**: `auth.uid() = id` (profiles)
- **Owner**: `owner_id = auth.uid()` (routines, exercises, foods…)
- **Teacher-student links**: professor lê alunos vinculados; aluno lê a `student_routines/diets` própria e o professor
- **Marketplace público**: professor com `marketplace_visible=true` e `profile_complete=true` é lido por qualquer autenticado
- **Involved-in-charge**: teacher e student leem cobranças em que participam; aluno só pode marcar `student_declared_at`
- **Chat**: `sender_id = auth.uid()` + envolvido na conversation
- **Anti-recursão**: helpers `security definer` (`my_role()`, `my_teacher_id()`) para políticas que precisam consultar `profiles` sem re-entrar em RLS

## Edge Functions

### `create-student`
Deploy:
```bash
supabase login
supabase link --project-ref nkmfabceawstzndrxdwj
supabase functions deploy create-student
```
- Recebe `{ email, full_name, phone }` do professor autenticado
- Valida role=teacher + limite do plano server-side
- Cria user via `admin.auth.admin.inviteUserByEmail` (envia e-mail com link para definir senha)
- Vincula `teacher_id` + `link_status='active'` ao novo aluno

## Handoff — o que falta para produção

Não requer código, requer configuração ou serviços externos:

- [ ] **Google/Apple OAuth**: criar OAuth clients em Google Cloud Console + Apple Developer, colar em Supabase `Authentication → Providers`
- [ ] **Deploy create-student**: comando acima
- [ ] **Stripe (assinatura real)**: nova Edge Function `stripe-webhook` que ouve `checkout.session.completed` e `customer.subscription.*` e atualiza `profiles.plan` + `plan_expires_at`. A tela [Assinatura.tsx](src/pages/professor/Assinatura.tsx) hoje grava direto (dev-only), então TROCAR pelo redirect ao Stripe Checkout.
- [ ] **Push notifications** (web-push + VAPID): registrar SW handlers em `src/main.tsx` (já temos SW via vite-plugin-pwa)
- [ ] **Cron jobs (Supabase Scheduled Functions)**:
  - Lembrete de mensalidade 5 e 3 dias antes do vencimento
  - Marcar cobranças vencidas como `suspended`
  - Limpar contas `deleting` após X dias
  - Desativar alunos sem professor > 30 dias
- [ ] **Storage buckets** (avatar, mídia de exercício, capa de receita, foto de avaliação) — políticas de acesso
- [ ] **Complementos do módulo 06 (avaliação)**: perimetria completa + fotos + 6 seções restantes (o schema já suporta)
- [ ] **Chat de áudio/imagem/documento** (Storage + `attachment` na tabela messages)
- [ ] **Recuperação de senha**: `/redefinir-senha` (schema OK; falta a tela de definir nova senha após clicar no e-mail)

## Convenções de código

- Alias `@/*` → `src/*` (definido em `tsconfig.app.json` + `vite.config.ts`)
- Componentes com prefixo React em PascalCase, funções em camelCase
- Sem comentários redundantes — o design system + RLS + doc explicam o "porquê"
- Cores/tamanhos/gradientes SEMPRE via tokens do Tailwind, nunca hex inline
- Formulários usam `Field` + `input-dark`/`input-light-underline` do design system

## Créditos

Reconstruído a partir da documentação em [Rutyn_Documentacao](../Rutyn_Documentacao/) com Claude Code (Opus 4.7).
