# Design — NeuroCoach 2.0 (IA Coach): motor de insights determinístico + texto da IA com cache (NEU-115)

> **Convenção:** `[ev]` = verificado (código, API ou consulta agregada à produção). `[hip]` = a confirmar
> na implementação. `[decisão]` = escolha do brainstorming com o Nikolas (28/09), passível de revisão.
>
> Data: 2026-09-28. web-plataform `main` @ `b7114e1`. Supabase ref `wtaulbdkgrnrtbfezaxw`.
> Linear: NEU-115 (esta), absorve NEU-95; relacionadas NEU-106, NEU-103/PR #9, NEU-94, NEU-64, NEU-88, NEU-108.
> Para o NEXT: NEU-116 (percentil vs evento), NEU-88 (imagem para Instagram).

---

## 1. Contexto e objetivo

### Como é hoje `[ev]`

`DashboardClient` → `getCognitiveReportAction(RaceSummary)` (server action) → `extractCognitiveFeatures`
→ prompt → Groq (`openai/gpt-oss-120b`, `temperature 0.2`) → Zod → card com arquétipo, 6 badges,
narrativa, forças, oportunidades e exercícios. Sem `GROQ_API_KEY` ou com erro, entra
`generateFallbackReport`, quase o mesmo texto para todos.

### Problemas `[ev]`

1. **Segurança e custo.**
   - A action recebe o resumo montado no navegador (dá para forjar) e, na `main`, não checa sessão (NEU-106).
   - Chama a Groq a cada troca de corrida. Não há cache nem persistência (o tipo `SavedCognitiveFeedback` não é usado).
2. **Resultado instável.** Arquétipo e badges são limiares que o LLM "aplica". A mesma corrida muda de resultado.
3. **Convite à alucinação.**
   - O oponente nunca é enviado, então o `result` é sempre `SOLO`. Mesmo assim, o prompt pede causalidade com ultrapassagens.
   - O prompt chama o índice eSense do NeuroSky de "ondas Beta/Alpha".
   - O few-shot tem JSON inválido (`"confidence_score: 0.95`).
4. **Regras incompatíveis com o dado real.** Agregados das 13 corridas `source='real'` de produção:
   - No NeuroSky real (corridas de 21 a 52 amostras), o desvio-padrão bruto do attention é **27 a 33**. A regra
     "Oscilador" (> 22) classificaria todos. No sinal suavizado (média móvel de 5 amostras), fica em 9 a 20.
   - A maior sequência **bruta** com attention ≥ 60 dura só **2 a 5 s**. A suavizada, **2 a 8 s**.
   - Duração média de 67 s, 1 amostra/s, 4 jogadores, a maioria com 1 ou 2 corridas.
5. **Pouco valor.** Analisa uma corrida isolada, sem evolução, sem meta mensurável e sem mostrar *onde* na corrida
   algo aconteceu.

### Objetivo

Para quem jogou no estande e abre o dashboard, o NeuroCoach deve explicar a corrida com fatos corretos e
estáveis. Deve mostrar os momentos no replay, a evolução em relação à corrida anterior e uma meta concreta para a
próxima. Tudo isso **com ou sem IA**, com custo de no máximo 1 chamada à Groq por corrida e sem aceitar dado do
navegador.

**Critério de sucesso (aceite da NEU-115):**
- A mesma corrida gera sempre os mesmos arquétipo, badges, momentos e meta.
- Sem chave ou sem consentimento, o card aparece completo com o texto-modelo.
- Com os dois, a Groq é chamada 1 vez por corrida.
- Um id de corrida de outra pessoa não devolve nada.
- Testes verdes; `lint`, `tsc` e `build` ok.

**Fora de escopo (NEXT):** percentil vs outros jogadores (NEU-116); imagem para Instagram (NEU-88); persistência
em tabela no cloud; novas métricas de ranking (NEU-67).

---

## 2. Decisões

1. `[decisão]` **Prazo:** o núcleo abaixo vai para a banca de 30/09. O resto vira issues do NEXT (24/10).
2. `[decisão]` **Híbrido:** o código decide os fatos e o LLM só escreve `headline` e `summary`. O texto-modelo
   (sem IA) usa os mesmos fatos.
3. `[decisão]` **LLM só com consentimento LGPD.**
   - Válido = `hasValidConsent(user.user_metadata)` de `lib/consent.ts`, trazido **idêntico** do PR #9 (NEU-103).
   - O motor roda para qualquer usuário logado, porque não envia nada a terceiros.
4. `[decisão]` **Abordagem A:** tudo no web. A action recebe só `racePlayerId`, carrega os dados via RLS e usa
   `unstable_cache` para o texto. Sem migration.
