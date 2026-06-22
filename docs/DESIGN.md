# NeuroRace v2 — Spec de Frontend

> Consolidação do brainstorming. Decisões travadas para começar a implementar.
> Acompanha o `PLANO.md` (arquitetura/backend). Stack: Next.js (App Router) + TS + Tailwind + Framer Motion + `@supabase/supabase-js`.

---

## 1. Direção (decisões travadas)

| Tema | Decisão |
|---|---|
| Identidade | **Evoluir o v1** — manter alma, acabamento premium (Apple/Tesla) |
| Foco do produto | **Equilíbrio** — vitrine (NEXT/jurados) + ferramenta pessoal (dashboard) |
| Movimento | **Sutil com propósito** (Framer Motion) |
| Navegação | **Top nav adaptativo** (deslogado: Entrar · logado: avatar/Sair) |
| Conteúdo | **Reaproveitar v1 + expandir** (datas → 2026) |
| Dashboard | **Combinado** — placar + replay da telemetria |
| Duelo 1x1 | **Individual agora** (RLS bloqueia oponente); pedir view comparativa depois |
| CTA NEXT | **Manter banner de votação com link configurável** |
| Mascote/tom | **Presente mas comedido** |
| Tema | **Dark only** no MVP · pt-BR · mobile-first (estande = muito mobile) |
| Deploy | **Vercel**; domínio depois |

---

## 2. Design system (evoluído do v1)

**Cores** (base v1, refinadas)
```
--bg          #0f1e2e   (navy fundo)
--bg-2        #1a2942   (seções)
--card        #1e3247   (cards)
--border      #30363d
--text        #c9d1d9
--text-strong #f0f6fc
--cyan        #38bdf8   ┐ gradiente de marca
--pink        #FF1493   ┘ (ciano → rosa)
--purple      #bf46f3   (acento)
--yellow      #FFD700   (destaque/conquista)
```
- Gradiente de marca `linear-gradient(90deg, cyan, pink)` em títulos e elementos-chave.
- **Glow neon sutil** em hovers e elementos ativos (não exagerar — premium, não arcade).

**Tipografia**
- Títulos: **Poppins** (600/700/800). Texto: **Inter** (400/500/600). (mesma do v1)
- Migrar para `next/font` (self-host, performance, sem flash).

**Espaçamento/raio/sombra**
- Escala consistente (4/8px). Raio padrão `12px` (cards), `8px` (botões). Sombra suave + glow no foco.
- Tokens centralizados no `tailwind.config` (não inline como no v1).

**Movimento** (Framer Motion)
- Entrada: fade + slide-up curto (`y: 16→0`, ~400ms, easeOut), stagger em listas.
- Hover: scale/elevação leve + glow. Transições de página suaves. Respeitar `prefers-reduced-motion`.

---

## 3. Estrutura de páginas / rotas

```
/                     Landing (SSG)          — público
/sobre                O Projeto + Ciência    — público (expandir v1)
/equipe               Desenvolvedores        — público
/login                Entrar                 — público
/cadastro             Criar conta            — público
/confirmar            Aguardando confirmação — público (pós-signup)
/dashboard            Meu Desempenho         — protegido (auth)
/ranking              Ranking                — placeholder ("em breve") até view do backend
```

**Shell:** `Header` adaptativo + `Footer` em todas. Banner de votação NEXT (configurável) na landing.

---

## 4. Inventário de componentes

- `Header` (adaptativo: estado deslogado/logado via sessão Supabase) + `NavMobile` (menu cérebro do v1, componentizado)
- `Footer` (com bloco LGPD atualizado p/ 2026)
- `VoteBanner` (link NEXT 2026 vindo de config/env — fácil de ativar)
- `QuoteCarousel` (as 13 frases do v1, com drag/swipe e auto-slide — reimplementar como componente)
- `Hero`, `ConceptSection`, `ScienceCard`, `TeamCard`
- `AuthForm` (login/cadastro), `ProtectedRoute`/guard
- Dashboard: `StatCard`, `EvolutionChart`, `RaceReplayChart`, `RaceList`, `EmptyState`
- `Mascot` (running/winner — usado no hero, vitória, empty state)

