# NeuroRace v2

Frontend do **NeuroRace** para o **NEXT FIAP 2026** — performance cognitiva gamificada (controle um jogo com o foco, via EEG/NeuroSky).

Reescrita do v1 (HTML/CSS/JS + Firebase) em **Next.js + Supabase**, com auth real e privacidade por padrão.

> Planejamento e decisões: [`docs/PLANO.md`](docs/PLANO.md) (arquitetura/backend) e [`docs/DESIGN.md`](docs/DESIGN.md) (frontend).

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind v4** (tokens via `@theme` em `app/globals.css`)
- **motion** (Framer Motion) · **Recharts**
- **Supabase** (`@supabase/ssr`) — auth e leitura via RLS, **direto do front** (sem API custom)

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:3000  (use a porta 3000: já liberada no Auth do Supabase)
```

`.env.local` já contém os valores **públicos** do Supabase (URL + publishable key) fornecidos pelo backend. A publishable key é feita para ir no bundle — **nunca** colocar a `service_role`/secret aqui.

```bash
npm run build    # build de produção
npm run lint     # ESLint
```

## Estrutura

```
app/
  page.tsx              landing (SSG)
  sobre/ equipe/        páginas de conteúdo (SSG)
  login/ cadastro/ confirmar/   auth (e-mail + senha, confirmação obrigatória)
  dashboard/            meu desempenho (protegido por sessão)
  ranking/              placeholder (aguardando view do backend)
  auth/callback/ auth/confirm/  route handlers do fluxo de auth
components/             Header (nav adaptativa), Footer, VoteBanner, QuoteCarousel, ui/, dashboard/, auth/
lib/
  site.ts               config central (nav, frases, equipe, link de votação, limiar de foco)
  metrics.ts            métricas derivadas da telemetria (PROVISÓRIO — ver PLANO §3)
  supabase/             client (browser) · server (SSR) · middleware · database.types
proxy.ts                proteção de rota /dashboard + renovação de sessão (Next 16)
```

## Integração com o backend

- Banco/auth/ingestão são do repo `NeuroRace/cloud-backend`. O front **lê** via `@supabase/supabase-js` + RLS (cada usuário só vê o próprio dado).
- Tabelas: `players`, `races`, `race_players`, `telemetry_points` (attention/meditation ao longo do tempo).
- O vínculo das corridas à conta acontece quando o usuário **confirma o e-mail** (trigger no backend) usando o **mesmo e-mail** da partida.

### Pendências que dependem do backend / time

- **Definição oficial das métricas** (foco/TZF/LFO) → hoje derivadas localmente em `lib/metrics.ts` (limiar de foco provisório em `lib/site.ts`).
- **Dado de teste** (1 usuário confirmado + 1 corrida) — o banco está vazio; sem isso o dashboard só mostra o estado vazio.
- **View de ranking** anonimizada → libera a página `/ranking`.
- **View de comparação 1x1** → libera o "duelo" no replay (a RLS não expõe o oponente).
- **URL de produção** liberada no Supabase Auth (Site URL + Redirect URLs) antes do deploy na Vercel.
- **Link de votação do NEXT 2026** → preencher `site.event.voteUrl` em `lib/site.ts`.