5. `[decisão]` **Sinal suavizado:** momentos, sequência e volatilidade usam a média móvel de 5 amostras
   (MA5, janela à esquerda). Média, pico, zona de foco e terços continuam no sinal bruto, iguais ao dashboard.
6. `[decisão]` **Metas relativas ao próprio desempenho** (ex.: sequência + 30%), não números fixos.
   No NeuroSky real, metas fixas seriam inalcançáveis.
7. `[decisão]` **Só a Groq.** O Gemini sai: a dependência `@google/generative-ai` e `scripts/diagnose-gemini.ts`
   não são usados pelo app.
8. `[decisão]` **Linguagem:** "índice de atenção/calma do NeuroSky". Nunca "ondas Beta/Alpha", "ultrapassagem",
   "oponente" ou "posição".

---

## 3. Arquitetura e fluxo

```
Dashboard (client) ── CoachPanel ── getCoachReportAction(racePlayerId) ──▶ server
  1. supabase.auth.getUser()        → sem sessão: {ok:false, reason:"unauthenticated"}
  2. RLS: race_players + telemetry_points do usuário (mesmas queries do dashboard)
     → racePlayerId fora da lista:   {ok:false, reason:"not_found"}
  3. buildRaceSummaries (lib/metrics) → analyzeRace(race, history) → CoachFacts
  4. narrativa:
       hasValidConsent && GROQ_API_KEY → aiNarrative(facts)   [unstable_cache por hash]
       senão, ou se a IA falhar        → templateNarrative(facts)
  5. {ok:true, facts, narrative:{headline, summary, source:"ai"|"template"}}
```

Arquivos (`lib/coach/` novo; `lib/ai/` e `components/ai/` saem):

| Arquivo | Responsabilidade |
|---|---|
| `lib/coach/types.ts` | `CoachFacts`, `Moment`, `Archetype`, `Badge`, `Goal`, `CoachNarrative`, `CoachActionResult` |
| `lib/coach/series.ts` | Funções puras de série: `movingAverage`, `thirds`, `stdDev`, `longestRunAtOrAbove`, `windowDeltas` |
| `lib/coach/rules.ts` | Arquétipo e badges (limiares §4) + rótulos e descrições pt-BR |
| `lib/coach/goal.ts` | Escolha da meta + catálogo fixo de exercícios |
| `lib/coach/analyze.ts` | `analyzeRace(race, history): CoachFacts` (compõe tudo) |
| `lib/coach/narrative-template.ts` | `templateNarrative(facts): CoachNarrative` |
| `lib/coach/narrative-ai.ts` | Prompt, chamada à Groq, validação, travas, cache |
| `lib/coach/action.ts` | `"use server"` `getCoachReportAction(racePlayerId)` |
| `lib/consent.ts` | Idêntico ao do PR #9 |
| `components/coach/CoachPanel.tsx` | Client: chama a action, memo por corrida, estados |
| `components/coach/CoachCard.tsx` | Apresentação do relatório |
| `components/dashboard/ReplayChart.tsx` | Aceita `moments?: Moment[]` (faixa + marcadores ①②③) |

---

## 4. O motor — `analyzeRace`

**Entrada:**
- `race: RaceSummary`, com `series` 1 Hz (`t` em s desde a largada, `attention` e `meditation` 0..100 ou null);
- `history: RaceSummary[]`, todas as corridas do usuário incluindo `race`, em ordem de `startedAt` crescente.

**Pré-processamento:** usa só os pontos com `attention != null`, em ordem de `t`. `n` = quantidade desses pontos.

### 4.1 Qualidade
- `n < 10` → `quality: "insufficient"`: `archetype = null`, `moments = []`, `goal = null`.
  Badges de histórico e progresso continuam.
- Senão → `quality: "ok"`.

### 4.2 Métricas (`facts.metrics`)
- `avgAttention`, `peakAttention`, `focusZonePct` (attention bruto ≥ 60), `avgMeditation`, `durationSeconds`:
  os mesmos de `race.metrics` (`lib/metrics.computeMetrics`), sem recalcular de outro jeito.
- `thirds: [t1, t2, t3]`: média do attention bruto em cada terço, por índice de amostra (`n` dividido em 3 partes;
  o resto vai para o último terço), arredondada para 1 casa.
- `volatility`: desvio-padrão populacional da MA5, 1 casa.
- `bestStreakSeconds`: maior sequência de amostras consecutivas com MA5 ≥ 60. Contada em amostras (≈ s a 1 Hz).

