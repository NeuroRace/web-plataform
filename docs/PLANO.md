# NeuroRace v2 — Plano de Reestruturação (Frontend)

> Frontend do NeuroRace para o **NEXT FIAP 2026**.
> **Backend já existe e está deployado** por outro time → `github.com/NeuroRace/cloud-backend` (clone de referência em `E:\projetos_breq\_ref-cloud-backend`).
> Referência visual (v1, não tocar): `E:\projetos_breq\neurorace-app-main`.

---

## 0. O que MUDOU depois do backend (reler antes de tudo)

O backend assumiu schema, ingestão, auth e RLS. **Não construímos nada disso.** O front:
- fala **direto com o Supabase** via `@supabase/supabase-js` + RLS (sem API custom de leitura);
- faz **auth real** (e-mail + senha, com confirmação obrigatória);
- lê **só o dado do próprio usuário** (RLS garante no banco).

Consequências diretas no plano original:
- ❌ **Não** desenhamos schema, ❌ **não** fazemos ingestão, ❌ **não** escrevemos RLS, ❌ **não** migramos Firestore.
- 🔴 **As métricas do v1 (TZF, LFO, vitórias, melhor tempo) NÃO existem no banco** → ver §3 (maior decisão pendente).
- 🔴 **Ranking está bloqueado pelo backend** ("não construam ainda" — decisão de produto + view security-definer pendente).

---

## 1. Conexão (dada pelo backend)

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const supabase = createClient<Database>(
  'https://wtaulbdkgrnrtbfezaxw.supabase.co',
  'sb_publishable_JpFFIWudbZ3GxR04QINxog_GqGk7dpw' // publishable — PÚBLICA, pode ir no bundle. NUNCA service_role.
)
```
- Copiar `_ref-cloud-backend/supabase/types/database.types.ts` → `lib/supabase/`.
- ⚠️ **Pendência (Pedro/backend):** liberar nossa URL de dev/prod em *Authentication > URL Configuration*. Hoje só `http://localhost:3000` está liberado → **usar Next na porta 3000 elimina a pendência no dev**.

---

## 2. Schema REAL (4 tabelas, RLS own-data)

```
players          (id, email, user_id→auth.users, created_at)
races            (id, started_at, created_at)              -- só o início compartilhado
race_players     (id, race_id, player_id, player_slot 1|2, source, started_at, finished_at)
telemetry_points (race_player_id, t, attention 0..100, meditation 0..100,
                  poor_signal_level, signal_status, eeg_power jsonb)
```

**Vínculo:** o `players.user_id` é preenchido por trigger **quando o usuário confirma o e-mail** — casa as corridas daquele e-mail com a conta. Antes de confirmar, RLS não retorna nada.

**Leitura (pós-login), RLS já escopa pro dono:**
```ts
supabase.from('races').select('id, started_at').order('started_at', { ascending:false })
supabase.from('race_players').select('id, race_id, player_slot, started_at, finished_at')
supabase.from('telemetry_points')
  .select('t, attention, meditation, poor_signal_level, signal_status, eeg_power').order('t')
```
Anon → volta vazio (não erro). Dado de terceiro → bloqueado pela RLS.

---

## 3. 🔴 DECISÃO CRÍTICA — o "buraco de métricas"

O v1 exibia **TZF (% foco), LFO (resiliência), vitórias, melhor tempo, percentis**.
**Nada disso existe no schema novo.** O banco só tem:
- **telemetria crua**: amostras de `attention`/`meditation` (0..100) ao longo do tempo (`t`);
- **timing**: `started_at` / `finished_at` por jogador;
- quem venceu, "TZF", "LFO" → **não são campos**.

Logo, antes de montar o dashboard, é preciso decidir **quem deriva as métricas**:

| Opção | Como | Trade-off |
|---|---|---|
| **A — Front deriva** | Front calcula tudo da telemetria (ex.: foco = média de `attention`; "tempo na zona" = % de amostras acima de X; duração = `finished_at-started_at`) | Rápido pra desbloquear; mas regra de negócio espalhada no client, sem fonte única, e ranking (server) usaria definição diferente → inconsistência |
| **B — Backend expõe (recomendado)** | Alinhar definições COM o backend; eles publicam `view`/colunas agregadas (foco, duração, etc.) | Fonte única da verdade, consistente com o ranking futuro; depende do time. O Linear deles já lista "ranking e outras métricas" como planejado |
| **C — Híbrido** | Front deriva agora pra prototipar a UI; troca pela view quando o backend publicar | Pragmático: não bloqueia a UI, mas exige refactor depois |

