# CLAUDE.md — web-plataform (front do NeuroRace)

Guia enxuto para agentes de IA (e humanos). Leia antes de mexer.

## Princípios (não-negociáveis)
- **Honestidade brutal · evidência-não-inferência · não-regressão · escopo · PT-BR.** Não afirme "pronto/passa/deployado" sem prova (output, SHA+diff, caminho, screenshot).

## O que é
Front do NeuroRace: landing, "sobre", equipe, **auth** (e-mail/senha com confirmação), **dashboard pessoal** e **ranking** (placeholder). **Lê o Supabase direto do browser/SSR via RLS** — **não** tem API própria e **não** fala com o `edge-service`. Escrita nas tabelas é só do edge; aqui é **só leitura**.

## Stack (evidência: `package.json`)
Next.js **16.2.9** (App Router) · React **19.2.4** · Tailwind **v4** · `@supabase/ssr` + `@supabase/supabase-js` · Recharts · Vitest 3. Gerenciador: **npm** (`package-lock.json`). Node **≥ 20.9** (Next 16); **não há** `.nvmrc`/`engines` — use 20.9+.

## Rodar local
```bash
npm ci
cp .env.example .env.local     # já vem com as 2 chaves públicas do projeto
npm run dev                    # http://localhost:3000
```
- **Porta 3000 é obrigatória:** o Supabase Auth só libera `http://localhost:3000` nas Redirect URLs — em outra porta os redirects de confirmação/login quebram.
- **`/dashboard` é protegido** (`proxy.ts` → `lib/supabase/middleware.ts`: sem sessão → `/login`). O banco começa vazio; para ver o dashboard com dados, use `scripts/seed-demo.mjs` (dev-only) para um e-mail confirmado e logue com ele.
- `proxy.ts` é o **middleware do Next 16** (renomeado de `middleware.ts` na v16): renova a sessão Supabase e protege `/dashboard`.

## Testar (prova de não-regressão)
```bash
npm test          # vitest run — roda 100% offline (jsdom + Testing Library), sem env/rede
npx tsc --noEmit  # não há script de typecheck; tsconfig é strict
```
Cobertura honesta: os ~11 arquivos de teste cobrem quase só componentes **decorativos** (`components/signal/*`). **A lógica load-bearing NÃO tem teste**: `lib/metrics.ts` (métricas do dashboard), auth e os helpers Supabase. Não confie na contagem de testes como cobertura real.

## Convenções (best practices deste repo)
- **Só-leitura do Supabase:** o app usa apenas `.select()` (`race_players`, `telemetry_points` em `app/dashboard/page.tsx`), escopado por RLS (`auth.uid()`). **Nunca** adicione `.insert/.update/.upsert/.delete/.rpc` de dados aqui — escrita é do edge.
- **Clientes Supabase:** browser (`lib/supabase/client.ts`), SSR (`lib/supabase/server.ts`), middleware (`lib/supabase/middleware.ts`). Tipos em `lib/supabase/database.types.ts`.
- **Chaves:** só a **publishable** (`NEXT_PUBLIC_*`, pública, vai no bundle). **Nunca** use/commite a `service_role` (só o seeder local a usa, via `.env.local`).
- **Config central** em `lib/site.ts` (nav, frases, equipe). Métricas do dashboard em `lib/metrics.ts` são **provisórias** (pendentes do backend).

## Segredos / env
- `.env*` é gitignored. Copie `.env.example` → `.env.local`. As 2 vars `NEXT_PUBLIC_*` são públicas; a `service_role` (só seeder) é **segredo** — nunca commitar.

## Deploy
Hospedado na **Vercel** (integração Git da Vercel, configurada fora do repo — não há `vercel.json` nem workflow). **Não verificado ao vivo** neste doc; `lib/site.ts` ainda usa a URL placeholder `neurorace.vercel.app`.

## Fluxo de trabalho
Branch a partir de `main` + PR (worktree por padrão em implementação). Antes do commit: `npm run lint && npm test && npx tsc --noEmit`. **Sem CI hoje** — rode os checks localmente.

## Ponteiros
- Plano/design: `docs/PLANO.md`, `docs/DESIGN.md`. Seeder de demo: `scripts/seed-demo.mjs`.
- Par na nuvem (o que a web lê): `../cloud-backend/` (contrato de leitura em `../cloud-backend/docs/frontend-integration.md`).
- Linear: time **NEU**, projeto **web-plataform**. `/ranking` depende de view/ranking do backend (NEU-11 / NEU-67).