### 4.3 Momentos (`facts.moments`, no máximo 3, em ordem de `t`)
- `d5[i] = MA5[i] − MA5[i−5]` para `i ≥ 5`.
- Candidatos:
  1. `streak`: a melhor sequência, se tiver ≥ 3 amostras → `{kind:"streak", t:início, tEnd:fim, value:segundos}`.
  2. `drop`: `min(d5)` se ≤ −20 → `{kind:"drop", t: t[i], value: d5 arredondado}` (negativo).
  3. `rise`: `max(d5)` se ≥ +20 → `{kind:"rise", t: t[i], value: d5 arredondado}`.
  4. `peak`: primeiro máximo do attention bruto → `{kind:"peak", t, value}`. Só entra se houver menos de 3 candidatos acima.
- Ficam os 3 primeiros candidatos, na ordem de prioridade acima, e depois são ordenados por `t`.

### 4.4 Arquétipo (primeira regra que casar)

| # | Regra | Arquétipo (id → rótulo) |
|---|---|---|
| 1 | `avgAttention < 45` | `EM_AQUECIMENTO` → "Em Aquecimento" |
| 2 | `avgAttention ≥ 60` | `HIPERFOCADO` → "Hiperfocado" |
| 3 | `t3 − t1 ≥ 10` | `ARRANQUE_CRESCENTE` → "Arranque Crescente" |
| 4 | `t1 − t3 ≥ 10` | `SPRINTER` → "Sprinter" |
| 5 | `volatility ≥ 15` | `OSCILADOR` → "Oscilador" |
| 6 | `avgMeditation ≥ 55` e `volatility < 10` | `MESTRE_ZEN` → "Mestre Zen" |
| 7 | resto | `EQUILIBRADO` → "Equilibrado" |

Calibração `[ev]`: aplicadas às 13 corridas reais, dão 4 Sprinter, 3 Equilibrado, 2 Arranque Crescente e 1 de cada
um dos demais. Os limiares são constantes nomeadas em `rules.ts`, para recalibrar no NEXT.

### 4.5 Badges (`facts.badges`, na ordem abaixo)

| id | Rótulo | Regra |
|---|---|---|
| `LARGADA_RELAMPAGO` | Largada Relâmpago | `quality ok` e `t1 ≥ 60` |
| `MENTE_DE_ACO` | Mente de Aço | `quality ok` e `volatility ≤ 10` |
| `VIRADA_MENTAL` | Virada Mental | `quality ok` e `max(d5) ≥ 45` |
| `MODO_FLOW` | Modo Flow | `quality ok` e `focusZonePct ≥ 50` |
| `CALMA_TOTAL` | Calma Total | `quality ok` e `avgMeditation ≥ 55` |
| `FADIGA_ZERO` | Fadiga Zero | `quality ok` e `t3 ≥ t1` |
| `RECORDE_PESSOAL` | Recorde Pessoal | `raceNumber ≥ 2` e, entre as corridas até esta (inclusive), esta tem o maior `avgAttention` ou a menor `durationSeconds`, estritamente |
| `PRIMEIRA_CORRIDA` | Primeira Corrida | `raceNumber = 1` |

### 4.6 Progresso (`facts.progress`)
- `raceNumber`: posição 1-based da corrida em `history`. `totalRaces`: tamanho de `history`.
- `previous`: a corrida imediatamente anterior, ou `null`:
  - `attentionDelta = avgAttention − prev.avgAttention` (1 casa; `null` se algum lado for nulo);
  - `durationDelta = durationSeconds − prev.durationSeconds` (1 casa; negativo = mais rápido).
- `personalBest: { attention: boolean, time: boolean }`: mesma regra do badge `RECORDE_PESSOAL`.

### 4.7 Meta da próxima corrida (`facts.goal`, só com `quality ok`; a primeira que casar)

| # | Condição | Meta (`kind`, `current` → `target`, `unit`) |
|---|---|---|
| 1 | `t1 − t3 ≥ 10` | `final_third`: `round(t3)` → `min(round(t1), round(t3) + 8)`, `pts` |
| 2 | `bestStreakSeconds < 10` | `streak`: `s` → `s + max(3, ceil(0.3·s))`, `s` |
| 3 | `volatility ≥ 15` | `stability`: pior queda `|min(d5)|` → `round(0.7·|min(d5)|)`, `pts` |
| 4 | resto | `average`: `round(avgAttention)` → `min(100, round(avgAttention) + 5)`, `pts` |