**Recomendação:** **C agora, convergindo pra B.** Definir as fórmulas das métricas em conjunto (o que é "TZF" exatamente em cima de `attention`? o que é "LFO"?) e registrar como contrato. Sem isso, o dashboard vira números inventados.

> Ação: abrir issue no Linear deles pedindo (1) definição oficial das métricas e (2) view agregada. Bloqueia o valor real do dashboard, não a UI.

---

## 4. Auth & privacidade (estado real)

- **E-mail + senha** com **confirmação obrigatória** (`signUp` / `signInWithPassword`). Não é magic link.
- No dev, confirmar usuários de teste pelo painel até a URL ser liberada.
- **Privacidade já resolvida na leitura** pelo backend (RLS own-data; sem PII cross-user). O risco de LGPD do v1 não se repete — *desde que* o ranking, quando vier, use view anonimizada (responsabilidade do backend; acompanhar).

---

## 5. Estrutura (Next App Router)

```
neurorace-v2/
├── app/
│   ├── (marketing)/          # landing, sobre, equipe  (SSG, sem dado dinâmico)
│   │   ├── page.tsx
│   │   ├── sobre/page.tsx
│   │   └── equipe/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── cadastro/page.tsx
│   ├── dashboard/page.tsx    # protegido; lê races/race_players/telemetry do próprio user
│   └── ranking/page.tsx      # PLACEHOLDER até backend liberar a view
├── components/               # Header, NavMobile, QuoteCarousel, Footer, charts...
├── lib/supabase/             # client.ts (browser) + server.ts (SSR) + database.types.ts
│   └── metrics.ts            # derivação de métricas da telemetria (Opção C; isolar p/ trocar depois)
├── public/assets/            # imagens migradas do v1
└── PLANO.md
```

Design system premium dark (Apple/Tesla, anti-template) reaproveitando a identidade visual do v1 (cores, gradiente ciano→rosa, mascotes, frases do carrossel).

---

## 6. Roadmap por fases

- **Fase 0 — Fundação**: `create-next-app` (TS/Tailwind/App Router), `@supabase/supabase-js`, client browser+server, copiar `database.types.ts`, `.env.local`, lint/CI. Rodar na **porta 3000**. ✅ quando `getSession()` funciona e build passa.
- **Fase 1 — Marketing (SSG)**: landing + sobre + equipe com design system premium. Sem dado dinâmico → entrega valor visível sem depender de nada do backend.
- **Fase 2 — Auth**: cadastro/login e-mail+senha, fluxo de confirmação, sessão, rotas protegidas.
- **Fase 3 — Dashboard (próprio)**: ler races/race_players/telemetry; gráfico de `attention` no tempo; métricas via `lib/metrics.ts` (Opção C). **Depende da §3.**
- **Fase 4 — Métricas oficiais**: trocar derivação local pela view do backend quando publicada (converge p/ Opção B).
- **Fase 5 — Ranking**: só quando o backend liberar a view anonimizada. **Bloqueado hoje.**
- **Fase 6 — Polish & deploy**: a11y, perf, LGPD revisada (datas 2026), Vercel + domínio, passar URL de prod pro backend liberar.

Cada fase fecha na barra de qualidade Breq: lint ✓ · build ✓ · testes ✓ · revisão UI/seg/arquitetura/produto ✓ · Wiki ✓.

---

## 7. Riscos & decisões em aberto

- **D1 (CRÍTICA) — Métricas:** quem deriva TZF/LFO/etc. e quais as fórmulas? (§3). Bloqueia o valor do dashboard. → alinhar com backend.
- **D2 — Ranking:** aguardar view do backend; não construir agora (instrução deles).
- **D3 — Banco vazio:** sem seed; dado só aparece quando o edge gravar corrida real + usuário cadastrar com mesmo e-mail. → preciso de **dado de teste** (pedir ao backend para confirmar 1 usuário/corrida de teste no painel).
- **D4 — URL de redirect:** rodar dev em :3000 (já liberado) e passar URL de prod (Vercel) pro Pedro liberar antes do deploy.
- **D5 — Lib de gráfico:** Recharts (idiomático React) vs. Chart.js (do v1). Recomendo Recharts.
- **D6 — Conteúdo "vitórias"/"corrida" com 2 slots:** `player_slot 1|2` sugere corrida 1x1. Definir como o front representa head-to-head (quem ganhou não está no banco). Liga na D1.

---

## Próximo passo proposto
1. Confirmar D1/D5 e o pedido de dado de teste (D3) ao backend.
2. Registrar ADR-001 (front: Next+Supabase direto, auth e-mail/senha, métricas via §3) na Wiki Breq.
3. Executar **Fase 0** (scaffold). Nada de código antes do teu OK.
