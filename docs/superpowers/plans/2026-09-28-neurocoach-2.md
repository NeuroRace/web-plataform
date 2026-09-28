# NeuroCoach 2.0 (NEU-115) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a IA Coach atual por um motor determinístico de insights. A IA só escreve o texto, com cache, e o motor não aceita dado do navegador.

**Architecture:**
- `lib/coach/` concentra a lógica:
  - funções puras de série;
  - regras de arquétipo, badges e meta;
  - `analyzeRace`;
  - texto-modelo e texto da IA (Groq, `unstable_cache`);
  - uma server action que recebe só o `racePlayerId` e carrega os dados pela RLS.
- A interface usa um hook com memo por corrida, `CoachPanel`/`CoachCard` e marcadores no `ReplayChart`.
- `lib/ai/`, `components/ai/` e o Gemini saem.

**Tech Stack:** Next.js 16.2.9 (App Router, server actions, `unstable_cache`), React 19, TypeScript strict, Vitest 3 + Testing Library (jsdom), Recharts 3.8, SDK `openai` 7 (apontando para a Groq), Zod 4.

**Spec:** `docs/superpowers/specs/2026-09-28-neurocoach-2-design.md`

## Global Constraints

- **O motor é puro e determinístico:** mesma entrada, mesma saída. Sem `Date.now()` e sem aleatoriedade em `lib/coach/{series,rules,goal,analyze,describe,narrative-template}.ts`.
- **Limiares como constantes nomeadas** (`THRESHOLDS` em `rules.ts`) com os valores da spec §4.4 e §4.5: 45, 60, 10, 15, 55, 10, 60, 10, 45, 50, 55. Momentos: MA de 5 amostras, sequência ≥ 60 com no mínimo 3 amostras, deltas de 5 amostras com |Δ| ≥ 20. Qualidade: < 10 amostras é `insufficient`.
- **A action recebe só `racePlayerId: string`.** Nenhum outro dado vem do cliente.
- **LLM só com `hasValidConsent(user.user_metadata)` e `GROQ_API_KEY`.** O LLM recebe só o `buildLlmInput(facts)`: sem id, data ou e-mail. Devolve só `{headline, summary}`.
- **Termos proibidos em qualquer texto mostrado ao usuário:** `/ultrapass|oponente|advers|posi[cç][aã]o|\bbeta\b|\balfa\b|\balpha\b|\bondas?\b/i`.
- **Limites de tamanho:** `headline` com 10 a 80 caracteres e `summary` com 40 a 400, também no texto-modelo.
- **Idioma:** pt-BR em tudo o que o usuário vê.
- **Contratos existentes:** `lib/metrics.ts` e o schema do Supabase não mudam. Só leitura via RLS.
- **Consentimento:** `lib/consent.ts` e `lib/consent.test.ts` são **byte a byte** os do PR #9 (`git fetch origin pull/9/head` → `FETCH_HEAD`).
- **Gate de cada task:** `npm test` verde. No fim: `npm run lint`, `npm run build`, `npx tsc --noEmit`.
- **Commits** terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Limite de 1000 linhas do PostgREST na telemetria.** Um usuário com muitas corridas teria a série truncada.
   - Esperado: a corrida analisada sempre vem completa.
   - Task 6 carrega a telemetria da corrida selecionada com `.eq("race_player_id", id)` e testa isso.
2. **Número inventado pelo LLM** (ex.: "foco de 87" quando é 56).
   - Esperado: um texto com número que não está nos fatos é descartado e vira texto-modelo.
   - Task 5: `numbersGrounded` + teste.
3. **Leituras nulas intercaladas na série.**
   - Esperado: são ignoradas e o `t` dos momentos continua sendo o segundo real da corrida.
   - Task 3: teste com `null`s.
4. **Corrida sem `finished_at`** (duração nula).
   - Esperado: sem erro; `durationDelta = null` e sem recorde de tempo.
   - Task 3: teste.
5. **Duas corridas com o mesmo `startedAt`.**
   - Esperado: ordem estável (desempate por `racePlayerId`), então o `raceNumber` é determinístico.
   - Task 3: teste.

## Arquivos

| Ação | Caminho | Responsabilidade |
|---|---|---|
| Create | `lib/coach/types.ts` | Tipos compartilhados |
| Create | `lib/coach/series.ts` (+ test) | MA, terços, desvio, sequência, deltas |
| Create | `lib/coach/test-utils.ts` | `makeRace`, `flat`: fixtures consistentes via `buildRaceSummaries` |
| Create | `lib/coach/rules.ts` (+ test) | `THRESHOLDS`, arquétipo, badges, `ARCHETYPE_INFO`, `BADGE_INFO` |
| Create | `lib/coach/goal.ts` (+ test) | `chooseGoal`, `DRILLS` |
| Create | `lib/coach/analyze.ts` (+ test) | `analyzeRace` |
| Create | `lib/coach/describe.ts` (+ test) | `formatClock`, `formatDecimal`, `describeMoment`, `describeGoal`, `MOMENT_SYMBOLS` |
| Create | `lib/coach/narrative-template.ts` (+ test) | `templateNarrative`, `BANNED_TERMS` |
| Create | `lib/consent.ts` (+ test) | Cópia exata do PR #9 |
| Create | `lib/coach/narrative-ai.ts` (+ test) | Prompt, `buildLlmInput`, `parseNarrative`, `numbersGrounded`, `generateAiNarrative`, `cachedAiNarrative` |
| Create | `lib/coach/action.ts` (+ test) | `getCoachReportAction` |
| Create | `components/coach/useCoachReport.ts` (+ test) | Hook com memo por corrida |
| Create | `components/coach/CoachCard.tsx` (+ test) | Apresentação |
| Create | `components/coach/CoachPanel.tsx` (+ test) | Estados (carregando, erro, card) |
| Create | `components/dashboard/replay-markers.ts` (+ test) | Momentos → marcadores do gráfico |
| Modify | `components/dashboard/ReplayChart.tsx` | Prop `moments?` |
| Modify | `components/dashboard/DashboardClient.tsx` | Usa o hook, o painel e os marcadores; remove a IA antiga |
| Delete | `lib/ai/**`, `components/ai/**`, `scripts/diagnose-gemini.ts`, `scripts/diagnose-groq.ts`, `scripts/test-ai-pipeline.ts` | Versão antiga |
| Create | `scripts/coach-smoke.ts` | Smoke manual do motor + Groq |
| Modify | `package.json`/`package-lock.json` | Remove `@google/generative-ai` |
| Modify | `.env.example`, `CLAUDE.md` | Documentação (absorve a NEU-95) |

---

### Task 0: Ambiente e referência

**Files:** nenhum versionado (`.env.local` é gitignored).

- [ ] **Step 1: Instalar e preparar o env**

Run: `npm ci && cp .env.example .env.local`
Expected: `npm ci` termina sem erro.

- [ ] **Step 2: Referência verde**

Run: `npm test 2>&1 | tail -5 && npm run lint && npm run build 2>&1 | tail -3 && npx tsc --noEmit`
Expected: vitest com `Test Files … passed`, lint sem erro, build ok, tsc sem saída. Anote a contagem de testes no ledger. Se algo falhar, **pare** e reporte.

- [ ] **Step 3: Linear** — NEU-115 → In Progress.

---

### Task 1: Tipos e funções de série

**Files:**
- Create: `lib/coach/types.ts`, `lib/coach/series.ts`, `lib/coach/test-utils.ts`
- Test: `lib/coach/series.test.ts`

**Interfaces:**
- Produces:
  - tipos: `Archetype`, `Badge`, `MomentKind`, `Moment`, `GoalKind`, `Drill`, `Goal`, `CoachMetrics`, `CoachProgress`, `CoachFacts`, `CoachNarrative`, `CoachActionResult`;
  - funções: `round1(v)`, `mean(values): number|null`, `movingAverage(values, window=5): number[]`, `thirds(values): [number[],number[],number[]]`, `stdDev(values): number|null`, `longestRunAtOrAbove(values, threshold): {start,end,length}|null`, `windowDeltas(values, lag=5): {index,delta}[]`;
  - fixtures: `makeRace(attention, opts?)`, `flat(v, n)`.

- [ ] **Step 1: Criar os tipos** — `lib/coach/types.ts`:

```ts
/** Tipos do NeuroCoach 2.0 (NEU-115). Spec: docs/superpowers/specs/2026-09-28-neurocoach-2-design.md */

export type Archetype =
  | "EM_AQUECIMENTO"
  | "HIPERFOCADO"
  | "ARRANQUE_CRESCENTE"
  | "SPRINTER"
  | "OSCILADOR"
  | "MESTRE_ZEN"
  | "EQUILIBRADO";

export type Badge =
  | "LARGADA_RELAMPAGO"
  | "MENTE_DE_ACO"
  | "VIRADA_MENTAL"
  | "MODO_FLOW"
  | "CALMA_TOTAL"
  | "FADIGA_ZERO"
  | "RECORDE_PESSOAL"
  | "PRIMEIRA_CORRIDA";

export type MomentKind = "streak" | "drop" | "rise" | "peak";

export interface Moment {
  kind: MomentKind;
  /** Segundo da corrida (desde a largada). */
  t: number;
  /** Fim da sequência — só em `streak`. */
  tEnd?: number;
  /** streak: segundos; drop/rise: variação em pts em 5 s; peak: índice de atenção. */
  value: number;
}

export type GoalKind = "final_third" | "streak" | "stability" | "average";

export interface Drill {
  title: string;
  steps: string;
}

export interface Goal {
  kind: GoalKind;
  current: number;
  target: number;
  unit: "pts" | "s";
  drill: Drill;
}

export interface CoachMetrics {
  avgAttention: number | null;
  peakAttention: number | null;
  focusZonePct: number | null;
  avgMeditation: number | null;
  durationSeconds: number | null;
  /** Média do attention bruto por terço (1 casa). null se `insufficient`. */
  thirds: [number, number, number] | null;
  /** Desvio-padrão da média móvel de 5 amostras (1 casa). null se `insufficient`. */
  volatility: number | null;
  /** Maior sequência com MA5 >= 60, em amostras (~s a 1 Hz). */
  bestStreakSeconds: number;
}

export interface CoachProgress {
  raceNumber: number;
  totalRaces: number;
  previous: { attentionDelta: number | null; durationDelta: number | null } | null;
  personalBest: { attention: boolean; time: boolean };
}

export interface CoachFacts {
  version: 1;
  quality: "ok" | "insufficient";
  sampleCount: number;
  metrics: CoachMetrics;
  moments: Moment[];
  archetype: Archetype | null;
  badges: Badge[];
  progress: CoachProgress;
  goal: Goal | null;
}

export interface CoachNarrative {
  headline: string;
  summary: string;
  source: "ai" | "template";
}

export type CoachActionResult =
  | { ok: true; facts: CoachFacts; narrative: CoachNarrative }
  | { ok: false; reason: "unauthenticated" | "not_found" | "error" };
```

- [ ] **Step 2: Criar os fixtures de teste** — `lib/coach/test-utils.ts`:

```ts
import { buildRaceSummaries, type RaceSummary } from "@/lib/metrics";

/** n amostras iguais a v. */
export const flat = (v: number, n: number): number[] => Array.from({ length: n }, () => v);

/**
 * Corrida consistente (métricas e série via buildRaceSummaries, como na produção):
 * uma amostra por segundo a partir de `startedAt`.
 */
export function makeRace(
  attention: Array<number | null>,
  opts: {
    id?: string;
    startedAt?: string;
    meditation?: number | Array<number | null>;
    /** Duração da corrida; null = corrida sem finished_at. */
    durationSeconds?: number | null;
  } = {},
): RaceSummary {
  const id = opts.id ?? "rp-1";
  const startedAt = opts.startedAt ?? "2026-09-30T17:00:00.000Z";
  const base = Date.parse(startedAt);
  const duration = opts.durationSeconds === undefined ? attention.length : opts.durationSeconds;
  const telemetry = attention.map((a, i) => ({
    race_player_id: id,
    t: new Date(base + i * 1000).toISOString(),
    attention: a,
    meditation: Array.isArray(opts.meditation) ? (opts.meditation[i] ?? null) : (opts.meditation ?? 50),
  }));
  const [race] = buildRaceSummaries(
    [
      {
        id,
        race_id: `race-${id}`,
        player_slot: 1,
        started_at: startedAt,
        finished_at: duration === null ? null : new Date(base + duration * 1000).toISOString(),
      },
    ],
    telemetry,
  );
  return race;
}
```