Cada `kind` tem **um** exercício fixo em `goal.ts` (`{title, steps}`), escrito sem promessa clínica:
- `final_third` → "Reset no meio da prova": ao passar da metade, uma expiração longa e o olhar volta ao ponto de fuga da pista.
- `streak` → "Âncora visual": escolher um ponto fixo à frente do carro e voltar a ele sempre que notar a mente
  saindo.
- `stability` → "Respiração 4-4-4 antes da largada": 3 ciclos de inspirar 4 s, segurar 4 s, expirar 4 s.
- `average` → "Aquecimento de 30 s": antes de colocar o fone, 30 s contando respirações de 1 a 10.

---

## 5. O texto — narrativa

`CoachNarrative = { headline: string; summary: string; source: "ai" | "template" }`.

### 5.1 Texto-modelo (`templateNarrative`)
- **Determinístico.** `headline` vem de um mapa por arquétipo, ou "Corrida com poucos dados do sensor" se `insufficient`.
- **`summary`:** 2 ou 3 frases montadas a partir de:
  - arquétipo e média;
  - o momento mais marcante (sequência, queda ou recuperação, com o segundo);
  - a evolução, se houver corrida anterior.
- **Sem números** que não estejam em `facts`.

### 5.2 Texto da IA (`aiNarrative`)
- **Quando:** só se `hasValidConsent(user.user_metadata)` e `process.env.GROQ_API_KEY`.
- **Entrada do LLM:** JSON de `facts` sem id, sem data e sem e-mail. Tem rótulos, números arredondados, momentos
  em segundos, progresso, meta e badges.
- **System prompt curto.** Regras:
  - pt-BR;
  - usar só os números do JSON;
  - não falar de ultrapassagem, oponente, posição nem ondas cerebrais;
  - tom de engenheiro de corrida, encorajador;
  - devolver `{"headline","summary"}`.
- **Chamada:** Groq via SDK `openai` (já é dependência). Parâmetros:
  - modelo `process.env.GROQ_MODEL ?? "openai/gpt-oss-120b"`;
  - `response_format: json_object`;
  - `temperature 0.4`;
  - timeout de 8 s.
- **Validação e travas** (qualquer falha lança erro):
  - Zod: `headline` com 10 a 80 caracteres, `summary` com 40 a 400;
  - regex de termos proibidos `/ultrapass|oponente|advers|posi[cç][aã]o|\bbeta\b|\balfa\b|\balpha\b|ondas?\b/i`.
- **Cache:** `unstable_cache(fn, ["neurocoach-narrative", key], { revalidate: false })`.
  - A chave é `key = sha256(JSON(entradaDoLLM) + PROMPT_VERSION + modelo)`.
  - Erro lançado não é cacheado, então a próxima abertura tenta de novo.
- **Falha** (erro, timeout, validação) → `templateNarrative(facts)` e log estruturado `neurocoach_ai_fallback`,
  sem o conteúdo.

---

## 6. A action — `getCoachReportAction(racePlayerId: string)`

```ts
type CoachActionResult =
  | { ok: true; facts: CoachFacts; narrative: CoachNarrative }
  | { ok: false; reason: "unauthenticated" | "not_found" | "error" };
```

- Valida `racePlayerId` como string não vazia de até 64 caracteres. Senão → `not_found`.
- Sessão por `createClient()` de `lib/supabase/server` + `auth.getUser()`.
- Carrega `race_players (id, race_id, player_slot, started_at, finished_at)` e
  `telemetry_points (race_player_id, t, attention, meditation)` pela RLS, as mesmas queries de `app/dashboard/page.tsx`.
  Monta com `buildRaceSummaries` e ordena por `startedAt`.
- Se `racePlayerId` não está na lista → `not_found`. A RLS garante que só aparecem corridas do usuário.
- Exceção inesperada → `{ ok:false, reason:"error" }` com log sem dados.

---

## 7. Interface

- **`CoachPanel`** (client) substitui a seção NeuroCoach do `DashboardClient`.
  - Recebe `racePlayerId` e chama a action ao selecionar a corrida.
  - Guarda os resultados em `Map` por id, para não chamar de novo ao voltar a uma corrida.
  - Estados: carregando (esqueleto); `unauthenticated` → "Sua sessão expirou, entre de novo"; `not_found`/`error`
    → "Não foi possível analisar esta corrida agora".
- **`CoachCard`**, de cima para baixo:
  1. rótulo "NeuroCoach", `headline`, chip do arquétipo;
  2. `summary` + rodapé discreto "texto gerado por IA" ou "resumo automático";
  3. "Momentos da corrida": lista numerada ①②③ com tempo (`m:ss`) e descrição;
  4. evolução em relação à corrida anterior (chips `+7 pts de foco ▲`, `−3,2 s ▲`), quando houver;
  5. badges (ícone + rótulo + descrição no `title`);
  6. "🎯 Próxima corrida": meta (`hoje X → meta Y`) + exercício.
  - Com `insufficient`, mostra headline e summary próprios, sem arquétipo, momentos nem meta.