---

## 5. Dashboard (combinado) — spec

**Topo — Placar** (`StatCard` x3): Foco médio · Melhor foco · Nº de corridas
> Métricas derivadas da telemetria via `lib/metrics.ts` (Opção C do PLANO §3) até o backend publicar a view oficial. Definições a alinhar com backend (D1).

**Meio — Evolução entre corridas** (`EvolutionChart`, linha): foco por corrida ao longo do tempo (estilo v1, mas calculado da telemetria).

**Base — Replay da corrida selecionada** (`RaceReplayChart`): curva de `attention` (e `meditation` opcional) ao longo de `t` para a corrida escolhida. Destaques: pico, média, % tempo em zona de foco, duração (`finished_at - started_at`). **Este é o diferencial sobre o v1** e não depende de métrica derivada.

**Lista** (`RaceList`): corridas do usuário (mais recente primeiro); clicar troca o replay.

**Métricas derivadas (rascunho, confirmar com backend):**
- *Foco médio* = média de `attention` na corrida.
- *Pico* = max `attention`. *Zona de foco* = % de amostras com `attention ≥ limiar` (limiar a definir).
- *Duração* = `finished_at - started_at`.
- "Vitória"/comparação 1x1 = **fora do MVP** (RLS não expõe oponente).

---

## 6. Auth (fluxo real do backend)

1. `/cadastro` → `signUp({email, password})` → tela `/confirmar` ("confirme seu e-mail").
2. Usuário confirma → trigger do backend vincula `players.user_id` → corridas daquele e-mail aparecem.
3. `/login` → `signInWithPassword` → redirect `/dashboard`.
4. Guard: rota `/dashboard` exige sessão; sem sessão → `/login`.
5. **Dev na porta 3000** (já liberada no Supabase deles). URL de prod → pedir liberação (PLANO §1).

---

## 7. Estados de borda (importante — banco vazio no início)

- **Sem sessão** em `/dashboard` → redirect login.
- **Logado, sem corridas** (caso comum no início, banco vazio) → `EmptyState`: mascote + "Ainda não temos corridas suas" + como jogar no estande + dica de cadastrar com o **mesmo e-mail** da partida.
- **E-mail não confirmado** → aviso claro de confirmar.
- **Loading/erro** de query → skeletons + mensagem amigável.

---

## 8. Conteúdo (reaproveitar + expandir)

- Migrar copy do v1 (hero, conceito, ciência do foco, valores, equipe).
- Atualizar **todas as datas para o NEXT 2026** (v1 cita 08/11/2025) e o bloco LGPD.
- Expandir `/sobre` com seção "Como funciona o EEG/NeuroSky" (liga ao replay do dashboard).
- 6 cards de equipe do v1 (fotos já em `assets/team/`).

---

## 9. Pendências que dependem de terceiros (não bloqueiam Fase 0–2)

- **D1 — definição oficial das métricas** (backend). Bloqueia o *placar*, não o replay.
- **Dado de teste** confirmado no painel deles (senão dashboard cego no dev).
- **Link do NEXT 2026** (CTA de votação).
- **View de ranking** e **view de comparação 1x1** (backend, fases futuras).
- **URL de prod** liberada no Auth (perto do deploy).

---

## 10. Ordem de execução sugerida

1. **Fase 0** — scaffold Next + Tailwind + Supabase client + design tokens + Header/Footer.
2. **Fase 1** — Landing + Sobre + Equipe (SSG, design system). Valor visível sem backend.
3. **Fase 2** — Auth (cadastro/login/confirmar/guard).
4. **Fase 3** — Dashboard: replay (independe de D1) → placar (quando D1 fechar).
5. Ranking e duelo 1x1 → quando o backend liberar as views.