- [ ] **Step 3: Escrever o teste que falha** — `lib/coach/series.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  longestRunAtOrAbove,
  mean,
  movingAverage,
  round1,
  stdDev,
  thirds,
  windowDeltas,
} from "@/lib/coach/series";

describe("series (NeuroCoach 2.0)", () => {
  it("round1 e mean", () => {
    expect(round1(55.26)).toBe(55.3);
    expect(mean([])).toBeNull();
    expect(mean([40, 60])).toBe(50);
  });

  it("movingAverage usa janela à esquerda e cresce na borda", () => {
    expect(movingAverage([10, 20, 30, 40, 50, 60], 5)).toEqual([10, 15, 20, 25, 30, 40]);
    expect(movingAverage([], 5)).toEqual([]);
  });

  it("thirds divide por índice e manda o resto para o último terço", () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(thirds(v)).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9, 10]]);
  });

  it("stdDev populacional", () => {
    expect(stdDev([])).toBeNull();
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });

  it("longestRunAtOrAbove devolve a maior sequência (a primeira em caso de empate)", () => {
    expect(longestRunAtOrAbove([70, 70, 10, 60, 60, 60, 5, 61, 62, 63], 60)).toEqual({ start: 3, end: 5, length: 3 });
    expect(longestRunAtOrAbove([10, 20], 60)).toBeNull();
    expect(longestRunAtOrAbove([60, 60], 60)).toEqual({ start: 0, end: 1, length: 2 });
  });

  it("windowDeltas compara com 5 amostras atrás", () => {
    expect(windowDeltas([0, 0, 0, 0, 0, 10, 30], 5)).toEqual([
      { index: 5, delta: 10 },
      { index: 6, delta: 30 },
    ]);
    expect(windowDeltas([1, 2, 3], 5)).toEqual([]);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run lib/coach/series.test.ts`
Expected: FAIL com `Failed to resolve import "@/lib/coach/series"`.

- [ ] **Step 5: Implementar** — `lib/coach/series.ts`:

```ts
/** Funções puras de série do NeuroCoach 2.0 (NEU-115). Sem dependências. */

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** Média móvel à esquerda: MA[i] = média de values[max(0, i-window+1)..i]. */
export function movingAverage(values: number[], window = 5): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    out.push(sum / Math.min(i + 1, window));
  }
  return out;
}

/** Divide por índice em 3 partes de floor(n/3); o resto vai para o último terço. */
export function thirds(values: number[]): [number[], number[], number[]] {
  const size = Math.floor(values.length / 3);
  return [values.slice(0, size), values.slice(size, 2 * size), values.slice(2 * size)];
}

/** Desvio-padrão populacional. */
export function stdDev(values: number[]): number | null {
  const m = mean(values);
  if (m === null) return null;
  return Math.sqrt(values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length);
}

/** Maior sequência consecutiva com valor >= threshold (a primeira, em empate). */
export function longestRunAtOrAbove(
  values: number[],
  threshold: number,
): { start: number; end: number; length: number } | null {
  let best: { start: number; end: number; length: number } | null = null;
  let runStart = -1;
  for (let i = 0; i <= values.length; i++) {
    const inRun = i < values.length && values[i] >= threshold;
    if (inRun && runStart === -1) runStart = i;
    if (!inRun && runStart !== -1) {
      const length = i - runStart;
      if (!best || length > best.length) best = { start: runStart, end: i - 1, length };
      runStart = -1;
    }
  }
  return best;
}

/** delta[i] = values[i] - values[i - lag], para i >= lag (índice original preservado). */
export function windowDeltas(values: number[], lag = 5): Array<{ index: number; delta: number }> {
  const out: Array<{ index: number; delta: number }> = [];
  for (let i = lag; i < values.length; i++) out.push({ index: i, delta: values[i] - values[i - lag] });
  return out;
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run lib/coach/series.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 7: Commit**

```bash
git add lib/coach/types.ts lib/coach/series.ts lib/coach/series.test.ts lib/coach/test-utils.ts
git commit -F - <<'EOF'
feat(coach): tipos e funções de série do NeuroCoach 2.0 [NEU-115]

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Regras (arquétipo, badges) e meta

**Files:**
- Create: `lib/coach/rules.ts`, `lib/coach/goal.ts`
- Test: `lib/coach/rules.test.ts`, `lib/coach/goal.test.ts`

**Interfaces:**
- Consumes: `Archetype`, `Badge`, `Goal`, `GoalKind`, `Drill` (Task 1).
- Produces:
  - `THRESHOLDS`;
  - `interface RuleInput { avgAttention: number; avgMeditation: number | null; thirds: [number, number, number]; volatility: number; focusZonePct: number | null; bestRise: number | null }`;
  - `classifyArchetype(x: RuleInput): Archetype`;
  - `performanceBadges(x: RuleInput): Badge[]`;
  - `historyBadges(raceNumber: number, personalBest: {attention: boolean; time: boolean}): Badge[]`;
  - `ARCHETYPE_INFO: Record<Archetype, {label: string; description: string}>`;
  - `BADGE_INFO: Record<Badge, {label: string; icon: string; description: string}>`;
  - `interface GoalInput { thirds: [number, number, number]; bestStreakSeconds: number; volatility: number; worstDrop: number | null; avgAttention: number }`;
  - `chooseGoal(x: GoalInput): Goal`;
  - `DRILLS: Record<GoalKind, Drill>`.

- [ ] **Step 1: Escrever os testes que falham** — `lib/coach/rules.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  ARCHETYPE_INFO,
  BADGE_INFO,
  classifyArchetype,
  historyBadges,
  performanceBadges,
  type RuleInput,
} from "@/lib/coach/rules";

const base: RuleInput = {
  avgAttention: 52,
  avgMeditation: 50,
  thirds: [52, 52, 52],
  volatility: 12,
  focusZonePct: 30,
  bestRise: 10,
};

describe("classifyArchetype — spec §4.4, primeira regra que casar", () => {
  it.each<[string, Partial<RuleInput>, string]>([
    ["média < 45", { avgAttention: 44.9, avgMeditation: 70, volatility: 2 }, "EM_AQUECIMENTO"],
    ["média >= 60", { avgAttention: 60, thirds: [70, 60, 50] }, "HIPERFOCADO"],
    ["terço final >= início + 10", { thirds: [45, 50, 55] }, "ARRANQUE_CRESCENTE"],
    ["início >= terço final + 10", { thirds: [60, 50, 50] }, "SPRINTER"],
    ["volatilidade >= 15", { volatility: 15 }, "OSCILADOR"],
    ["calma >= 55 e volatilidade < 10", { avgMeditation: 55, volatility: 9.9 }, "MESTRE_ZEN"],
    ["resto", {}, "EQUILIBRADO"],
    ["calma alta mas volátil não é zen", { avgMeditation: 70, volatility: 12 }, "EQUILIBRADO"],
  ])("%s", (_, patch, expected) => {
    expect(classifyArchetype({ ...base, ...patch })).toBe(expected);
  });
});

describe("performanceBadges — spec §4.5", () => {
  it("nenhum badge no caso médio", () => {
    expect(performanceBadges({ ...base, thirds: [52, 52, 50] })).toEqual([]);
  });

  it("todos os de desempenho, na ordem da spec", () => {
    expect(
      performanceBadges({
        avgAttention: 62,
        avgMeditation: 55,
        thirds: [60, 62, 64],
        volatility: 10,
        focusZonePct: 50,
        bestRise: 45,
      }),
    ).toEqual(["LARGADA_RELAMPAGO", "MENTE_DE_ACO", "VIRADA_MENTAL", "MODO_FLOW", "CALMA_TOTAL", "FADIGA_ZERO"]);
  });

  it("limiares são inclusivos e param logo abaixo", () => {
    expect(performanceBadges({ ...base, thirds: [59.9, 50, 50] })).not.toContain("LARGADA_RELAMPAGO");
    expect(performanceBadges({ ...base, volatility: 10.1 })).not.toContain("MENTE_DE_ACO");
    expect(performanceBadges({ ...base, bestRise: 44.9 })).not.toContain("VIRADA_MENTAL");
    expect(performanceBadges({ ...base, bestRise: null })).not.toContain("VIRADA_MENTAL");
    expect(performanceBadges({ ...base, focusZonePct: null })).not.toContain("MODO_FLOW");
    expect(performanceBadges({ ...base, avgMeditation: null })).not.toContain("CALMA_TOTAL");
  });
});

describe("historyBadges", () => {
  it("primeira corrida", () => {
    expect(historyBadges(1, { attention: false, time: false })).toEqual(["PRIMEIRA_CORRIDA"]);
  });
  it("recorde pessoal a partir da 2ª corrida", () => {
    expect(historyBadges(2, { attention: true, time: false })).toEqual(["RECORDE_PESSOAL"]);
    expect(historyBadges(3, { attention: false, time: true })).toEqual(["RECORDE_PESSOAL"]);
    expect(historyBadges(3, { attention: false, time: false })).toEqual([]);
  });
});

describe("rótulos", () => {
  it("todo arquétipo e badge tem rótulo e descrição em pt-BR", () => {
    for (const info of Object.values(ARCHETYPE_INFO)) {
      expect(info.label.length).toBeGreaterThan(3);
      expect(info.description.length).toBeGreaterThan(10);
    }
    for (const info of Object.values(BADGE_INFO)) {
      expect(info.label.length).toBeGreaterThan(3);
      expect(info.icon.length).toBeGreaterThan(0);
    }
  });
});
```

`lib/coach/goal.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { DRILLS, chooseGoal, type GoalInput } from "@/lib/coach/goal";

const base: GoalInput = {
  thirds: [55, 55, 55],
  bestStreakSeconds: 12,
  volatility: 5,
  worstDrop: -8,
  avgAttention: 57.4,
};

describe("chooseGoal — spec §4.7, primeira regra que casar", () => {
  it("terço final: queda >= 10 do início ao fim", () => {
    expect(chooseGoal({ ...base, thirds: [70, 55, 50] })).toEqual({
      kind: "final_third", current: 50, target: 58, unit: "pts", drill: DRILLS.final_third,
    });
  });

  it("sequência: melhor sequência < 10 s → +30% (mínimo +3 s)", () => {
    expect(chooseGoal({ ...base, bestStreakSeconds: 4 })).toMatchObject({ kind: "streak", current: 4, target: 7, unit: "s" });
    expect(chooseGoal({ ...base, bestStreakSeconds: 0 })).toMatchObject({ current: 0, target: 3 });
    expect(chooseGoal({ ...base, bestStreakSeconds: 9 })).toMatchObject({ current: 9, target: 12 });
  });

  it("estabilidade: volatilidade >= 15 → reduzir a pior queda em 30%", () => {
    expect(chooseGoal({ ...base, volatility: 18, worstDrop: -40 })).toEqual({
      kind: "stability", current: 40, target: 28, unit: "pts", drill: DRILLS.stability,
    });
  });

  it("estabilidade exige uma queda de verdade; senão cai na média", () => {
    expect(chooseGoal({ ...base, volatility: 18, worstDrop: 3 })).toMatchObject({ kind: "average" });
    expect(chooseGoal({ ...base, volatility: 18, worstDrop: null })).toMatchObject({ kind: "average" });
  });

  it("média: +5 pts, teto 100", () => {
    expect(chooseGoal(base)).toEqual({ kind: "average", current: 57, target: 62, unit: "pts", drill: DRILLS.average });
    expect(chooseGoal({ ...base, avgAttention: 98 })).toMatchObject({ current: 98, target: 100 });
  });

  it("todo exercício tem título e passos", () => {
    for (const d of Object.values(DRILLS)) {
      expect(d.title.length).toBeGreaterThan(3);
      expect(d.steps.length).toBeGreaterThan(20);
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/coach/rules.test.ts lib/coach/goal.test.ts`
Expected: FAIL com `Failed to resolve import "@/lib/coach/rules"` e `"@/lib/coach/goal"`.

- [ ] **Step 3: Implementar** — `lib/coach/rules.ts`:

```ts
import type { Archetype, Badge } from "./types";

/**
 * Limiares do NeuroCoach 2.0 (spec §4.4/§4.5). Calibrados em 28/09 com as 13 corridas
 * reais de produção (só agregados). Recalibrar no NEXT com mais dados.
 */
export const THRESHOLDS = {
  lowAttention: 45,
  highAttention: 60,
  thirdsSwing: 10,
  volatile: 15,
  zenMeditation: 55,
  zenVolatility: 10,
  lightningStart: 60,
  steelVolatility: 10,
  comeback: 45,
  flowZone: 50,
  calmMeditation: 55,
} as const;

export interface RuleInput {
  avgAttention: number;
  avgMeditation: number | null;
  thirds: [number, number, number];
  volatility: number;
  focusZonePct: number | null;
  /** Maior subida da MA5 em 5 amostras. */
  bestRise: number | null;
}

export function classifyArchetype(x: RuleInput): Archetype {
  const [t1, , t3] = x.thirds;
  if (x.avgAttention < THRESHOLDS.lowAttention) return "EM_AQUECIMENTO";
  if (x.avgAttention >= THRESHOLDS.highAttention) return "HIPERFOCADO";
  if (t3 - t1 >= THRESHOLDS.thirdsSwing) return "ARRANQUE_CRESCENTE";
  if (t1 - t3 >= THRESHOLDS.thirdsSwing) return "SPRINTER";
  if (x.volatility >= THRESHOLDS.volatile) return "OSCILADOR";
  if ((x.avgMeditation ?? 0) >= THRESHOLDS.zenMeditation && x.volatility < THRESHOLDS.zenVolatility) {
    return "MESTRE_ZEN";
  }
  return "EQUILIBRADO";
}

export function performanceBadges(x: RuleInput): Badge[] {
  const [t1, , t3] = x.thirds;
  const out: Badge[] = [];
  if (t1 >= THRESHOLDS.lightningStart) out.push("LARGADA_RELAMPAGO");
  if (x.volatility <= THRESHOLDS.steelVolatility) out.push("MENTE_DE_ACO");
  if (x.bestRise !== null && x.bestRise >= THRESHOLDS.comeback) out.push("VIRADA_MENTAL");
  if (x.focusZonePct !== null && x.focusZonePct >= THRESHOLDS.flowZone) out.push("MODO_FLOW");
  if (x.avgMeditation !== null && x.avgMeditation >= THRESHOLDS.calmMeditation) out.push("CALMA_TOTAL");
  if (t3 >= t1) out.push("FADIGA_ZERO");
  return out;
}

export function historyBadges(
  raceNumber: number,
  personalBest: { attention: boolean; time: boolean },
): Badge[] {
  if (raceNumber === 1) return ["PRIMEIRA_CORRIDA"];
  return personalBest.attention || personalBest.time ? ["RECORDE_PESSOAL"] : [];
}

export const ARCHETYPE_INFO: Record<Archetype, { label: string; description: string }> = {
  EM_AQUECIMENTO: { label: "Em Aquecimento", description: "Foco médio abaixo de 45: a mente ainda pegando o ritmo." },
  HIPERFOCADO: { label: "Hiperfocado", description: "Foco médio de 60 ou mais durante a corrida." },
  ARRANQUE_CRESCENTE: { label: "Arranque Crescente", description: "Terminou pelo menos 10 pontos mais focado do que começou." },
  SPRINTER: { label: "Sprinter", description: "Começou forte e perdeu pelo menos 10 pontos até o fim." },
  OSCILADOR: { label: "Oscilador", description: "Foco em altos e baixos, com variação forte ao longo da corrida." },
  MESTRE_ZEN: { label: "Mestre Zen", description: "Calma alta e foco muito estável." },
  EQUILIBRADO: { label: "Equilibrado", description: "Foco estável, sem grandes quedas nem arrancadas." },
};

export const BADGE_INFO: Record<Badge, { label: string; icon: string; description: string }> = {
  LARGADA_RELAMPAGO: { label: "Largada Relâmpago", icon: "⚡", description: "Foco médio de 60+ no primeiro terço." },
  MENTE_DE_ACO: { label: "Mente de Aço", icon: "🛡️", description: "Foco muito estável do começo ao fim." },
  VIRADA_MENTAL: { label: "Virada Mental", icon: "🔄", description: "Recuperou 45+ pontos de foco em 5 s." },
  MODO_FLOW: { label: "Modo Flow", icon: "🌊", description: "Metade ou mais da corrida na zona de foco." },
  CALMA_TOTAL: { label: "Calma Total", icon: "🧘", description: "Índice de calma médio de 55+." },
  FADIGA_ZERO: { label: "Fadiga Zero", icon: "🔋", description: "Terminou tão focado quanto começou." },
  RECORDE_PESSOAL: { label: "Recorde Pessoal", icon: "🏆", description: "Seu melhor foco ou seu melhor tempo até aqui." },
  PRIMEIRA_CORRIDA: { label: "Primeira Corrida", icon: "🏁", description: "Sua primeira corrida no NeuroRace." },
};
```

`lib/coach/goal.ts`:

```ts
import type { Drill, Goal, GoalKind } from "./types";

/** Um exercício por tipo de meta — texto fixo do time, sem promessa clínica (spec §4.7). */
export const DRILLS: Record<GoalKind, Drill> = {
  final_third: {
    title: "Reset no meio da prova",
    steps: "Quando passar da metade da corrida, solte uma expiração longa pela boca e volte o olhar para o ponto de fuga da pista.",
  },
  streak: {
    title: "Âncora visual",
    steps: "Escolha um ponto fixo logo à frente do carro e volte a ele sempre que perceber a mente saindo da corrida.",
  },
  stability: {
    title: "Respiração 4-4-4 antes da largada",
    steps: "Antes de largar, faça 3 ciclos: inspire em 4 s, segure por 4 s e expire em 4 s.",
  },
  average: {
    title: "Aquecimento de 30 s",
    steps: "Antes de colocar o fone, passe 30 s contando as respirações de 1 a 10, recomeçando se perder a conta.",
  },
};

export interface GoalInput {
  thirds: [number, number, number];
  bestStreakSeconds: number;
  volatility: number;
  /** Pior variação da MA5 em 5 amostras (negativa = queda). */
  worstDrop: number | null;
  avgAttention: number;
}

export function chooseGoal(x: GoalInput): Goal {
  const [t1, , t3] = x.thirds;
  if (t1 - t3 >= 10) {
    const current = Math.round(t3);
    return { kind: "final_third", current, target: Math.min(Math.round(t1), current + 8), unit: "pts", drill: DRILLS.final_third };
  }
  if (x.bestStreakSeconds < 10) {
    const s = x.bestStreakSeconds;
    return { kind: "streak", current: s, target: s + Math.max(3, Math.ceil(0.3 * s)), unit: "s", drill: DRILLS.streak };
  }
  if (x.volatility >= 15 && x.worstDrop !== null && x.worstDrop < 0) {
    const current = Math.round(Math.abs(x.worstDrop));
    return { kind: "stability", current, target: Math.round(0.7 * current), unit: "pts", drill: DRILLS.stability };
  }
  const current = Math.round(x.avgAttention);
  return { kind: "average", current, target: Math.min(100, current + 5), unit: "pts", drill: DRILLS.average };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/coach/rules.test.ts lib/coach/goal.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/coach/rules.ts lib/coach/rules.test.ts lib/coach/goal.ts lib/coach/goal.test.ts
git commit -F - <<'EOF'
feat(coach): arquétipo, badges e meta determinísticos, calibrados no dado real [NEU-115]

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: `analyzeRace`

**Files:**
- Create: `lib/coach/analyze.ts`
- Test: `lib/coach/analyze.test.ts`

**Interfaces:**
- Consumes: Tasks 1 e 2 (series, rules, goal, types, test-utils).
- Produces: `analyzeRace(race: RaceSummary, history: RaceSummary[]): CoachFacts`, `MIN_SAMPLES = 10`.

- [ ] **Step 1: Escrever o teste que falha** — `lib/coach/analyze.test.ts`.

Série de referência dos momentos, calculada à mão (índice = segundo):
- a série `M` tem 5×40, 12×70, 6×20 e 7×75;
- a MA5 ≥ 60 vai de 8 a 17 (10 amostras);
- o menor `d5` é −50 no índice 21 e o maior é +55 no índice 27;
- terços: 55 / 55 / 58,5.

```ts
import { describe, it, expect } from "vitest";
import { analyzeRace, MIN_SAMPLES } from "@/lib/coach/analyze";
import { flat, makeRace } from "@/lib/coach/test-utils";

const M = [...flat(40, 5), ...flat(70, 12), ...flat(20, 6), ...flat(75, 7)];

describe("analyzeRace — qualidade (spec §4.1)", () => {
  it(`menos de ${MIN_SAMPLES} amostras → insufficient, sem arquétipo, momentos nem meta`, () => {
    const race = makeRace(flat(60, 9));
    const f = analyzeRace(race, [race]);
    expect(f.quality).toBe("insufficient");
    expect(f.sampleCount).toBe(9);
    expect(f.archetype).toBeNull();
    expect(f.moments).toEqual([]);
    expect(f.goal).toBeNull();
    expect(f.metrics.thirds).toBeNull();
    expect(f.badges).toEqual(["PRIMEIRA_CORRIDA"]);
  });

  it("corrida sem nenhuma amostra também é insufficient", () => {
    const race = makeRace([]);
    expect(analyzeRace(race, [race])).toMatchObject({ quality: "insufficient", sampleCount: 0 });
  });
});

describe("analyzeRace — métricas e momentos (spec §4.2/§4.3)", () => {
  const race = makeRace(M);
  const f = analyzeRace(race, [race]);

  it("métricas", () => {
    expect(f.quality).toBe("ok");
    expect(f.sampleCount).toBe(30);
    expect(f.metrics.thirds).toEqual([55, 55, 58.5]);
    expect(f.metrics.bestStreakSeconds).toBe(10);
    expect(f.metrics.avgAttention).toBe(race.metrics.avgAttention);
  });

  it("momentos: sequência 8–17, queda −50 aos 21 s e recuperação +55 aos 27 s, em ordem de tempo", () => {
    expect(f.moments).toEqual([
      { kind: "streak", t: 8, tEnd: 17, value: 10 },
      { kind: "drop", t: 21, value: -50 },
      { kind: "rise", t: 27, value: 55 },
    ]);
  });

  it("badge de virada (recuperação ≥ 45)", () => {
    expect(f.badges).toContain("VIRADA_MENTAL");
  });

  it("pico entra quando há menos de 3 momentos", () => {
    const series = flat(50, 20);
    series[7] = 90;
    const r = makeRace(series);
    expect(analyzeRace(r, [r]).moments).toEqual([{ kind: "peak", t: 7, value: 90 }]);
  });

  it("leituras nulas são ignoradas e os momentos mantêm o segundo real", () => {
    const withNulls: Array<number | null> = [null, null, ...M];
    const r = makeRace(withNulls);
    const moments = analyzeRace(r, [r]).moments;
    expect(moments.map((m) => m.t)).toEqual([10, 23, 29]);
  });

  it("é determinístico", () => {
    expect(analyzeRace(race, [race])).toEqual(analyzeRace(race, [race]));
  });
});

describe("analyzeRace — arquétipo ponta a ponta", () => {
  it.each<[string, number[], number, string]>([
    ["em aquecimento", flat(40, 30), 50, "EM_AQUECIMENTO"],
    ["hiperfocado", flat(70, 30), 50, "HIPERFOCADO"],
    ["arranque crescente", [...flat(45, 10), ...flat(50, 10), ...flat(60, 10)], 50, "ARRANQUE_CRESCENTE"],
    ["sprinter", [...flat(60, 10), ...flat(50, 10), ...flat(45, 10)], 50, "SPRINTER"],
    ["oscilador", Array.from({ length: 30 }, (_, i) => (i % 10 < 5 ? 80 : 25)), 50, "OSCILADOR"],
    ["mestre zen", flat(55, 30), 60, "MESTRE_ZEN"],
    ["equilibrado", flat(55, 30), 50, "EQUILIBRADO"],
  ])("%s", (_, attention, meditation, expected) => {
    const r = makeRace(attention, { meditation });
    expect(analyzeRace(r, [r]).archetype).toBe(expected);
  });
});