- **`ReplayChart`** ganha `moments?`:
  - `ReferenceArea` na sequência;
  - `ReferenceDot` com rótulo ①②③ no `t` de cada momento, na altura do attention nesse `t`.
  - Sem `moments`, o gráfico fica como hoje.
- `DashboardClient` passa `facts.moments` da corrida selecionada para o `ReplayChart`, via callback do `CoachPanel`.

---

## 8. Limpeza e documentação

- **Remover:**
  - `lib/ai/**` (action, feature-extractor, prompt, schema, service, mocks, types);
  - `components/ai/**`;
  - `scripts/diagnose-gemini.ts`, `scripts/test-ai-pipeline.ts`;
  - a dependência `@google/generative-ai`.
- **`scripts/diagnose-groq.ts`** → reescrito como `scripts/coach-smoke.ts`: roda o motor numa série sintética,
  chama `aiNarrative` com a chave do `.env.local` e imprime o resultado.
- **`.env.example`:** seção opcional com `GROQ_API_KEY` (e `GROQ_MODEL`), dizendo que sem ela o NeuroCoach usa o texto-modelo.
- **`CLAUDE.md`:** seção "NeuroCoach": pipeline, onde ficam os limiares, regra do consentimento, cache e como
  rodar o smoke.

---

## 9. Testes (Vitest, TDD)

| Arquivo | Prova |
|---|---|
| `lib/coach/series.test.ts` | MA5 com borda, terços com resto, desvio, maior sequência, deltas de 5 |
| `lib/coach/rules.test.ts` | Cada arquétipo com uma série sintética mínima; prioridade entre regras; cada badge (sim/não) |
| `lib/coach/goal.test.ts` | Cada tipo de meta, limites (cap em `t1`, mínimo +3 s, teto 100) |
| `lib/coach/analyze.test.ts` | `insufficient` (0 e 9 amostras); momentos (quantidade, ordem, limiares ±20 e ≥ 3 s); progresso e recorde com histórico; **determinismo** (duas chamadas = igual) |
| `lib/coach/narrative-template.test.ts` | Texto por arquétipo e `insufficient`; sem números fora de `facts` |
| `lib/coach/narrative-ai.test.ts` | SDK e `unstable_cache` falsos: entrada sem id/data/e-mail; termos proibidos → erro; JSON inválido → erro; tamanho |
| `lib/coach/action.test.ts` | Supabase falso: sem sessão; id de outra pessoa; sem consentimento → template sem chamar a IA; sem chave → template; IA falha → template; IA ok → `source:"ai"` |
| `components/coach/CoachCard.test.tsx` | Renderiza momentos, evolução, badges, meta; `insufficient`; rodapé por `source` |
| `components/coach/CoachPanel.test.tsx` | Carregando → card; memo (não chama de novo); estados de erro |
| `lib/consent.test.ts` | Idêntico ao do PR #9 |

Gate: `npm test`, `npm run lint`, `npx tsc --noEmit` (depois de um `next build`) e `npm run build`.

---

## 10. Entrega, coordenação e riscos

- **Um PR** no web-plataform (`feature/neu-115`).
- **PR #9 (NEU-103):** toca `generate-report.action.ts`, `DashboardClient` e o teste do prompt, que esta entrega remove ou reescreve.
  - Ordem recomendada: mergear a 2.0 primeiro.
  - No PR #9, o autor descarta as mudanças em `lib/ai/*` (a 2.0 já tem sessão + consentimento) e mantém o `coachEnabled` só para o aviso.
  - `lib/consent.ts` é idêntico nos dois.
- **Produção (NEU-95):** confirmar na Vercel se `GROQ_API_KEY` existe `[hip]`.
  - Sem ela, o NeuroCoach funciona com o texto-modelo.
  - Depois do deploy, verificar logado com uma conta de teste que o card aparece. Isso é manual e fica registrado no PR.
- **Riscos:**
  - Limiares calibrados com 13 corridas e 4 jogadores: são constantes nomeadas, recalibrar no NEXT com mais dados.
  - `unstable_cache` na Vercel é por deployment `[hip]`: um redeploy pode custar 1 chamada a mais por corrida
    aberta. É aceitável.
  - Contas sem consentimento (todas até o PR #9) veem só o texto-modelo. Na banca, isso é o esperado, com o mesmo conteúdo.