describe("analyzeRace — progresso (spec §4.6)", () => {
  const r1 = makeRace(flat(50, 20), { id: "r1", startedAt: "2026-09-30T17:00:00.000Z", durationSeconds: 70 });
  const r2 = makeRace(flat(60, 20), { id: "r2", startedAt: "2026-09-30T17:10:00.000Z", durationSeconds: 60 });
  const r3 = makeRace(flat(55, 20), { id: "r3", startedAt: "2026-09-30T17:20:00.000Z", durationSeconds: 65 });
  const history = [r3, r1, r2]; // fora de ordem de propósito

  it("primeira corrida: sem anterior, badge de primeira", () => {
    const f = analyzeRace(r1, history);
    expect(f.progress).toEqual({ raceNumber: 1, totalRaces: 3, previous: null, personalBest: { attention: false, time: false } });
    expect(f.badges).toContain("PRIMEIRA_CORRIDA");
  });

  it("segunda corrida: melhorou foco e tempo → recorde pessoal", () => {
    const f = analyzeRace(r2, history);
    expect(f.progress).toEqual({
      raceNumber: 2, totalRaces: 3,
      previous: { attentionDelta: 10, durationDelta: -10 },
      personalBest: { attention: true, time: true },
    });
    expect(f.badges).toContain("RECORDE_PESSOAL");
  });

  it("terceira corrida: piorou em relação à anterior e não é recorde", () => {
    const f = analyzeRace(r3, history);
    expect(f.progress.previous).toEqual({ attentionDelta: -5, durationDelta: 5 });
    expect(f.progress.personalBest).toEqual({ attention: false, time: false });
    expect(f.badges).not.toContain("RECORDE_PESSOAL");
  });

  it("corrida sem finished_at: durationDelta nulo e sem recorde de tempo", () => {
    const open = makeRace(flat(70, 20), { id: "r4", startedAt: "2026-09-30T17:30:00.000Z", durationSeconds: null });
    const f = analyzeRace(open, [...history, open]);
    expect(f.progress.previous).toEqual({ attentionDelta: 15, durationDelta: null });
    expect(f.progress.personalBest).toEqual({ attention: true, time: false });
  });

  it("empate de startedAt: ordem estável por id", () => {
    const a = makeRace(flat(50, 20), { id: "a", startedAt: "2026-09-30T18:00:00.000Z" });
    const b = makeRace(flat(50, 20), { id: "b", startedAt: "2026-09-30T18:00:00.000Z" });
    expect(analyzeRace(b, [b, a]).progress.raceNumber).toBe(2);
    expect(analyzeRace(a, [b, a]).progress.raceNumber).toBe(1);
  });

  it("a meta vem do motor quando a qualidade é ok", () => {
    const f = analyzeRace(makeRace(M), [makeRace(M)]);
    expect(f.goal).not.toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/coach/analyze.test.ts`
Expected: FAIL com `Failed to resolve import "@/lib/coach/analyze"`.

- [ ] **Step 3: Implementar** — `lib/coach/analyze.ts`:

```ts
import type { RaceSummary } from "@/lib/metrics";
import { chooseGoal } from "./goal";
import { classifyArchetype, historyBadges, performanceBadges, type RuleInput } from "./rules";
import { longestRunAtOrAbove, mean, movingAverage, round1, stdDev, thirds, windowDeltas } from "./series";
import type { CoachFacts, CoachMetrics, CoachProgress, Moment } from "./types";

/** Menos que isto é "dados insuficientes" (spec §4.1). */
export const MIN_SAMPLES = 10;
const SMOOTH_WINDOW = 5;
const STREAK_THRESHOLD = 60;
const MIN_STREAK_MOMENT = 3;
const MOMENT_DELTA = 20;

function diff(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : round1(a - b);
}

function chronological(history: RaceSummary[]): RaceSummary[] {
  return [...history].sort(
    (a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.racePlayerId.localeCompare(b.racePlayerId),
  );
}

function buildProgress(race: RaceSummary, history: RaceSummary[]): CoachProgress {
  const ordered = chronological(history);
  const idx = ordered.findIndex((r) => r.racePlayerId === race.racePlayerId);
  const upTo = idx >= 0 ? ordered.slice(0, idx + 1) : [race];
  const raceNumber = upTo.length;
  const prev = raceNumber >= 2 ? upTo[raceNumber - 2] : null;
  const others = upTo.slice(0, -1);

  const att = race.metrics.avgAttention;
  const dur = race.metrics.durationSeconds;
  const othersAtt = others.map((o) => o.metrics.avgAttention).filter((v): v is number => v !== null);
  const othersDur = others.map((o) => o.metrics.durationSeconds).filter((v): v is number => v !== null);

  return {
    raceNumber,
    totalRaces: idx >= 0 ? ordered.length : 1,
    previous: prev
      ? {
          attentionDelta: diff(att, prev.metrics.avgAttention),
          durationDelta: diff(dur, prev.metrics.durationSeconds),
        }
      : null,
    personalBest: {
      attention: raceNumber >= 2 && att !== null && othersAtt.length > 0 && othersAtt.every((o) => att > o),
      time: raceNumber >= 2 && dur !== null && othersDur.length > 0 && othersDur.every((o) => dur < o),
    },
  };
}

export function analyzeRace(race: RaceSummary, history: RaceSummary[]): CoachFacts {
  const points = race.series
    .filter((p): p is { t: number; attention: number; meditation: number | null } => p.attention !== null)
    .sort((a, b) => a.t - b.t);
  const att = points.map((p) => p.attention);
  const n = att.length;
  const progress = buildProgress(race, history);
  const pastBadges = historyBadges(progress.raceNumber, progress.personalBest);

  const baseMetrics = {
    avgAttention: race.metrics.avgAttention,
    peakAttention: race.metrics.peakAttention,
    focusZonePct: race.metrics.focusZonePct,
    avgMeditation: race.metrics.avgMeditation,
    durationSeconds: race.metrics.durationSeconds,
  };

  if (n < MIN_SAMPLES) {
    return {
      version: 1,
      quality: "insufficient",
      sampleCount: n,
      metrics: { ...baseMetrics, thirds: null, volatility: null, bestStreakSeconds: 0 },
      moments: [],
      archetype: null,
      badges: pastBadges,
      progress,
      goal: null,
    };
  }

  const ma = movingAverage(att, SMOOTH_WINDOW);
  const [p1, p2, p3] = thirds(att);
  const th: [number, number, number] = [round1(mean(p1)!), round1(mean(p2)!), round1(mean(p3)!)];
  const volatility = round1(stdDev(ma)!);
  const run = longestRunAtOrAbove(ma, STREAK_THRESHOLD);
  const deltas = windowDeltas(ma, SMOOTH_WINDOW);
  const worst = deltas.reduce<{ index: number; delta: number } | null>((m, d) => (!m || d.delta < m.delta ? d : m), null);
  const best = deltas.reduce<{ index: number; delta: number } | null>((m, d) => (!m || d.delta > m.delta ? d : m), null);

  const candidates: Moment[] = [];
  if (run && run.length >= MIN_STREAK_MOMENT) {
    candidates.push({ kind: "streak", t: points[run.start].t, tEnd: points[run.end].t, value: run.length });
  }
  if (worst && worst.delta <= -MOMENT_DELTA) {
    candidates.push({ kind: "drop", t: points[worst.index].t, value: Math.round(worst.delta) });
  }
  if (best && best.delta >= MOMENT_DELTA) {
    candidates.push({ kind: "rise", t: points[best.index].t, value: Math.round(best.delta) });
  }
  if (candidates.length < 3) {
    const peak = Math.max(...att);
    const i = att.indexOf(peak);
    candidates.push({ kind: "peak", t: points[i].t, value: peak });
  }
  const moments = candidates.slice(0, 3).sort((a, b) => a.t - b.t);

  const metrics: CoachMetrics = {
    ...baseMetrics,
    thirds: th,
    volatility,
    bestStreakSeconds: run?.length ?? 0,
  };
  const avgAttention = baseMetrics.avgAttention ?? mean(att)!;
  const input: RuleInput = {
    avgAttention,
    avgMeditation: baseMetrics.avgMeditation,
    thirds: th,
    volatility,
    focusZonePct: baseMetrics.focusZonePct,
    bestRise: best?.delta ?? null,
  };

  return {
    version: 1,
    quality: "ok",
    sampleCount: n,
    metrics,
    moments,
    archetype: classifyArchetype(input),
    badges: [...performanceBadges(input), ...pastBadges],
    progress,
    goal: chooseGoal({
      thirds: th,
      bestStreakSeconds: metrics.bestStreakSeconds,
      volatility,
      worstDrop: worst?.delta ?? null,
      avgAttention,
    }),
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/coach/analyze.test.ts`
Expected: PASS. Se um valor calculado à mão divergir, o erro está na conta do teste **ou** no código. Refaça a conta antes de mexer no código e registre uma ruling se o teste mudar.

- [ ] **Step 5: Commit**

```bash
git add lib/coach/analyze.ts lib/coach/analyze.test.ts
git commit -F - <<'EOF'
feat(coach): analyzeRace — momentos da corrida, evolução e meta, determinísticos [NEU-115]

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Descrições e texto-modelo

**Files:**
- Create: `lib/coach/describe.ts`, `lib/coach/narrative-template.ts`
- Test: `lib/coach/describe.test.ts`, `lib/coach/narrative-template.test.ts`

**Interfaces:**
- Consumes: `CoachFacts`, `Moment`, `Goal`, `ARCHETYPE_INFO` (Tasks 1 a 3).
- Produces:
  - `formatClock(t: number): string`, no formato `m:ss`;
  - `formatDecimal(v: number): string`, com vírgula decimal;
  - `MOMENT_SYMBOLS = ["①","②","③"]`;
  - `describeMoment(m: Moment): string`;
  - `describeGoal(g: Goal): string`;
  - `BANNED_TERMS: RegExp`;
  - `templateNarrative(facts: CoachFacts): CoachNarrative`, com `source: "template"`.

- [ ] **Step 1: Escrever os testes que falham** — `lib/coach/describe.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { describeGoal, describeMoment, formatClock, formatDecimal, MOMENT_SYMBOLS } from "@/lib/coach/describe";
import { DRILLS } from "@/lib/coach/goal";

describe("describe (NeuroCoach 2.0)", () => {
  it("formatClock e formatDecimal", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(75)).toBe("1:15");
    expect(formatDecimal(-3.2)).toBe("-3,2");
    expect(MOMENT_SYMBOLS).toEqual(["①", "②", "③"]);
  });

  it("describeMoment", () => {
    expect(describeMoment({ kind: "streak", t: 8, tEnd: 17, value: 10 })).toBe("0:08–0:17 · 10 s seguidos em foco alto");
    expect(describeMoment({ kind: "drop", t: 21, value: -50 })).toBe("0:21 · o foco caiu 50 pts em 5 s");
    expect(describeMoment({ kind: "rise", t: 27, value: 55 })).toBe("0:27 · recuperou 55 pts de foco em 5 s");
    expect(describeMoment({ kind: "peak", t: 7, value: 90 })).toBe("0:07 · pico de atenção: 90");
  });

  it("describeGoal", () => {
    expect(describeGoal({ kind: "final_third", current: 50, target: 58, unit: "pts", drill: DRILLS.final_third }))
      .toBe("Chegue ao terço final com foco médio de 58 (hoje: 50)");
    expect(describeGoal({ kind: "streak", current: 4, target: 7, unit: "s", drill: DRILLS.streak }))
      .toBe("Segure o foco alto por 7 s seguidos (hoje: 4 s)");
    expect(describeGoal({ kind: "stability", current: 40, target: 28, unit: "pts", drill: DRILLS.stability }))
      .toBe("Evite quedas de foco maiores que 28 pts em 5 s (hoje: 40)");
    expect(describeGoal({ kind: "average", current: 57, target: 62, unit: "pts", drill: DRILLS.average }))
      .toBe("Suba seu foco médio para 62 (hoje: 57)");
  });
});
```

`lib/coach/narrative-template.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { analyzeRace } from "@/lib/coach/analyze";
import { BANNED_TERMS, templateNarrative } from "@/lib/coach/narrative-template";
import { flat, makeRace } from "@/lib/coach/test-utils";

const M = [...flat(40, 5), ...flat(70, 12), ...flat(20, 6), ...flat(75, 7)];

describe("templateNarrative (spec §5.1)", () => {
  it("usa arquétipo, média, o momento mais marcante e a primeira corrida", () => {
    const race = makeRace(M);
    const n = templateNarrative(analyzeRace(race, [race]));
    expect(n.source).toBe("template");
    expect(n.headline).toBe("Foco em altos e baixos: picos rápidos e quedas rápidas");
    expect(n.summary).toContain("Seu índice médio de atenção foi 56");
    expect(n.summary).toContain("de 0:08 a 0:17, 10 s seguidos com foco alto");
    expect(n.summary).toContain("primeira corrida");
  });

  it("menciona a evolução quando há corrida anterior", () => {
    const r1 = makeRace(flat(50, 20), { id: "r1", startedAt: "2026-09-30T17:00:00.000Z" });
    const r2 = makeRace(flat(60, 20), { id: "r2", startedAt: "2026-09-30T17:10:00.000Z" });
    expect(templateNarrative(analyzeRace(r2, [r1, r2])).summary).toContain("seu foco médio subiu 10 pontos");
  });

  it("insufficient explica o problema do sensor", () => {
    const race = makeRace(flat(60, 9));
    const n = templateNarrative(analyzeRace(race, [race]));
    expect(n.headline).toBe("Corrida com poucos dados do sensor");
    expect(n.summary).toContain("só 9 leituras");
  });

  it("todo texto-modelo respeita tamanho e termos proibidos", () => {
    const series = [
      flat(40, 30), flat(70, 30), [...flat(45, 10), ...flat(50, 10), ...flat(60, 10)],
      [...flat(60, 10), ...flat(50, 10), ...flat(45, 10)], M, flat(55, 30), flat(60, 3),
    ];
    for (const s of series) {
      for (const meditation of [50, 60]) {
        const r = makeRace(s, { meditation });
        const n = templateNarrative(analyzeRace(r, [r]));
        expect(n.headline.length).toBeGreaterThanOrEqual(10);
        expect(n.headline.length).toBeLessThanOrEqual(80);
        expect(n.summary.length).toBeGreaterThanOrEqual(40);
        expect(n.summary.length).toBeLessThanOrEqual(400);
        expect(`${n.headline} ${n.summary}`).not.toMatch(BANNED_TERMS);
      }
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/coach/describe.test.ts lib/coach/narrative-template.test.ts`
Expected: FAIL com `Failed to resolve import "@/lib/coach/describe"`.

- [ ] **Step 3: Implementar** — `lib/coach/describe.ts`:

```ts
import type { Goal, Moment } from "./types";

export const MOMENT_SYMBOLS = ["①", "②", "③"] as const;

export function formatClock(t: number): string {
  const s = Math.max(0, Math.round(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatDecimal(v: number): string {
  return String(v).replace(".", ",");
}

export function describeMoment(m: Moment): string {
  switch (m.kind) {
    case "streak":
      return `${formatClock(m.t)}–${formatClock(m.tEnd ?? m.t)} · ${m.value} s seguidos em foco alto`;
    case "drop":
      return `${formatClock(m.t)} · o foco caiu ${Math.abs(m.value)} pts em 5 s`;
    case "rise":
      return `${formatClock(m.t)} · recuperou ${m.value} pts de foco em 5 s`;
    case "peak":
      return `${formatClock(m.t)} · pico de atenção: ${m.value}`;
  }
}

export function describeGoal(g: Goal): string {
  switch (g.kind) {
    case "final_third":
      return `Chegue ao terço final com foco médio de ${g.target} (hoje: ${g.current})`;
    case "streak":
      return `Segure o foco alto por ${g.target} s seguidos (hoje: ${g.current} s)`;
    case "stability":
      return `Evite quedas de foco maiores que ${g.target} pts em 5 s (hoje: ${g.current})`;
    case "average":
      return `Suba seu foco médio para ${g.target} (hoje: ${g.current})`;
  }
}
```

`lib/coach/narrative-template.ts`:

```ts
import { formatClock, formatDecimal } from "./describe";
import type { Archetype, CoachFacts, CoachNarrative, Moment } from "./types";

/** Termos que nenhum texto mostrado ao usuário pode ter (spec §2.8): não existem nos dados. */
export const BANNED_TERMS = /ultrapass|oponente|advers|posi[cç][aã]o|\bbeta\b|\balfa\b|\balpha\b|\bondas?\b/i;

const HEADLINES: Record<Archetype, string> = {
  EM_AQUECIMENTO: "Corrida de aquecimento: a mente ainda pegando o ritmo",
  HIPERFOCADO: "Foco lá em cima durante quase toda a corrida",
  ARRANQUE_CRESCENTE: "Você terminou mais forte do que começou",
  SPRINTER: "Largada forte, com o foco caindo na reta final",
  OSCILADOR: "Foco em altos e baixos: picos rápidos e quedas rápidas",
  MESTRE_ZEN: "Calma e constância do começo ao fim",
  EQUILIBRADO: "Corrida equilibrada, sem grandes quedas de foco",
};

function momentSentence(m: Moment): string {
  switch (m.kind) {
    case "streak":
      return `Seu melhor trecho foi de ${formatClock(m.t)} a ${formatClock(m.tEnd ?? m.t)}, ${m.value} s seguidos com foco alto.`;
    case "rise":
      return `Aos ${formatClock(m.t)} você recuperou ${m.value} pontos de foco em 5 s.`;
    case "drop":
      return `Aos ${formatClock(m.t)} o foco caiu ${Math.abs(m.value)} pontos em 5 s.`;
    case "peak":
      return `Seu pico de atenção foi ${m.value}, aos ${formatClock(m.t)}.`;
  }
}

const MOMENT_PRIORITY: Moment["kind"][] = ["streak", "rise", "drop", "peak"];

export function templateNarrative(facts: CoachFacts): CoachNarrative {
  if (facts.quality === "insufficient" || facts.archetype === null) {
    return {
      headline: "Corrida com poucos dados do sensor",
      summary: `O sensor registrou só ${facts.sampleCount} leituras nesta corrida, pouco para uma análise confiável. Confira o encaixe do fone antes da próxima largada.`,
      source: "template",
    };
  }

  const sentences: string[] = [];
  const avg = facts.metrics.avgAttention;
  const zone = facts.metrics.focusZonePct;
  if (avg !== null) {
    sentences.push(
      zone !== null
        ? `Seu índice médio de atenção foi ${Math.round(avg)}, com ${Math.round(zone)}% do tempo na zona de foco.`
        : `Seu índice médio de atenção foi ${Math.round(avg)}.`,
    );
  }

  const notable = MOMENT_PRIORITY.map((k) => facts.moments.find((m) => m.kind === k)).find((m) => m !== undefined);
  if (notable) sentences.push(momentSentence(notable));

  const prev = facts.progress.previous;
  if (prev && prev.attentionDelta !== null) {
    const d = prev.attentionDelta;
    sentences.push(
      d > 0
        ? `Em relação à corrida anterior, seu foco médio subiu ${formatDecimal(d)} pontos.`
        : d < 0
          ? `Em relação à corrida anterior, seu foco médio caiu ${formatDecimal(Math.abs(d))} pontos.`
          : "Seu foco médio ficou igual ao da corrida anterior.",
    );
  } else if (facts.progress.raceNumber === 1) {
    sentences.push("Foi sua primeira corrida: a próxima já tem uma meta para bater.");
  }

  return { headline: HEADLINES[facts.archetype], summary: sentences.join(" "), source: "template" };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/coach/describe.test.ts lib/coach/narrative-template.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/coach/describe.ts lib/coach/describe.test.ts lib/coach/narrative-template.ts lib/coach/narrative-template.test.ts
git commit -F - <<'EOF'
feat(coach): descrições e texto-modelo a partir dos fatos do motor [NEU-115]

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Consentimento (cópia do PR #9) e texto da IA

**Files:**
- Create: `lib/consent.ts`, `lib/consent.test.ts` (cópias exatas), `lib/coach/narrative-ai.ts`
- Test: `lib/coach/narrative-ai.test.ts`

**Interfaces:**
- Consumes: `CoachFacts`, `ARCHETYPE_INFO`, `BADGE_INFO`, `BANNED_TERMS`.
- Produces:
  - `hasValidConsent(metadata: unknown): boolean` e demais exports de `lib/consent.ts`;
  - `PROMPT_VERSION`, `DEFAULT_MODEL`, `SYSTEM_PROMPT`;
  - `buildLlmInput(facts): LlmInput`;
  - `narrativeCacheKey(input, model): string`;
  - `numbersGrounded(text, input): boolean`;
  - `parseNarrative(raw: string | null, input: LlmInput): {headline; summary}`, que lança erro;
  - `type CompletionFn`;
  - `generateAiNarrative(facts, opts: {apiKey; model?; timeoutMs?; complete?}): Promise<{headline; summary}>`;
  - `cachedAiNarrative(facts, apiKey, model?): Promise<{headline; summary}>`.

- [ ] **Step 1: Trazer o consentimento do PR #9, idêntico**

```bash
git fetch -q origin pull/9/head
git show FETCH_HEAD:lib/consent.ts > lib/consent.ts
git show FETCH_HEAD:lib/consent.test.ts > lib/consent.test.ts
git diff --no-index --stat <(git show FETCH_HEAD:lib/consent.ts) lib/consent.ts
```
Expected: o último comando não imprime nada (idêntico).

Run: `npx vitest run lib/consent.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 2: Escrever o teste que falha** — `lib/coach/narrative-ai.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { analyzeRace } from "@/lib/coach/analyze";
import {
  DEFAULT_MODEL,
  SYSTEM_PROMPT,
  buildLlmInput,
  cachedAiNarrative,
  generateAiNarrative,
  narrativeCacheKey,
  numbersGrounded,
  parseNarrative,
  type CompletionFn,
} from "@/lib/coach/narrative-ai";
import { flat, makeRace } from "@/lib/coach/test-utils";

const cacheCalls = vi.hoisted(() => [] as unknown[][]);
// O cache falso NUNCA executa a função: o teste fica 100% offline (nada de chamada real à Groq).
vi.mock("next/cache", () => ({
  unstable_cache: (_fn: () => unknown, keyParts: string[], opts: unknown) => {
    cacheCalls.push([keyParts, opts]);
    return async () => ({ headline: "do cache", summary: "valor devolvido pelo cache" });
  },
}));

const M = [...flat(40, 5), ...flat(70, 12), ...flat(20, 6), ...flat(75, 7)];
const race = makeRace(M, { id: "rp-secreto-123" });
const facts = analyzeRace(race, [race]);
const input = buildLlmInput(facts);

const good = {
  headline: "Foco em altos e baixos na sua corrida",
  summary: "Seu foco médio ficou em 56, com 10 s seguidos em foco alto a partir dos 8 s e uma virada de 55 pontos aos 27 s.",
};

describe("buildLlmInput — só agregados (NEU-94)", () => {
  it("não leva id, data nem e-mail", () => {
    const json = JSON.stringify(input);
    expect(json).not.toContain("rp-secreto-123");
    expect(json).not.toContain("race-rp-secreto-123");
    expect(json).not.toMatch(/2026-09-30|@/);
  });
  it("leva rótulos e números arredondados", () => {
    expect(input.arquetipo).toBe("Oscilador");
    expect(input.metricas.foco_medio).toBe(56);
    expect(input.momentos).toHaveLength(3);
  });
});

describe("numbersGrounded", () => {
  it("aceita números dos fatos e números pequenos", () => {
    expect(numbersGrounded("foco 56, 10 s, 3 momentos", input)).toBe(true);
  });
  it("recusa número inventado", () => {
    expect(numbersGrounded("seu foco foi 87", input)).toBe(false);
  });
});

describe("parseNarrative", () => {
  it("aceita JSON válido, inclusive dentro de bloco ```json", () => {
    expect(parseNarrative(JSON.stringify(good), input)).toEqual(good);
    expect(parseNarrative("```json\n" + JSON.stringify(good) + "\n```", input)).toEqual(good);
  });
  it.each([
    ["vazio", null],
    ["JSON inválido", "{headline:"],
    ["headline curta", JSON.stringify({ ...good, headline: "Oi" })],
    ["termo proibido", JSON.stringify({ ...good, summary: good.summary + " Suas ondas beta subiram." })],
    ["ultrapassagem", JSON.stringify({ ...good, headline: "Ultrapassagem decisiva no fim" })],
    ["número inventado", JSON.stringify({ ...good, summary: good.summary.replace("56", "87") })],
  ])("recusa %s", (_, raw) => {
    expect(() => parseNarrative(raw as string | null, input)).toThrow();
  });
});

describe("generateAiNarrative", () => {
  it("chama o modelo com system prompt, JSON dos fatos e temperatura 0.4", async () => {
    const complete = vi.fn<CompletionFn>().mockResolvedValue(JSON.stringify(good));
    await expect(generateAiNarrative(facts, { apiKey: "k", complete })).resolves.toEqual(good);
    const args = complete.mock.calls[0][0];
    expect(args.model).toBe(DEFAULT_MODEL);
    expect(args.temperature).toBe(0.4);
    expect(args.messages[0]).toEqual({ role: "system", content: SYSTEM_PROMPT });
    expect(JSON.parse(args.messages[1].content)).toEqual(input);
  });

  it("propaga a falha do modelo", async () => {
    const complete = vi.fn<CompletionFn>().mockRejectedValue(new Error("timeout"));
    await expect(generateAiNarrative(facts, { apiKey: "k", complete })).rejects.toThrow("timeout");
  });
});

describe("cache", () => {
  it("a chave é estável e muda com o modelo", () => {
    expect(narrativeCacheKey(input, "m1")).toBe(narrativeCacheKey(input, "m1"));
    expect(narrativeCacheKey(input, "m1")).not.toBe(narrativeCacheKey(input, "m2"));
    expect(narrativeCacheKey(input, "m1")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("cachedAiNarrative usa unstable_cache com a chave dos fatos e sem expirar", async () => {
    cacheCalls.length = 0;
    await expect(cachedAiNarrative(facts, "k", "m1")).resolves.toEqual({
      headline: "do cache",
      summary: "valor devolvido pelo cache",
    });
    expect(cacheCalls).toEqual([[["neurocoach-narrative", narrativeCacheKey(input, "m1")], { revalidate: false }]]);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run lib/coach/narrative-ai.test.ts`
Expected: FAIL com `Failed to resolve import "@/lib/coach/narrative-ai"`.

- [ ] **Step 4: Implementar** — `lib/coach/narrative-ai.ts`:

```ts
import { createHash } from "node:crypto";
import OpenAI from "openai";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { BANNED_TERMS } from "./narrative-template";
import { ARCHETYPE_INFO, BADGE_INFO } from "./rules";
import type { CoachFacts } from "./types";

/** Mude ao alterar o prompt: invalida o cache do texto. */
export const PROMPT_VERSION = "neurocoach-v1";
export const DEFAULT_MODEL = "openai/gpt-oss-120b";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export const SYSTEM_PROMPT = [
  "Você é o NeuroCoach do NeuroRace, um jogo de corrida controlado pelo índice de atenção do fone NeuroSky.",
  "Recebe um JSON com os fatos de UMA corrida, já calculados. Escreva em português do Brasil:",
  '- "headline": uma frase de 10 a 80 caracteres;',
  '- "summary": 2 ou 3 frases, de 40 a 400 caracteres, no tom de um engenheiro de corrida encorajador.',
  "Regras obrigatórias:",
  "- Use SOMENTE números que aparecem no JSON. Tempos em segundos (ex.: 'aos 27 s'), nunca em minutos.",
  "- Não fale de ultrapassagem, oponente, adversário, posição na pista nem de ondas cerebrais (alfa, beta).",
  "  O NeuroSky mede um índice de atenção e um de calma, de 0 a 100.",
  "- Não invente fatos nem dê conselho médico.",
  'Responda apenas com o JSON {"headline": "...", "summary": "..."}.',
].join("\n");

export function buildLlmInput(facts: CoachFacts) {
  const m = facts.metrics;
  const r = (v: number | null) => (v === null ? null : Math.round(v));
  const prev = facts.progress.previous;
  return {
    qualidade: facts.quality,
    arquetipo: facts.archetype ? ARCHETYPE_INFO[facts.archetype].label : null,
    metricas: {
      foco_medio: r(m.avgAttention),
      pico_de_foco: r(m.peakAttention),
      zona_de_foco_pct: r(m.focusZonePct),
      calma_media: r(m.avgMeditation),
      duracao_s: r(m.durationSeconds),
      foco_por_terco: m.thirds ? m.thirds.map((v) => Math.round(v)) : null,
      volatilidade: r(m.volatility),
      melhor_sequencia_s: m.bestStreakSeconds,
    },
    momentos: facts.moments.map((x) => ({ tipo: x.kind, segundo: x.t, fim_s: x.tEnd ?? null, valor: x.value })),
    badges: facts.badges.map((b) => BADGE_INFO[b].label),
    evolucao: {
      corrida_numero: facts.progress.raceNumber,
      variacao_foco_pts: prev ? r(prev.attentionDelta) : null,
      variacao_tempo_s: prev ? r(prev.durationDelta) : null,
    },
    meta: facts.goal ? { tipo: facts.goal.kind, hoje: facts.goal.current, alvo: facts.goal.target, unidade: facts.goal.unit } : null,
  };
}
export type LlmInput = ReturnType<typeof buildLlmInput>;

export function narrativeCacheKey(input: LlmInput, model: string): string {
  return createHash("sha256").update(`${PROMPT_VERSION}|${model}|${JSON.stringify(input)}`).digest("hex");
}

/** Todo número do texto tem de estar nos fatos (ou ser pequeno, até 3). */
export function numbersGrounded(text: string, input: LlmInput): boolean {
  const allowed = new Set<number>([0, 1, 2, 3]);
  for (const n of JSON.stringify(input).match(/-?\d+(?:\.\d+)?/g) ?? []) allowed.add(Math.abs(Number(n)));
  const found = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return found.every((n) => allowed.has(Number(n.replace(",", "."))));
}

const OutputSchema = z.object({
  headline: z.string().trim().min(10).max(80),
  summary: z.string().trim().min(40).max(400),
});

export function parseNarrative(raw: string | null, input: LlmInput): { headline: string; summary: string } {
  if (!raw) throw new Error("neurocoach_ai_empty");
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = OutputSchema.parse(JSON.parse(cleaned));
  const text = `${parsed.headline} ${parsed.summary}`;
  if (BANNED_TERMS.test(text)) throw new Error("neurocoach_ai_banned_term");
  if (!numbersGrounded(text, input)) throw new Error("neurocoach_ai_ungrounded_number");
  return parsed;
}

export type CompletionFn = (args: {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  response_format: { type: "json_object" };
  temperature: number;
}) => Promise<string | null>;

function groqCompletion(apiKey: string, timeoutMs: number): CompletionFn {
  const client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL, timeout: timeoutMs, maxRetries: 0 });
  return async (args) => (await client.chat.completions.create(args)).choices[0]?.message?.content ?? null;
}

export async function generateAiNarrative(
  facts: CoachFacts,
  opts: { apiKey: string; model?: string; timeoutMs?: number; complete?: CompletionFn },
): Promise<{ headline: string; summary: string }> {
  const input = buildLlmInput(facts);
  const model = opts.model ?? DEFAULT_MODEL;
  const complete = opts.complete ?? groqCompletion(opts.apiKey, opts.timeoutMs ?? 8000);
  const raw = await complete({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(input) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });
  return parseNarrative(raw, input);
}

/** 1 chamada por corrida: cache por hash dos fatos + versão do prompt + modelo. Erro não é cacheado. */
export async function cachedAiNarrative(
  facts: CoachFacts,
  apiKey: string,
  model: string = process.env.GROQ_MODEL || DEFAULT_MODEL,
): Promise<{ headline: string; summary: string }> {
  const key = narrativeCacheKey(buildLlmInput(facts), model);
  const run = unstable_cache(() => generateAiNarrative(facts, { apiKey, model }), ["neurocoach-narrative", key], {
    revalidate: false,
  });
  return run();
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run lib/coach/narrative-ai.test.ts lib/consent.test.ts`
Expected: PASS. Nenhum teste faz chamada de rede: `complete` é injetado, e o `unstable_cache` falso não executa a função.

- [ ] **Step 6: Commit**

```bash
git add lib/consent.ts lib/consent.test.ts lib/coach/narrative-ai.ts lib/coach/narrative-ai.test.ts
git commit -F - <<'EOF'
feat(coach): texto da IA só sobre os fatos — travas, números checados e cache por corrida [NEU-115]

lib/consent.ts e seu teste são cópias exatas do PR #9 (NEU-103).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Server action `getCoachReportAction`

**Files:**
- Create: `lib/coach/action.ts`
- Test: `lib/coach/action.test.ts`

**Interfaces:**
- Consumes: `createClient` (`lib/supabase/server`), `hasValidConsent`, `buildRaceSummaries`, `TelemetryRow`, `analyzeRace`, `templateNarrative`, `cachedAiNarrative`, `CoachActionResult`.
- Produces: `getCoachReportAction(racePlayerId: string): Promise<CoachActionResult>` (`"use server"`).

- [ ] **Step 1: Escrever o teste que falha** — `lib/coach/action.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildWebConsent, CONSENT_METADATA_KEY } from "@/lib/consent";
import { flat } from "@/lib/coach/test-utils";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  cachedAiNarrative: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }),
}));
vi.mock("@/lib/coach/narrative-ai", () => ({ cachedAiNarrative: mocks.cachedAiNarrative }));

import { getCoachReportAction } from "@/lib/coach/action";

const STARTED = "2026-09-30T17:00:00.000Z";
const racePlayers = [{ id: "rp-1", race_id: "r-1", player_slot: 1, started_at: STARTED, finished_at: "2026-09-30T17:00:30.000Z" }];
const M = [...flat(40, 5), ...flat(70, 12), ...flat(20, 6), ...flat(75, 7)];
const telemetry = M.map((a, i) => ({
  race_player_id: "rp-1",
  t: new Date(Date.parse(STARTED) + i * 1000).toISOString(),
  attention: a,
  meditation: 50,
}));

/** race_players: select().order(); telemetry_points: select().order() e select().eq().order(). */
function mockTables(opts: { loadError?: boolean; telemetryForRace?: typeof telemetry } = {}) {
  const eqCalls: unknown[][] = [];
  mocks.from.mockImplementation((table: string) => {
    const rows = table === "race_players" ? racePlayers : telemetry;
    const result = opts.loadError ? { data: null, error: { message: "boom" } } : { data: rows, error: null };
    const order = () => Promise.resolve(result);
    return {
      select: () => ({
        order,
        eq: (...args: unknown[]) => {
          eqCalls.push(args);
          return { order: () => Promise.resolve(opts.loadError ? result : { data: opts.telemetryForRace ?? telemetry, error: null }) };
        },
      }),
    };
  });
  return eqCalls;
}

const consented = { [CONSENT_METADATA_KEY]: buildWebConsent(new Date("2026-09-28T12:00:00.000Z")) };
const aiText = { headline: "Texto gerado pela IA ok", summary: "Resumo da IA com mais de quarenta caracteres, só números dos fatos: 56." };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GROQ_API_KEY = "test-key";
  mocks.cachedAiNarrative.mockResolvedValue(aiText);
});
afterEach(() => {
  delete process.env.GROQ_API_KEY;
});

describe("getCoachReportAction (spec §6)", () => {
  it("id inválido → not_found sem tocar no Supabase", async () => {
    await expect(getCoachReportAction("")).resolves.toEqual({ ok: false, reason: "not_found" });
    await expect(getCoachReportAction("x".repeat(65))).resolves.toEqual({ ok: false, reason: "not_found" });
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("sem sessão → unauthenticated, sem ler dados", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(getCoachReportAction("rp-1")).resolves.toEqual({ ok: false, reason: "unauthenticated" });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("corrida que não é do usuário (fora da RLS) → not_found", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: consented } } });
    mockTables();
    await expect(getCoachReportAction("rp-de-outra-pessoa")).resolves.toEqual({ ok: false, reason: "not_found" });
  });

  it("carrega a telemetria da corrida selecionada filtrando pelo id (limite de 1000 linhas)", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    const eqCalls = mockTables();
    await getCoachReportAction("rp-1");
    expect(eqCalls).toEqual([["race_player_id", "rp-1"]]);
  });

  it("sem consentimento → texto-modelo, sem chamar a IA", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    mockTables();
    const res = await getCoachReportAction("rp-1");
    expect(res.ok && res.narrative.source).toBe("template");
    expect(res.ok && res.facts.archetype).toBe("OSCILADOR");
    expect(mocks.cachedAiNarrative).not.toHaveBeenCalled();
  });

  it("sem GROQ_API_KEY → texto-modelo", async () => {
    delete process.env.GROQ_API_KEY;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: consented } } });
    mockTables();
    const res = await getCoachReportAction("rp-1");
    expect(res.ok && res.narrative.source).toBe("template");
    expect(mocks.cachedAiNarrative).not.toHaveBeenCalled();
  });

  it("com consentimento e chave → texto da IA", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: consented } } });
    mockTables();
    const res = await getCoachReportAction("rp-1");
    expect(res).toMatchObject({ ok: true, narrative: { ...aiText, source: "ai" } });
    expect(mocks.cachedAiNarrative).toHaveBeenCalledTimes(1);
  });

  it("IA falha → texto-modelo", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: consented } } });
    mockTables();
    mocks.cachedAiNarrative.mockRejectedValue(new Error("neurocoach_ai_banned_term"));
    const res = await getCoachReportAction("rp-1");
    expect(res.ok && res.narrative.source).toBe("template");
  });

  it("corrida com poucos dados não chama a IA", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: consented } } });
    mockTables({ telemetryForRace: telemetry.slice(0, 5) });
    const res = await getCoachReportAction("rp-1");
    expect(res.ok && res.facts.quality).toBe("insufficient");
    expect(mocks.cachedAiNarrative).not.toHaveBeenCalled();
  });

  it("erro ao ler o banco → error", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    mockTables({ loadError: true });
    await expect(getCoachReportAction("rp-1")).resolves.toEqual({ ok: false, reason: "error" });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/coach/action.test.ts`
Expected: FAIL com `Failed to resolve import "@/lib/coach/action"`.

- [ ] **Step 3: Implementar** — `lib/coach/action.ts`:

```ts
"use server";

import { hasValidConsent } from "@/lib/consent";
import { buildRaceSummaries, type TelemetryRow } from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";
import { analyzeRace } from "./analyze";
import { cachedAiNarrative } from "./narrative-ai";
import { templateNarrative } from "./narrative-template";
import type { CoachActionResult, CoachFacts, CoachNarrative } from "./types";

/**
 * NeuroCoach 2.0 (NEU-115). Recebe SÓ o id da corrida: os dados vêm do banco pela RLS
 * (a pessoa só enxerga as próprias corridas), nunca do navegador (NEU-106).
 */
export async function getCoachReportAction(racePlayerId: string): Promise<CoachActionResult> {
  if (typeof racePlayerId !== "string" || racePlayerId.length === 0 || racePlayerId.length > 64) {
    return { ok: false, reason: "not_found" };
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "unauthenticated" };

    // A série da corrida selecionada vem filtrada pelo id: o histórico inteiro pode passar
    // do limite de 1000 linhas do PostgREST, a corrida analisada não pode ser truncada.
    const [players, allTelemetry, raceTelemetry] = await Promise.all([
      supabase.from("race_players").select("id, race_id, player_slot, started_at, finished_at").order("started_at", { ascending: true }),
      supabase.from("telemetry_points").select("race_player_id, t, attention, meditation").order("t", { ascending: true }),
      supabase
        .from("telemetry_points")
        .select("race_player_id, t, attention, meditation")
        .eq("race_player_id", racePlayerId)
        .order("t", { ascending: true }),
    ]);
    if (players.error || allTelemetry.error || raceTelemetry.error) throw new Error("neurocoach_load_failed");

    const rows = players.data ?? [];
    if (!rows.some((r) => r.id === racePlayerId)) return { ok: false, reason: "not_found" };

    const others = ((allTelemetry.data ?? []) as TelemetryRow[]).filter((p) => p.race_player_id !== racePlayerId);
    const history = buildRaceSummaries(rows, [...others, ...((raceTelemetry.data ?? []) as TelemetryRow[])]);
    const race = history.find((r) => r.racePlayerId === racePlayerId)!;

    const facts = analyzeRace(race, history);
    return { ok: true, facts, narrative: await narrate(facts, user.user_metadata) };
  } catch (err) {
    console.error(JSON.stringify({ level: "error", event: "neurocoach_action_error", message: err instanceof Error ? err.message : String(err) }));
    return { ok: false, reason: "error" };
  }
}

async function narrate(facts: CoachFacts, metadata: unknown): Promise<CoachNarrative> {
  const apiKey = process.env.GROQ_API_KEY;
  // LLM só com consentimento LGPD (NEU-94/ADR 0003) e só quando há o que analisar.
  if (apiKey && facts.quality === "ok" && hasValidConsent(metadata)) {
    try {
      return { ...(await cachedAiNarrative(facts, apiKey)), source: "ai" };
    } catch (err) {
      console.warn(JSON.stringify({ level: "warn", event: "neurocoach_ai_fallback", message: err instanceof Error ? err.message : String(err) }));
    }
  }
  return templateNarrative(facts);
}
```

Nota: "corrida com poucos dados não chama a IA" é mais restritivo que a spec §5.2, que só pede consentimento + chave. Isso é intencional, porque não há o que narrar; entra como ruling no ledger.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/coach/action.test.ts`
Expected: PASS (10 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/coach/action.ts lib/coach/action.test.ts
git commit -F - <<'EOF'
feat(coach): server action só com o id da corrida — sessão, RLS, consentimento e fallback [NEU-115]

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Interface — hook, painel, card e marcadores no replay

**Files:**
- Create: `components/coach/useCoachReport.ts`, `components/coach/CoachCard.tsx`, `components/coach/CoachPanel.tsx`, `components/dashboard/replay-markers.ts`
- Modify: `components/dashboard/ReplayChart.tsx`, `components/dashboard/DashboardClient.tsx`
- Test: `components/coach/useCoachReport.test.tsx`, `components/coach/CoachCard.test.tsx`, `components/coach/CoachPanel.test.tsx`, `components/dashboard/replay-markers.test.ts`

**Interfaces:**
- Consumes: `getCoachReportAction`, `CoachActionResult`, `CoachFacts`, `CoachNarrative`, `Moment`, `ARCHETYPE_INFO`, `BADGE_INFO`, `describeMoment`, `describeGoal`, `formatDecimal`, `MOMENT_SYMBOLS`, `SeriesPoint`.
- Produces:
  - `useCoachReport(racePlayerId: string | undefined): CoachActionResult | null`;
  - `<CoachCard facts narrative />`;
  - `<CoachPanel result />`;
  - `momentMarkers(series, moments): { dots: Array<{x; y; label}>; area: {x1; x2} | null }`;
  - `<ReplayChart series moments? />`.

- [ ] **Step 1: Escrever os testes que falham.**

`components/dashboard/replay-markers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { momentMarkers } from "@/components/dashboard/replay-markers";

const series = [
  { t: 0, attention: 40, meditation: 50 },
  { t: 8, attention: 70, meditation: 50 },
  { t: 21, attention: 20, meditation: 50 },
  { t: 27, attention: null, meditation: 50 },
  { t: 28, attention: 75, meditation: 50 },
];

describe("momentMarkers", () => {
  it("numera os momentos e usa o attention do segundo (ou o vizinho mais próximo com valor)", () => {
    expect(
      momentMarkers(series, [
        { kind: "streak", t: 8, tEnd: 17, value: 10 },
        { kind: "drop", t: 21, value: -50 },
        { kind: "rise", t: 27, value: 55 },
      ]),
    ).toEqual({
      dots: [
        { x: 8, y: 70, label: "①" },
        { x: 21, y: 20, label: "②" },
        { x: 27, y: 75, label: "③" },
      ],
      area: { x1: 8, x2: 17 },
    });
  });

  it("sem momentos → nada", () => {
    expect(momentMarkers(series, [])).toEqual({ dots: [], area: null });
  });
});
```

`components/coach/CoachCard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoachCard } from "@/components/coach/CoachCard";
import { analyzeRace } from "@/lib/coach/analyze";
import { flat, makeRace } from "@/lib/coach/test-utils";

const M = [...flat(40, 5), ...flat(70, 12), ...flat(20, 6), ...flat(75, 7)];

describe("CoachCard", () => {
  it("mostra arquétipo, texto, momentos, badges e meta", () => {
    const race = makeRace(M);
    render(
      <CoachCard
        facts={analyzeRace(race, [race])}
        narrative={{ headline: "Manchete da IA", summary: "Resumo gerado.", source: "ai" }}
      />,
    );
    expect(screen.getByText("Manchete da IA")).toBeInTheDocument();
    expect(screen.getByText("Oscilador")).toBeInTheDocument();
    expect(screen.getByText(/texto gerado por IA/i)).toBeInTheDocument();
    expect(screen.getByText("0:08–0:17 · 10 s seguidos em foco alto")).toBeInTheDocument();
    expect(screen.getByText("①")).toBeInTheDocument();
    expect(screen.getByText("Virada Mental")).toBeInTheDocument();
    expect(screen.getByText(/Próxima corrida/i)).toBeInTheDocument();
  });

  it("evolução em relação à corrida anterior", () => {
    const r1 = makeRace(flat(50, 20), { id: "r1", startedAt: "2026-09-30T17:00:00.000Z", durationSeconds: 70 });
    const r2 = makeRace(flat(60, 20), { id: "r2", startedAt: "2026-09-30T17:10:00.000Z", durationSeconds: 60 });
    render(<CoachCard facts={analyzeRace(r2, [r1, r2])} narrative={{ headline: "Manchete longa ok", summary: "Resumo.", source: "template" }} />);
    expect(screen.getByText("+10 pts de foco")).toBeInTheDocument();
    expect(screen.getByText("-10 s no tempo")).toBeInTheDocument();
    expect(screen.getByText(/resumo automático/i)).toBeInTheDocument();
  });

  it("poucos dados: sem arquétipo, momentos nem meta", () => {
    const race = makeRace(flat(60, 5));
    render(<CoachCard facts={analyzeRace(race, [race])} narrative={{ headline: "Corrida com poucos dados do sensor", summary: "x", source: "template" }} />);
    expect(screen.queryByText(/Momentos da corrida/i)).toBeNull();
    expect(screen.queryByText(/Próxima corrida/i)).toBeNull();
  });
});
```

`components/coach/CoachPanel.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoachPanel } from "@/components/coach/CoachPanel";
import { analyzeRace } from "@/lib/coach/analyze";
import { flat, makeRace } from "@/lib/coach/test-utils";

describe("CoachPanel", () => {
  it("carregando", () => {
    render(<CoachPanel result={null} />);
    expect(screen.getByText(/analisando esta corrida/i)).toBeInTheDocument();
  });
  it("sessão expirada", () => {
    render(<CoachPanel result={{ ok: false, reason: "unauthenticated" }} />);
    expect(screen.getByText(/sessão expirou/i)).toBeInTheDocument();
  });
  it.each(["not_found", "error"] as const)("%s", (reason) => {
    render(<CoachPanel result={{ ok: false, reason }} />);
    expect(screen.getByText(/não foi possível analisar/i)).toBeInTheDocument();
  });
  it("relatório", () => {
    const race = makeRace(flat(70, 20));
    render(<CoachPanel result={{ ok: true, facts: analyzeRace(race, [race]), narrative: { headline: "Manchete do painel", summary: "Resumo.", source: "template" } }} />);
    expect(screen.getByText("Manchete do painel")).toBeInTheDocument();
  });
});
```

`components/coach/useCoachReport.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ action: vi.fn() }));
vi.mock("@/lib/coach/action", () => ({ getCoachReportAction: mocks.action }));

import { useCoachReport } from "@/components/coach/useCoachReport";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.action.mockImplementation(async (id: string) => ({ ok: false, reason: id === "a" ? "not_found" : "error" }));
});

describe("useCoachReport", () => {
  it("busca 1 vez por corrida e reaproveita ao voltar", async () => {
    const { result, rerender } = renderHook(({ id }) => useCoachReport(id), { initialProps: { id: "a" as string | undefined } });
    await waitFor(() => expect(result.current).toEqual({ ok: false, reason: "not_found" }));
    rerender({ id: "b" });
    await waitFor(() => expect(result.current).toEqual({ ok: false, reason: "error" }));
    rerender({ id: "a" });
    expect(result.current).toEqual({ ok: false, reason: "not_found" });
    expect(mocks.action).toHaveBeenCalledTimes(2);
  });

  it("exceção na action vira reason error", async () => {
    mocks.action.mockRejectedValue(new Error("rede"));
    const { result } = renderHook(() => useCoachReport("z"));
    await waitFor(() => expect(result.current).toEqual({ ok: false, reason: "error" }));
  });

  it("sem corrida selecionada → null, sem chamar", () => {
    const { result } = renderHook(() => useCoachReport(undefined));
    expect(result.current).toBeNull();
    expect(mocks.action).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run components/coach components/dashboard/replay-markers.test.ts`
Expected: FAIL com `Failed to resolve import` nos 4 arquivos.

- [ ] **Step 3: Implementar.**

`components/dashboard/replay-markers.ts`:

```ts
import { MOMENT_SYMBOLS } from "@/lib/coach/describe";
import type { Moment } from "@/lib/coach/types";
import type { SeriesPoint } from "@/lib/metrics";

/** Momentos do NeuroCoach → marcadores do gráfico de replay (numerados como no card). */
export function momentMarkers(
  series: SeriesPoint[],
  moments: Moment[],
): { dots: Array<{ x: number; y: number; label: string }>; area: { x1: number; x2: number } | null } {
  const withValue = series.filter((p): p is SeriesPoint & { attention: number } => p.attention !== null);
  const yAt = (t: number) =>
    withValue.reduce<{ d: number; y: number } | null>((best, p) => {
      const d = Math.abs(p.t - t);
      return !best || d < best.d ? { d, y: p.attention } : best;
    }, null)?.y ?? 0;

  const streak = moments.find((m) => m.kind === "streak");
  return {
    dots: moments.map((m, i) => ({ x: m.t, y: yAt(m.t), label: MOMENT_SYMBOLS[i] ?? String(i + 1) })),
    area: streak ? { x1: streak.t, x2: streak.tEnd ?? streak.t } : null,
  };
}
```

`components/dashboard/ReplayChart.tsx`: o import de `recharts` ganha `ReferenceArea, ReferenceDot`. A assinatura e o fim do `<AreaChart>` ficam assim (o resto do arquivo não muda):

```tsx
import type { Moment } from "@/lib/coach/types";
import { momentMarkers } from "./replay-markers";
// ...
export function ReplayChart({ series, moments }: { series: SeriesPoint[]; moments?: Moment[] }) {
  const markers = moments?.length ? momentMarkers(series, moments) : null;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        {/* ...defs, grid, eixos, tooltip, legend e as duas <Area> iguais a hoje... */}
        {markers?.area && (
          <ReferenceArea x1={markers.area.x1} x2={markers.area.x2} fill="#38bdf8" fillOpacity={0.12} stroke="none" />
        )}
        {markers?.dots.map((d) => (
          <ReferenceDot
            key={d.label}
            x={d.x}
            y={d.y}
            r={9}
            fill="#0b1622"
            stroke="#38bdf8"
            label={{ value: d.label, position: "center", fill: "#f0f6fc", fontSize: 11 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

`components/coach/useCoachReport.ts`:

```ts
"use client";

import { useEffect, useState, useTransition } from "react";
import { getCoachReportAction } from "@/lib/coach/action";
import type { CoachActionResult } from "@/lib/coach/types";

/** Relatório do NeuroCoach da corrida selecionada; 1 chamada por corrida (memo por id). */
export function useCoachReport(racePlayerId: string | undefined): CoachActionResult | null {
  const [results, setResults] = useState<Record<string, CoachActionResult>>({});
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!racePlayerId || results[racePlayerId]) return;
    let alive = true;
    startTransition(async () => {
      let res: CoachActionResult;
      try {
        res = await getCoachReportAction(racePlayerId);
      } catch {
        res = { ok: false, reason: "error" };
      }
      if (alive) setResults((prev) => ({ ...prev, [racePlayerId]: res }));
    });
    return () => {
      alive = false;
    };
  }, [racePlayerId, results]);

  return racePlayerId ? (results[racePlayerId] ?? null) : null;
}
```

`components/coach/CoachCard.tsx`:

```tsx
import { describeGoal, describeMoment, formatDecimal, MOMENT_SYMBOLS } from "@/lib/coach/describe";
import { ARCHETYPE_INFO, BADGE_INFO } from "@/lib/coach/rules";
import type { CoachFacts, CoachNarrative } from "@/lib/coach/types";

function signed(v: number): string {
  return `${v > 0 ? "+" : ""}${formatDecimal(v)}`;
}

export function CoachCard({ facts, narrative }: { facts: CoachFacts; narrative: CoachNarrative }) {
  const prev = facts.progress.previous;
  return (
    <section className="rounded-card border border-border bg-card/40 p-5 sm:p-6" aria-label="NeuroCoach">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-cyan">NeuroCoach</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-fg-strong">{narrative.headline}</h2>
        </div>
        {facts.archetype && (
          <span
            title={ARCHETYPE_INFO[facts.archetype].description}
            className="rounded-full border border-cyan/40 bg-cyan/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan"
          >
            {ARCHETYPE_INFO[facts.archetype].label}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-fg">{narrative.summary}</p>
      <p className="mt-1 text-xs text-fg-muted">
        {narrative.source === "ai" ? "Texto gerado por IA a partir dos seus dados" : "Resumo automático a partir dos seus dados"}
      </p>

      {facts.moments.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Momentos da corrida</h3>
          <ol className="mt-2 space-y-1.5">
            {facts.moments.map((m, i) => (
              <li key={`${m.kind}-${m.t}`} className="flex items-start gap-2 text-sm text-fg">
                <span className="text-cyan">{MOMENT_SYMBOLS[i]}</span>
                <span>{describeMoment(m)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {prev && (prev.attentionDelta !== null || prev.durationDelta !== null) && (
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className="text-fg-muted">vs corrida anterior:</span>
          {prev.attentionDelta !== null && (
            <span className="rounded-md border border-border px-2 py-0.5 text-fg-strong">{`${signed(prev.attentionDelta)} pts de foco`}</span>
          )}
          {prev.durationDelta !== null && (
            <span className="rounded-md border border-border px-2 py-0.5 text-fg-strong">{`${signed(prev.durationDelta)} s no tempo`}</span>
          )}
        </div>
      )}

      {facts.badges.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {facts.badges.map((b) => (
            <li key={b} title={BADGE_INFO[b].description} className="flex items-center gap-1.5 rounded-lg border border-border bg-bg/60 px-2.5 py-1 text-xs text-fg-strong">
              <span aria-hidden>{BADGE_INFO[b].icon}</span>
              <span>{BADGE_INFO[b].label}</span>
            </li>
          ))}
        </ul>
      )}

      {facts.goal && (
        <div className="mt-5 rounded-lg border border-cyan/30 bg-cyan/5 p-4">
          <p className="text-sm font-semibold text-fg-strong">🎯 Próxima corrida: {describeGoal(facts.goal)}</p>
          <p className="mt-1 text-sm text-fg">
            <span className="font-medium text-cyan">{facts.goal.drill.title}:</span> {facts.goal.drill.steps}
          </p>
        </div>
      )}
    </section>
  );
}
```

`components/coach/CoachPanel.tsx`:

```tsx
import { CoachCard } from "./CoachCard";
import type { CoachActionResult } from "@/lib/coach/types";

export function CoachPanel({ result }: { result: CoachActionResult | null }) {
  if (result === null) {
    return (
      <div className="animate-pulse rounded-card border border-border bg-card/30 p-8 text-center text-sm text-fg-muted">
        O NeuroCoach está analisando esta corrida…
      </div>
    );
  }
  if (!result.ok) {
    return (
      <div className="rounded-card border border-border bg-card/30 p-6 text-center text-sm text-fg-muted">
        {result.reason === "unauthenticated"
          ? "Sua sessão expirou. Entre de novo para ver a análise do NeuroCoach."
          : "Não foi possível analisar esta corrida agora. Tente de novo em instantes."}
      </div>
    );
  }
  return <CoachCard facts={result.facts} narrative={result.narrative} />;
}
```

`components/dashboard/DashboardClient.tsx`:
- **Remover:**
  - os imports de `useEffect`, `useTransition`, `CognitiveFeedbackCard`, `getCognitiveReportAction` e `generateFallbackReport`/`CognitiveReportOutput`;
  - o estado `report`/`isPending`/`isFallback` e o `useEffect` da IA;
  - a seção "4. SEÇÃO DO NEUROCOACH AI".
- **Acrescentar:**

```tsx
import { CoachPanel } from "@/components/coach/CoachPanel";
import { useCoachReport } from "@/components/coach/useCoachReport";
// dentro do componente, logo depois de `selected` (antes de qualquer return):
const coach = useCoachReport(selected?.racePlayerId);
// no replay:
<ReplayChart series={selected.series} moments={coach?.ok ? coach.facts.moments : undefined} />
// no lugar da seção antiga (logo abaixo do grid replay + lista):
<CoachPanel result={coach} />
```
- O import de React fica `import { useState } from "react";`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run components/coach components/dashboard/replay-markers.test.ts`
Expected: PASS. Depois: `npm test 2>&1 | tail -5`, com a suíte inteira verde.

- [ ] **Step 5: Commit**

```bash
git add components/coach components/dashboard/replay-markers.ts components/dashboard/replay-markers.test.ts components/dashboard/ReplayChart.tsx components/dashboard/DashboardClient.tsx
git commit -F - <<'EOF'
feat(coach): novo card do NeuroCoach e momentos marcados no replay [NEU-115]

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Limpeza, smoke e documentação (absorve a NEU-95)

**Files:**
- Delete: `lib/ai/`, `components/ai/`, `scripts/diagnose-gemini.ts`, `scripts/diagnose-groq.ts`, `scripts/test-ai-pipeline.ts`
- Create: `scripts/coach-smoke.ts`
- Modify: `package.json`, `package-lock.json`, `.env.example`, `CLAUDE.md`

- [ ] **Step 1: Remover a versão antiga e o Gemini**

```bash
git rm -r -q lib/ai components/ai scripts/diagnose-gemini.ts scripts/diagnose-groq.ts scripts/test-ai-pipeline.ts
npm uninstall @google/generative-ai
grep -rn "lib/ai\|components/ai\|generative-ai\|GEMINI" --include=*.ts --include=*.tsx --include=*.json --include=*.md . | grep -v node_modules | grep -v docs/superpowers
```
Expected: o `grep` final não imprime nada.

- [ ] **Step 2: Smoke manual** — `scripts/coach-smoke.ts`:

```ts
/**
 * Smoke do NeuroCoach 2.0 (NEU-115): motor + texto-modelo + (se houver GROQ_API_KEY no .env.local) Groq.
 * Uso: npx tsx scripts/coach-smoke.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { buildRaceSummaries } from "../lib/metrics";
import { analyzeRace } from "../lib/coach/analyze";
import { templateNarrative } from "../lib/coach/narrative-template";
import { generateAiNarrative } from "../lib/coach/narrative-ai";

const started = Date.parse("2026-09-30T17:00:00.000Z");
const attention = [...Array(15).fill(68), ...Array(15).fill(55), ...Array(15).fill(42)];
const [race] = buildRaceSummaries(
  [{ id: "smoke", race_id: "smoke", player_slot: 1, started_at: new Date(started).toISOString(), finished_at: new Date(started + 45_000).toISOString() }],
  attention.map((a, i) => ({ race_player_id: "smoke", t: new Date(started + i * 1000).toISOString(), attention: a, meditation: 50 })),
);

async function main() {
  const facts = analyzeRace(race, [race]);
  console.log("Fatos:", JSON.stringify({ archetype: facts.archetype, badges: facts.badges, moments: facts.moments, goal: facts.goal }, null, 2));
  console.log("Texto-modelo:", templateNarrative(facts));
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log("Sem GROQ_API_KEY no .env.local: pulando a Groq.");
    return;
  }
  const t0 = Date.now();
  try {
    console.log("Groq:", await generateAiNarrative(facts, { apiKey, model: process.env.GROQ_MODEL || undefined }), `(${Date.now() - t0} ms)`);
  } catch (err) {
    console.error("Groq falhou (o site usaria o texto-modelo):", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

main();
```

Run: `npx tsx scripts/coach-smoke.ts`
Expected: imprime os fatos (arquétipo `SPRINTER`, meta `final_third`) e o texto-modelo. Sem chave: "pulando a Groq".

- [ ] **Step 3: `.env.example`** — acrescentar ao fim:

```bash

# --- Opcionais: NeuroCoach (IA Coach, NEU-115) ---
# Sem GROQ_API_KEY o NeuroCoach funciona com o texto-modelo (mesmo conteúdo, sem IA).
# Com ela, o texto é escrito pela Groq só para quem deu o consentimento LGPD, 1 vez por corrida (cache).
# GROQ_API_KEY=                     # SEGREDO — Vercel (Production) e .env.local; nunca commitar
# GROQ_MODEL=openai/gpt-oss-120b    # opcional; padrão acima
```

- [ ] **Step 4: `CLAUDE.md`** — acrescentar antes de "## Segredos / env":

```markdown
## NeuroCoach (IA Coach 2.0, NEU-115)
- **O código decide, a IA só escreve.**
  - `lib/coach/analyze.ts` é puro e determinístico: arquétipo, badges, momentos (sinal suavizado de 5 s), evolução e meta.
  - Limiares em `lib/coach/rules.ts` (`THRESHOLDS`), calibrados em 28/09 com as corridas reais.
- **Entrada:** `lib/coach/action.ts` recebe **só o `racePlayerId`**, exige sessão e lê pela RLS. Nunca aceite dado de corrida vindo do cliente.
- **Texto:**
  - Groq (`GROQ_API_KEY`) só com consentimento LGPD válido (`lib/consent.ts`) e corrida com dados suficientes;
  - cache `unstable_cache` por hash dos fatos + `PROMPT_VERSION`;
  - travas contra termos inventados e números fora dos fatos;
  - qualquer falha → `templateNarrative`.
- **Mudou o prompt?** Suba o `PROMPT_VERSION`. **Smoke:** `npx tsx scripts/coach-smoke.ts`.
```

- [ ] **Step 5: Gate completo**

Run: `npm test 2>&1 | tail -5 && npm run lint && npm run build 2>&1 | tail -5 && npx tsc --noEmit`
Expected: tudo verde. Anote no ledger a contagem de testes (deve ser maior que a da Task 0).

- [ ] **Step 6: Commit**

```bash
git add -A lib components scripts package.json package-lock.json .env.example CLAUDE.md
git status --short   # conferir: nada fora do esperado (nenhum .env.local)
git commit -F - <<'EOF'
chore(coach): remove a IA Coach antiga e o Gemini; smoke e docs do NeuroCoach 2.0 [NEU-115, NEU-95]

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 9: PR, Linear e verificação em produção

**Files:** nenhum.

- [ ] **Step 1: Push e PR** (token do `santos-nikolas`)

```bash
GH_TOKEN=$(gh auth token --user santos-nikolas) git -c credential.helper= -c "credential.helper=!gh auth git-credential" push -u origin feature/neu-115
GH_TOKEN=$(gh auth token --user santos-nikolas) gh pr create -R NeuroRace/web-plataform --base main --head feature/neu-115 \
  --title "feat(coach): NeuroCoach 2.0 — motor determinístico, momentos da corrida e texto da IA com cache (NEU-115)" --body-file <arquivo>
```
- **Corpo do PR:**
  - TL;DR não técnico;
  - o diagnóstico (com os números reais);
  - o que entra;
  - a coordenação com o PR #9, **ordem sugerida: este primeiro; o #9 descarta suas mudanças em `lib/ai/*`**;
  - "Verificação" com a saída do gate;
  - "Verificar depois do deploy: `GROQ_API_KEY` na Vercel + card no `/dashboard` logado";
  - `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 2: CI verde** — `gh pr checks <n> -R NeuroRace/web-plataform --watch`.

- [ ] **Step 3: Linear** — NEU-115 → In Review + link do PR. Comentário na NEU-95 com o que foi documentado e o que falta verificar na Vercel.
