# Redesign "Telemetry" — Fase A (Sistema + Landing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a estética genérica do NeuroRace por um sistema visual autoral "Telemetry" (instrumento que lê o cérebro) e reconstruir a landing mobile-first sobre ele.

**Architecture:** Tailwind v4 com tokens semânticos no `@theme` (base escura + 2 acentos: atenção/meditação). Um kit de primitivos em `components/signal/*` (rótulos mono, onda EEG, readouts, painéis-instrumento) que a landing compõe. Motion via `motion` (já no projeto) + keyframes CSS leves; zero lib runtime nova. Lógica pura (gerador de sinal de demonstração, classificação de zona de foco) isolada em `lib/signal.ts` e coberta por testes.

**Tech Stack:** Next 16 (App Router) · React 19 · TypeScript · Tailwind v4 · `motion` · `recharts` · `next/font`. Testes: Vitest + Testing Library (devDeps).

## Global Constraints

Copiados verbatim do spec (`docs/REDESIGN.md`). Valem para TODAS as tarefas:

- **Mobile-first.** Validar em viewport ~390px. Alvos de toque ≥ 44px.
- **Zero lib runtime nova.** Só `motion` + `recharts`. Animação = SVG leve + keyframes CSS. **Nada de canvas/partículas/WebGL/Three.js/Lottie/GSAP.** (Test runner é devDep, permitido.)
- **Performance:** só `transform`/`opacity` (GPU); zero animação que dispare layout/reflow. Animações **pausam fora da viewport** (`IntersectionObserver`) e **respeitam `prefers-reduced-motion`** (viram estado estático). Meta LCP < 2.5s, sem regressão de CLS.
- **Paleta = base sóbria + EXATAMENTE 2 acentos semânticos:** `--color-attention #5be3c8` (frio = foco), `--color-meditation #f0a45b` (quente = calma). **Proibido** gradiente ciano→rosa em títulos. Roxo/dourado saem do core.
- **Tipografia:** display **Space Grotesk**, mono **JetBrains Mono** (rótulos/numerais), corpo **Inter** — via `next/font`.
- **Honestidade de dado:** a onda da landing é **demonstração** (dado sintético) e **deve estar rotulada como tal**. Nunca apresentar dado sintético como leitura real.
- **Limiar de foco:** vem de `metricsConfig.focusZoneThreshold` (`lib/site.ts`, hoje `60`, provisório D1). Fonte única, fácil de trocar.
- **Determinismo/SSR:** dado de demonstração é gerado por PRNG semeado (sem `Math.random()`/`Date.now()` em render) para evitar mismatch de hidratação.
- **Acessibilidade:** contraste AA; cor nunca é o único portador de significado (sempre acompanha rótulo/posição); foco visível mantido.
- **Idioma:** pt-BR. **Sem emojis em headings.**

---

## File Structure

**Criar:**
- `vitest.config.ts`, `vitest.setup.ts` — infra de teste.
- `lib/signal.ts` — lógica pura: gerador de série de demonstração + helper de zona de foco.
- `lib/signal.test.ts` — testes da lógica.
- `components/signal/SectionLabel.tsx` — rótulo de seção numerado (mono).
- `components/signal/SignalDivider.tsx` — divisor em forma de sinal.
- `components/signal/Readout.tsx` — readout numérico semântico.
- `components/signal/MetricBar.tsx` — barra semântica.
- `components/signal/InstrumentPanel.tsx` — casca de painel-instrumento (chrome).
- `components/signal/LiveSignal.tsx` — onda EEG (modos `demo`/`data`).
- `components/signal/NeuralField.tsx` — malha neural sutil de fundo.
- `components/signal/*.test.tsx` — testes de comportamento dos primitivos.

**Modificar:**
- `app/globals.css` — reescrever `@theme` (tokens), `@theme inline` (fontes), utilitários e keyframes.
- `app/layout.tsx` — trocar fontes (`Space_Grotesk` + `JetBrains_Mono` + `Inter`).
- `package.json` — devDeps + scripts de teste.
- `components/Reveal.tsx` — vocabulário de motion por papel.
- `components/ui/Button.tsx` — remover gradiente; primário = atenção sólida.
- `components/Logo.tsx` — remover par ciano/rosa.
- `components/Header.tsx` — nav mono, item ativo = atenção.
- `components/Footer.tsx` — tom instrumento (sem mudar conteúdo LGPD).
- `components/VoteBanner.tsx` — remover gradiente/emoji-barato.
- `components/QuoteCarousel.tsx` — remover gradiente; tom "leitura".
- `app/page.tsx` — reconstruir landing mobile-first.

**Não tocar nesta fase:** `app/sobre`, `app/equipe`, `app/login`, `app/cadastro`, `app/confirmar`, `app/dashboard`, `app/ranking`, `components/dashboard/*`, `components/auth/*`, `lib/supabase/*`, `proxy.ts`. (Tokens legados ficam definidos para essas páginas continuarem compilando — removidos nos planos B/C.)

## Estratégia de teste (por tipo de tarefa)

- **Lógica pura** (`lib/signal.ts`): **TDD real** — teste falhando primeiro, asserções concretas.
- **Primitivos de componente:** implementar + **1 teste de comportamento significativo** (classe semântica aplicada, rótulo de demonstração presente, fallback de `reduced-motion`). Gate = teste + `lint` + `build`.
- **Composição/reskin** (`page.tsx`, `Header`, `Footer`, `VoteBanner`, `QuoteCarousel`): gate = `lint` + `build` + **checklist visual manual** (390px + `reduced-motion`). Sem teste de DOM frágil.

Comandos de gate (rodar da raiz do projeto):
- `npm run test` → Vitest
- `npm run lint` → ESLint
- `npm run build` → build de produção Next

---

## Task 1: Infra de teste (Vitest + Testing Library)

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json` (devDeps + scripts)

**Interfaces:**
- Produces: comando `npm run test` (Vitest, jsdom, alias `@/`, matchers jest-dom, shims de `matchMedia`/`IntersectionObserver`). Consumido por todas as tarefas seguintes.

- [ ] **Step 1: Instalar devDeps**

```bash
npm install -D vitest@^3 @vitejs/plugin-react@^5 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14 jsdom@^25
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Criar `vitest.setup.ts`** (shims que o jsdom não tem)

```ts
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (!("IntersectionObserver" in window)) {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  // @ts-expect-error shim de teste
  window.IntersectionObserver = IntersectionObserverStub;
}
```

- [ ] **Step 4: Adicionar scripts em `package.json`**

No bloco `"scripts"`, adicionar:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 5: Smoke test do runner — criar `lib/signal.test.ts` temporário**

```ts
import { describe, it, expect } from "vitest";

describe("vitest infra", () => {
  it("roda", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Rodar e verificar PASS**

Run: `npm run test`
Expected: 1 arquivo, 1 teste, PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts lib/signal.test.ts
git commit -m "test: setup vitest + testing-library"
```

---

## Task 2: Design tokens + fontes

**Files:**
- Modify: `app/globals.css` (reescrever quase tudo)
- Modify: `app/layout.tsx` (fontes)

**Interfaces:**
- Produces: utilitários Tailwind `bg-bg`, `bg-bg-elev`, `bg-surface`, `border-hairline`, `border-border`, `text-fg`, `text-fg-strong`, `text-fg-muted`, `text-attention`/`bg-attention`/`border-attention`, `text-meditation`/`bg-meditation`, `font-display`, `font-mono`, `font-sans`. Keyframes/utilitários `.animate-signal-scan`, `.animate-signal-draw`. Tokens legados (`cyan/pink/purple/gold` + `.text-gradient`/`.bg-gradient-brand`/`.glow-*`) mantidos como DEPRECATED para as páginas ainda não migradas compilarem.

- [ ] **Step 1: Reescrever `app/globals.css`** (conteúdo completo)

```css
@import "tailwindcss";

/* ── Tokens "Telemetry" ─────────────────────────────────────────────── */
@theme {
  /* Superfícies (base sóbria, quase preta) */
  --color-bg: #0a0e13;
  --color-bg-elev: #10171f;
  --color-surface: #131c26;
  --color-hairline: #1d2935;
  --color-border: #26323f;

  /* Texto */
  --color-fg: #9fb1c5;
  --color-fg-strong: #eef6f3;
  --color-fg-muted: #7e94aa;

  /* Acentos SEMÂNTICOS (a regra de ouro: cor = informação) */
  --color-attention: #5be3c8;   /* frio — foco/atenção (acento primário) */
  --color-meditation: #f0a45b;  /* quente — calma/meditação */

  /* DEPRECATED — mantidos só p/ páginas ainda não migradas (planos B/C). NÃO usar em código novo. */
  --color-cyan: #38bdf8;
  --color-pink: #ff1f8f;
  --color-purple: #bf46f3;
  --color-gold: #ffd700;

  --radius-card: 0.875rem;
}

/* Fontes (next/font injeta as variáveis no <html>) */
@theme inline {
  --font-display: var(--font-space-grotesk);
  --font-mono: var(--font-jetbrains-mono);
  --font-sans: var(--font-inter);
}

@layer base {
  html {
    scroll-behavior: smooth;
  }
  body {
    background-color: var(--color-bg);
    color: var(--color-fg);
    font-family: var(--font-sans), system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  h1, h2, h3, h4 {
    font-family: var(--font-display), system-ui, sans-serif;
    color: var(--color-fg-strong);
    letter-spacing: -0.02em;
  }
  ::selection {
    background: color-mix(in srgb, var(--color-attention) 35%, transparent);
    color: var(--color-fg-strong);
  }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 9999px; }
  ::-webkit-scrollbar-track { background: var(--color-bg); }
}

@layer utilities {
  /* Glow sutil de foco (raro, nunca ambiente) */
  .glow-attention {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-attention) 28%, transparent),
      0 14px 44px -16px color-mix(in srgb, var(--color-attention) 50%, transparent);
  }

  /* Varredura horizontal contínua da onda (loop). Pausável via data-playing. */
  .animate-signal-scan { animation: signal-scan 7s linear infinite; }
  .animate-signal-scan[data-playing="false"] { animation-play-state: paused; }

  /* Linha "desenhando" (divisores / traçados de sinal) */
  .animate-signal-draw {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: signal-draw 1.1s ease-out forwards;
  }

  /* DEPRECATED — só p/ páginas legadas (planos B/C). NÃO usar em código novo. */
  .text-gradient {
    background-image: linear-gradient(90deg, var(--color-cyan), var(--color-pink));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .bg-gradient-brand {
    background-image: linear-gradient(90deg, var(--color-cyan), var(--color-pink));
  }
  .glow-cyan {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-cyan) 25%, transparent),
      0 12px 40px -12px color-mix(in srgb, var(--color-cyan) 45%, transparent);
  }
  .glow-pink {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-pink) 25%, transparent),
      0 12px 40px -12px color-mix(in srgb, var(--color-pink) 45%, transparent);
  }
}

@keyframes signal-scan {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes signal-draw {
  to { stroke-dashoffset: 0; }
}

/* Acessibilidade: respeitar quem prefere menos movimento */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Trocar fontes em `app/layout.tsx`** (substituir o topo do arquivo)

Substituir os imports e definições de fonte (linhas de `import { Poppins, Inter }` e os dois `const`) por:

```tsx
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
```

E no `<html>`, trocar o `className` para:

```tsx
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
```

- [ ] **Step 3: Build (gate desta tarefa)**

Run: `npm run build`
Expected: build conclui sem erro (páginas legadas ainda compilam via tokens DEPRECATED).

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat(design): tokens semânticos Telemetry + fontes (Space Grotesk/JetBrains Mono/Inter)"
```

---

## Task 2.5: Verificar contraste AA dos acentos

**Files:** nenhum (verificação; ajustar tokens da Task 2 se reprovar).

- [ ] **Step 1: Conferir contraste** de `--color-attention #5be3c8` e `--color-meditation #f0a45b` sobre `--color-bg #0a0e13` e `--color-surface #131c26`, e de `--color-fg #9fb1c5`/`--color-fg-muted #7e94aa` sobre as mesmas superfícies.

Usar um verificador WCAG (ex.: WebAIM Contrast Checker). Critério: texto normal ≥ 4.5:1, texto grande/UI ≥ 3:1. (Os acentos são claros sobre fundo escuro — espera-se aprovação folgada; `--color-fg-muted` em texto pequeno é o mais apertado.)

- [ ] **Step 2: Se algo reprovar**, clarear o token reprovado em `app/globals.css` (ex.: `--color-fg-muted` → `#8aa0b6`) e re-verificar. Rodar `npm run build`.

- [ ] **Step 3: Commit (somente se houve ajuste)**

```bash
git add app/globals.css
git commit -m "fix(design): ajuste de contraste AA dos tokens"
```

---

## Task 3: `lib/signal.ts` — lógica de sinal (TDD)

**Files:**
- Create: `lib/signal.ts`
- Test: `lib/signal.test.ts` (substitui o smoke da Task 1)

**Interfaces:**
- Consumes: `SeriesPoint` de `@/lib/metrics`.
- Produces:
  - `makeDemoSeries(options?: DemoSeriesOptions): SeriesPoint[]` — série sintética determinística (semeada). `DemoSeriesOptions = { points?: number; seed?: number }`. Default 60 pontos, `t` de 0..points-1, `attention`/`meditation` inteiros 0–100, nunca `null`.
  - `isInFocusZone(attention: number | null, threshold: number): boolean` — `false` se `null`; senão `attention >= threshold`.

- [ ] **Step 1: Escrever os testes (substituir o conteúdo de `lib/signal.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { makeDemoSeries, isInFocusZone } from "@/lib/signal";

describe("makeDemoSeries", () => {
  it("gera o número pedido de pontos com t sequencial", () => {
    const s = makeDemoSeries({ points: 10, seed: 1 });
    expect(s).toHaveLength(10);
    expect(s.map((p) => p.t)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("é determinístico para o mesmo seed (SSR === CSR)", () => {
    const a = makeDemoSeries({ points: 30, seed: 42 });
    const b = makeDemoSeries({ points: 30, seed: 42 });
    expect(a).toEqual(b);
  });

  it("difere com seeds diferentes", () => {
    const a = makeDemoSeries({ points: 30, seed: 1 });
    const b = makeDemoSeries({ points: 30, seed: 2 });
    expect(a).not.toEqual(b);
  });

  it("mantém attention/meditation entre 0 e 100 e não-nulos", () => {
    const s = makeDemoSeries({ points: 100, seed: 7 });
    for (const p of s) {
      expect(p.attention).not.toBeNull();
      expect(p.meditation).not.toBeNull();
      expect(p.attention as number).toBeGreaterThanOrEqual(0);
      expect(p.attention as number).toBeLessThanOrEqual(100);
      expect(p.meditation as number).toBeGreaterThanOrEqual(0);
      expect(p.meditation as number).toBeLessThanOrEqual(100);
    }
  });

  it("usa 60 pontos por padrão", () => {
    expect(makeDemoSeries()).toHaveLength(60);
  });
});

describe("isInFocusZone", () => {
  it("retorna false para null", () => {
    expect(isInFocusZone(null, 60)).toBe(false);
  });
  it("retorna true no limiar ou acima", () => {
    expect(isInFocusZone(60, 60)).toBe(true);
    expect(isInFocusZone(85, 60)).toBe(true);
  });
  it("retorna false abaixo do limiar", () => {
    expect(isInFocusZone(59, 60)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e verificar FAIL**

Run: `npm run test`
Expected: FAIL — `makeDemoSeries`/`isInFocusZone` não existem.

- [ ] **Step 3: Implementar `lib/signal.ts`**

```ts
import type { SeriesPoint } from "@/lib/metrics";

export interface DemoSeriesOptions {
  /** quantidade de amostras (default 60) */
  points?: number;
  /** semente do PRNG (default 7) — torna o resultado determinístico (SSR === CSR) */
  seed?: number;
}

/** PRNG determinístico (mulberry32). Evita Math.random() em render (mismatch de hidratação). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Série de telemetria SINTÉTICA para a onda de DEMONSTRAÇÃO da landing.
 * NÃO é leitura real — quem renderiza deve rotular como demonstração.
 */
export function makeDemoSeries(options: DemoSeriesOptions = {}): SeriesPoint[] {
  const points = options.points ?? 60;
  const rnd = mulberry32(options.seed ?? 7);
  const out: SeriesPoint[] = [];
  let attention = 55;
  let meditation = 45;
  for (let t = 0; t < points; t++) {
    // passeio suave + oscilação senoidal → curva orgânica de EEG
    attention = clamp(attention + (rnd() - 0.5) * 22 + Math.sin(t / 4) * 6, 12, 96);
    meditation = clamp(meditation + (rnd() - 0.5) * 16 + Math.cos(t / 6) * 4, 10, 80);
    out.push({ t, attention: Math.round(attention), meditation: Math.round(meditation) });
  }
  return out;
}

/** Uma amostra de atenção está "em foco" se >= limiar. null => false. */
export function isInFocusZone(attention: number | null, threshold: number): boolean {
  return attention != null && attention >= threshold;
}
```

- [ ] **Step 4: Rodar e verificar PASS**

Run: `npm run test`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/signal.ts lib/signal.test.ts
git commit -m "feat(signal): gerador determinístico de série de demonstração + zona de foco"
```

---

## Task 4: `SectionLabel`

**Files:**
- Create: `components/signal/SectionLabel.tsx`
- Test: `components/signal/SectionLabel.test.tsx`

**Interfaces:**
- Produces: `SectionLabel({ index?, children, className? }: { index?: number | string; children: ReactNode; className?: string })` — renderiza rótulo mono uppercase; se `index` dado, prefixa `NN —` com dois dígitos quando numérico.

- [ ] **Step 1: Implementar `components/signal/SectionLabel.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionLabel({
  index,
  children,
  className,
}: {
  index?: number | string;
  children: ReactNode;
  className?: string;
}) {
  const prefix =
    index === undefined
      ? null
      : typeof index === "number"
        ? String(index).padStart(2, "0")
        : index;
  return (
    <p
      className={cn(
        "font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em] text-fg-muted",
        className,
      )}
    >
      {prefix && <span className="text-attention">{prefix} — </span>}
      {children}
    </p>
  );
}
```

- [ ] **Step 2: Teste de comportamento `components/signal/SectionLabel.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionLabel } from "@/components/signal/SectionLabel";

describe("SectionLabel", () => {
  it("prefixa índice numérico com dois dígitos", () => {
    render(<SectionLabel index={2}>O Conceito</SectionLabel>);
    expect(screen.getByText(/02 —/)).toBeInTheDocument();
    expect(screen.getByText(/O Conceito/)).toBeInTheDocument();
  });

  it("sem índice não renderiza prefixo", () => {
    render(<SectionLabel>Sinal</SectionLabel>);
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Gate**

Run: `npm run test && npm run lint`
Expected: PASS, sem erros de lint.

- [ ] **Step 4: Commit**

```bash
git add components/signal/SectionLabel.tsx components/signal/SectionLabel.test.tsx
git commit -m "feat(signal): SectionLabel (rótulo de seção mono numerado)"
```

---

## Task 5: `SignalDivider`

**Files:**
- Create: `components/signal/SignalDivider.tsx`
- Test: `components/signal/SignalDivider.test.tsx`

**Interfaces:**
- Produces: `SignalDivider({ className? }: { className?: string })` — `<div role="separator">` com SVG de linha-sinal fina; traço entra via `.animate-signal-draw` (estático sob `reduced-motion`, tratado pela regra global do CSS).

- [ ] **Step 1: Implementar `components/signal/SignalDivider.tsx`**

```tsx
import { cn } from "@/lib/utils";

/** Divisor de seção em forma de sinal (linha viva fina). */
export function SignalDivider({ className }: { className?: string }) {
  return (
    <div role="separator" aria-hidden className={cn("w-full", className)}>
      <svg
        viewBox="0 0 1200 24"
        preserveAspectRatio="none"
        className="h-3 w-full"
      >
        <path
          d="M0 12 H420 l18 -8 l24 16 l20 -22 l18 14 H1200"
          fill="none"
          stroke="var(--color-attention)"
          strokeWidth="1.5"
          strokeOpacity="0.55"
          pathLength={1}
          className="animate-signal-draw"
        />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Teste `components/signal/SignalDivider.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SignalDivider } from "@/components/signal/SignalDivider";

describe("SignalDivider", () => {
  it("renderiza um separator", () => {
    render(<SignalDivider />);
    expect(screen.getByRole("separator", { hidden: true })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Gate**

Run: `npm run test && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/signal/SignalDivider.tsx components/signal/SignalDivider.test.tsx
git commit -m "feat(signal): SignalDivider (divisor em forma de sinal)"
```

---

## Task 6: `Readout`

**Files:**
- Create: `components/signal/Readout.tsx`
- Test: `components/signal/Readout.test.tsx`

**Interfaces:**
- Produces: `Readout({ label, value, kind?, suffix?, className? }: { label: string; value: ReactNode; kind?: "attention" | "meditation" | "neutral"; suffix?: string; className?: string })` — rótulo mono + valor grande em Space Grotesk colorido por `kind` (default `neutral` = `fg-strong`).

- [ ] **Step 1: Implementar `components/signal/Readout.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const valueColor = {
  attention: "text-attention",
  meditation: "text-meditation",
  neutral: "text-fg-strong",
} as const;

export function Readout({
  label,
  value,
  kind = "neutral",
  suffix,
  className,
}: {
  label: string;
  value: ReactNode;
  kind?: "attention" | "meditation" | "neutral";
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.14em] text-fg-muted">
        {label}
      </span>
      <span className={cn("font-display text-2xl font-bold leading-none", valueColor[kind])}>
        {value}
        {suffix && <span className="ml-0.5 text-base font-medium text-fg-muted">{suffix}</span>}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Teste `components/signal/Readout.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Readout } from "@/components/signal/Readout";

describe("Readout", () => {
  it("mostra rótulo e valor", () => {
    render(<Readout label="Atenção" value="0.78" kind="attention" />);
    expect(screen.getByText("Atenção")).toBeInTheDocument();
    expect(screen.getByText("0.78")).toBeInTheDocument();
  });

  it("aplica a cor semântica de meditação", () => {
    render(<Readout label="Meditação" value="0.41" kind="meditation" />);
    expect(screen.getByText("0.41")).toHaveClass("text-meditation");
  });
});
```

- [ ] **Step 3: Gate**

Run: `npm run test && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/signal/Readout.tsx components/signal/Readout.test.tsx
git commit -m "feat(signal): Readout (leitura numérica semântica)"
```

---

## Task 7: `MetricBar`

**Files:**
- Create: `components/signal/MetricBar.tsx`
- Test: `components/signal/MetricBar.test.tsx`

**Interfaces:**
- Produces: `MetricBar({ label, value, max?, kind?, className? }: { label: string; value: number; max?: number; kind?: "attention" | "meditation"; className?: string })` — barra horizontal; preenchimento = `clamp(value/max)`; cor por `kind` (default `attention`). `max` default 100.

- [ ] **Step 1: Implementar `components/signal/MetricBar.tsx`**

```tsx
import { cn } from "@/lib/utils";

const fillColor = {
  attention: "bg-attention",
  meditation: "bg-meditation",
} as const;

export function MetricBar({
  label,
  value,
  max = 100,
  kind = "attention",
  className,
}: {
  label: string;
  value: number;
  max?: number;
  kind?: "attention" | "meditation";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-center justify-between font-mono text-[0.7rem] text-fg">
        <span>{label}</span>
        <span className={kind === "meditation" ? "text-meditation" : "text-attention"}>
          {Math.round(value)}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-hairline"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div className={cn("h-full rounded-full", fillColor[kind])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Teste `components/signal/MetricBar.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricBar } from "@/components/signal/MetricBar";

describe("MetricBar", () => {
  it("expõe o valor via progressbar acessível", () => {
    render(<MetricBar label="Foco médio" value={72} />);
    const bar = screen.getByRole("progressbar", { name: "Foco médio" });
    expect(bar).toHaveAttribute("aria-valuenow", "72");
  });
});
```

- [ ] **Step 3: Gate**

Run: `npm run test && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/signal/MetricBar.tsx components/signal/MetricBar.test.tsx
git commit -m "feat(signal): MetricBar (barra semântica acessível)"
```

---

## Task 8: `InstrumentPanel`

**Files:**
- Create: `components/signal/InstrumentPanel.tsx`
- Test: `components/signal/InstrumentPanel.test.tsx`

**Interfaces:**
- Produces: `InstrumentPanel({ title?, live?, children, className? }: { title?: string; live?: boolean; children: ReactNode; className?: string })` — casca com fio 1px, raio de card, header mono opcional; quando `live`, mostra "AO VIVO" com ponto pulsante (`.animate-signal-scan` não; ponto usa um pulse simples via classe utilitária `animate-pulse` do Tailwind core).

- [ ] **Step 1: Implementar `components/signal/InstrumentPanel.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function InstrumentPanel({
  title,
  live = false,
  children,
  className,
}: {
  title?: string;
  live?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface",
        className,
      )}
    >
      {(title || live) && (
        <div className="flex items-center justify-between border-b border-hairline px-3 py-2.5 font-mono text-[0.62rem] font-bold uppercase tracking-[0.14em] text-fg-muted">
          <span>{title}</span>
          {live && (
            <span className="flex items-center gap-1.5 text-attention">
              <span className="h-1.5 w-1.5 rounded-full bg-attention motion-safe:animate-pulse" />
              Ao vivo
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Teste `components/signal/InstrumentPanel.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InstrumentPanel } from "@/components/signal/InstrumentPanel";

describe("InstrumentPanel", () => {
  it("mostra header 'Ao vivo' quando live", () => {
    render(
      <InstrumentPanel title="Sinal" live>
        <p>conteúdo</p>
      </InstrumentPanel>,
    );
    expect(screen.getByText(/Ao vivo/i)).toBeInTheDocument();
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("sem title/live não renderiza header", () => {
    render(
      <InstrumentPanel>
        <p>só corpo</p>
      </InstrumentPanel>,
    );
    expect(screen.queryByText(/Ao vivo/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Gate**

Run: `npm run test && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/signal/InstrumentPanel.tsx components/signal/InstrumentPanel.test.tsx
git commit -m "feat(signal): InstrumentPanel (casca de painel-instrumento)"
```

---

## Task 9: `LiveSignal` (onda EEG — peça central)

**Files:**
- Create: `components/signal/LiveSignal.tsx`
- Test: `components/signal/LiveSignal.test.tsx`

**Interfaces:**
- Consumes: `makeDemoSeries`, `isInFocusZone` de `@/lib/signal`; `SeriesPoint` de `@/lib/metrics`; `metricsConfig` de `@/lib/site`.
- Produces: `LiveSignal({ mode?, series?, threshold?, height?, className? }: { mode?: "demo" | "data"; series?: SeriesPoint[]; threshold?: number; height?: number; className?: string })`.
  - `mode="demo"` (default): gera série via `makeDemoSeries` (seed fixo), **renderiza badge "demonstração"**, e a onda faz varredura contínua (`.animate-signal-scan`), pausando fora da viewport.
  - `mode="data"`: usa `series` recebida, **sem** varredura (replay estático) e **sem** badge de demonstração.
  - `threshold` default = `metricsConfig.focusZoneThreshold`. Desenha a linha tracejada "Zona de foco".

- [ ] **Step 1: Implementar `components/signal/LiveSignal.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SeriesPoint } from "@/lib/metrics";
import { makeDemoSeries } from "@/lib/signal";
import { metricsConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const VB_W = 1000;
const VB_H = 200;

/** Converte uma série em string de pontos para <polyline>, normalizando t e valor. */
function toPoints(series: SeriesPoint[], key: "attention" | "meditation"): string {
  const n = series.length;
  if (n < 2) return "";
  return series
    .map((p, i) => {
      const x = (i / (n - 1)) * VB_W;
      const v = p[key] ?? 0;
      const y = VB_H - (v / 100) * VB_H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function LiveSignal({
  mode = "demo",
  series,
  threshold = metricsConfig.focusZoneThreshold,
  height = 200,
  className,
}: {
  mode?: "demo" | "data";
  series?: SeriesPoint[];
  threshold?: number;
  height?: number;
  className?: string;
}) {
  const data = useMemo<SeriesPoint[]>(
    () => (mode === "demo" ? makeDemoSeries({ points: 64, seed: 11 }) : (series ?? [])),
    [mode, series],
  );

  const attPoints = useMemo(() => toPoints(data, "attention"), [data]);
  const medPoints = useMemo(() => toPoints(data, "meditation"), [data]);
  const thresholdY = VB_H - (threshold / 100) * VB_H;

  // Pausa a varredura fora da viewport (perf no mobile).
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scanning = mode === "demo";

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)} style={{ height }}>
      {/* grade de instrumento */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--color-hairline) 0 1px, transparent 1px 56px), repeating-linear-gradient(0deg, var(--color-hairline) 0 1px, transparent 1px 32px)",
        }}
      />
      {/* badge de honestidade (só demo) */}
      {mode === "demo" && (
        <span className="absolute right-2 top-2 z-10 rounded bg-bg/70 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-fg-muted">
          demonstração
        </span>
      )}

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={
          mode === "demo"
            ? "Demonstração animada de um sinal de atenção e meditação"
            : "Replay do sinal de atenção e meditação da corrida"
        }
      >
        {/* linha de zona de foco */}
        <line
          x1="0"
          x2={VB_W}
          y1={thresholdY}
          y2={thresholdY}
          stroke="var(--color-fg-muted)"
          strokeWidth="1"
          strokeDasharray="6 6"
          opacity="0.6"
        />
        {/* grupo que rola (200% de largura = série duplicada) para loop sem emenda */}
        <g
          className={scanning ? "animate-signal-scan" : undefined}
          data-playing={scanning ? String(visible) : undefined}
        >
          {[0, VB_W].map((dx) => (
            <g key={dx} transform={`translate(${dx} 0)`}>
              <polyline
                points={medPoints}
                fill="none"
                stroke="var(--color-meditation)"
                strokeWidth="2"
                strokeOpacity="0.7"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={attPoints}
                fill="none"
                stroke="var(--color-attention)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </g>
      </svg>

      <span
        className="pointer-events-none absolute left-2 top-2 z-10 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-fg-muted"
        style={{ transform: `translateY(${(thresholdY / VB_H) * 100}%)` }}
        aria-hidden
      >
        Zona de foco
      </span>
    </div>
  );
}
```

> Nota: o grupo `.animate-signal-scan` translada `-50%`; como há duas cópias da série lado a lado (`dx = 0` e `dx = VB_W`), o loop é contínuo sem emenda. Sob `prefers-reduced-motion` a regra global congela a animação (vira estático). `data-playing="false"` pausa quando fora da viewport.

- [ ] **Step 2: Teste `components/signal/LiveSignal.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveSignal } from "@/components/signal/LiveSignal";

describe("LiveSignal", () => {
  it("modo demo mostra o rótulo de demonstração (honestidade de dado)", () => {
    render(<LiveSignal mode="demo" />);
    expect(screen.getByText(/demonstração/i)).toBeInTheDocument();
  });

  it("modo data NÃO mostra rótulo de demonstração", () => {
    render(
      <LiveSignal
        mode="data"
        series={[
          { t: 0, attention: 50, meditation: 40 },
          { t: 1, attention: 70, meditation: 35 },
        ]}
      />,
    );
    expect(screen.queryByText(/demonstração/i)).not.toBeInTheDocument();
  });

  it("desenha a zona de foco", () => {
    render(<LiveSignal mode="demo" />);
    expect(screen.getByText(/Zona de foco/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Gate**

Run: `npm run test && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/signal/LiveSignal.tsx components/signal/LiveSignal.test.tsx
git commit -m "feat(signal): LiveSignal (onda EEG demo/data, pausa offscreen, rótulo de honestidade)"
```

---

## Task 10: `NeuralField` (malha de fundo sutil)

**Files:**
- Create: `components/signal/NeuralField.tsx`
- Test: `components/signal/NeuralField.test.tsx`

**Interfaces:**
- Produces: `NeuralField({ className? }: { className?: string })` — SVG decorativo (`aria-hidden`) de malha neural fixa e leve, com nós em pulso sutil (`motion-safe:animate-pulse`). Sem JS de animação; respeita `reduced-motion` via `motion-safe`. Uso comedido (fundo de hero/seção-chave).

- [ ] **Step 1: Implementar `components/signal/NeuralField.tsx`**

```tsx
import { cn } from "@/lib/utils";

const NODES = [
  [80, 60], [200, 120], [340, 70], [300, 230], [470, 150], [540, 60], [120, 210],
] as const;
const EDGES = [
  [0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5], [0, 6], [6, 3],
] as const;

/** Malha neural sutil de fundo. Decorativa, leve, respeita reduced-motion. */
export function NeuralField({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 300"
      preserveAspectRatio="xMidYMid slice"
      className={cn("pointer-events-none text-attention", className)}
    >
      <g stroke="currentColor" strokeWidth="1" opacity="0.18">
        {EDGES.map(([a, b], i) => (
          <line
            key={i}
            x1={NODES[a][0]}
            y1={NODES[a][1]}
            x2={NODES[b][0]}
            y2={NODES[b][1]}
          />
        ))}
      </g>
      <g fill="currentColor">
        {NODES.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i % 3 === 0 ? 4 : 2.5}
            opacity="0.5"
            className="motion-safe:animate-pulse"
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        ))}
      </g>
    </svg>
  );
}
```

- [ ] **Step 2: Teste `components/signal/NeuralField.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NeuralField } from "@/components/signal/NeuralField";

describe("NeuralField", () => {
  it("renderiza decorativo (aria-hidden)", () => {
    const { container } = render(<NeuralField />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden");
    expect(container.querySelectorAll("circle").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Gate**

Run: `npm run test && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/signal/NeuralField.tsx components/signal/NeuralField.test.tsx
git commit -m "feat(signal): NeuralField (malha neural sutil de fundo)"
```

---

## Task 11: Refactor `Reveal` (motion por papel)

**Files:**
- Modify: `components/Reveal.tsx` (reescrever)
- Test: `components/Reveal.test.tsx` (criar)

**Interfaces:**
- Produces: `Reveal({ children, delay?, className?, variant? }: { children: ReactNode; delay?: number; className?: string; variant?: "rise" | "label" })`. Backward-compatible (callers atuais passam `delay`/`className`). `variant="label"` entra mais curto/discreto (rótulos); `rise` (default) é o slide-up de conteúdo. Mantém `prefers-reduced-motion` (motion respeita via `MotionConfig`? — aqui simplificado: distância pequena + once).

- [ ] **Step 1: Reescrever `components/Reveal.tsx`**

```tsx
"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

const variants = {
  rise: { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, duration: 0.5 },
  label: { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, duration: 0.35 },
} as const;

/**
 * Entrada por papel. `rise` = blocos de conteúdo; `label` = rótulos/numerais (mais curto).
 * Distâncias curtas + viewport once = barato e respeita prefers-reduced-motion no CSS global.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  variant = "rise",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  variant?: "rise" | "label";
}) {
  const v = variants[variant];
  return (
    <motion.div
      className={className}
      initial={v.initial}
      whileInView={v.animate}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: v.duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Teste `components/Reveal.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Reveal } from "@/components/Reveal";

describe("Reveal", () => {
  it("renderiza os filhos", () => {
    render(<Reveal>conteúdo revelado</Reveal>);
    expect(screen.getByText("conteúdo revelado")).toBeInTheDocument();
  });

  it("aceita a variante label", () => {
    render(<Reveal variant="label">rótulo</Reveal>);
    expect(screen.getByText("rótulo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Gate**

Run: `npm run test && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/Reveal.tsx components/Reveal.test.tsx
git commit -m "refactor(reveal): variantes de motion por papel (rise/label)"
```

---

## Task 12: Refactor `ui/Button` (sem gradiente)

**Files:**
- Modify: `components/ui/Button.tsx` (apenas `base` e `variants`)

**Interfaces:**
- Produces: mesmos exports `buttonClass(variant, className)` e `ButtonLink`. Primário = `bg-attention` sólido com texto escuro; secundário = fio + texto; ghost igual. Sem `bg-gradient-brand`/`glow-cyan`.

- [ ] **Step 1: Substituir `base` e `variants` em `components/ui/Button.tsx`**

```tsx
const base =
  "inline-flex items-center justify-center gap-2 rounded-[0.7rem] px-5 py-3 font-display font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-attention disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-attention text-bg hover:-translate-y-0.5 hover:glow-attention",
  secondary:
    "border border-border bg-surface/50 text-fg-strong hover:border-attention hover:text-attention",
  ghost: "text-fg hover:text-fg-strong",
};
```

- [ ] **Step 2: Gate**

Run: `npm run lint && npm run build`
Expected: PASS (botão usado em várias páginas; todas devem compilar).

- [ ] **Step 3: Commit**

```bash
git add components/ui/Button.tsx
git commit -m "refactor(button): primário = atenção sólida, sem gradiente"
```

---

## Task 13: Refactor `Logo` (sem par ciano/rosa)

**Files:**
- Modify: `components/Logo.tsx` (apenas o `<span>` do texto)

**Interfaces:**
- Produces: mesmo export `Logo`. `NEURO` em `fg-strong`, `RACE` em `attention`.

- [ ] **Step 1: Substituir o bloco do nome em `components/Logo.tsx`**

```tsx
      <span className="font-display text-xl font-extrabold tracking-tight">
        <span className="text-fg-strong">NEURO</span>
        <span className="text-attention">RACE</span>
      </span>
```

- [ ] **Step 2: Gate**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/Logo.tsx
git commit -m "refactor(logo): NEURORACE sem gradiente (atenção como único acento)"
```

---

## Task 14: Reskin `Header` (nav mono, ativo = atenção)

**Files:**
- Modify: `components/Header.tsx` (`NavItem`, drawer item ativo, `AuthChip` avatar)

**Interfaces:**
- Produces: mesmos exports/comportamento; só estilo. Item ativo = `text-attention`; itens em `font-mono` discreto; avatar do `AuthChip` deixa de usar `bg-gradient-brand`.

- [ ] **Step 1: Substituir o `className` do `Link` em `NavItem`**

```tsx
      className={cn(
        "rounded-lg px-3 py-2 font-mono text-[0.78rem] font-medium uppercase tracking-wide transition-colors",
        active ? "text-attention" : "text-fg hover:text-fg-strong",
      )}
```

- [ ] **Step 2: No drawer mobile, trocar o estado ativo** (no `cn(...)` do `Link` dentro do `AnimatePresence`)

Substituir `pathname === link.href ? "bg-card text-cyan"` por:

```tsx
                      ? "bg-surface text-attention"
```

(e manter o restante `: "text-fg hover:bg-surface hover:text-fg-strong"` — trocar `hover:bg-card` por `hover:bg-surface`.)

- [ ] **Step 3: No `AuthChip`, trocar o avatar gradiente**

Substituir `className="... bg-gradient-brand text-bg ..."` do `<span>` do avatar por:

```tsx
        <span className="grid h-7 w-7 place-items-center rounded-full bg-attention text-sm font-bold text-bg">
```

E no `<Link>` do chip, trocar `bg-card/40` por `bg-surface/50`.

- [ ] **Step 4: Gate**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/Header.tsx
git commit -m "refactor(header): nav mono, ativo = atenção, avatar sem gradiente"
```

---

## Task 15: Reskin `Footer`, `VoteBanner`, `QuoteCarousel`

**Files:**
- Modify: `components/Footer.tsx`, `components/VoteBanner.tsx`, `components/QuoteCarousel.tsx`

**Interfaces:**
- Produces: mesmos exports/comportamento. Sem `bg-gradient-brand`/`text-gradient`; sem emoji-barato; tom instrumento.

- [ ] **Step 1: `VoteBanner.tsx` — trocar o wrapper e o conteúdo** (substituir o `return`)

```tsx
  return (
    <div className="border-b border-hairline bg-bg-elev text-fg">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-5 py-2.5 text-center font-mono text-xs uppercase tracking-wide">
        {active ? (
          <a
            href={site.event.voteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-attention px-4 py-1 font-semibold text-bg transition-transform hover:scale-[1.03]"
          >
            Votar no NeuroRace
          </a>
        ) : (
          <span className="text-fg-muted">
            Votação <span className="text-attention">em breve</span> · {site.event.name}
          </span>
        )}
      </div>
    </div>
  );
```

- [ ] **Step 2: `QuoteCarousel.tsx` — remover gradiente das aspas** (no `<motion.p>`)

Substituir os dois `<span className="text-gradient">` (aspas) por `<span className="text-attention">`. Manter o resto. E na barra de dots, trocar `bg-gradient-brand` por `bg-attention`:

```tsx
              i === index ? "w-6 bg-attention" : "w-2 bg-border hover:bg-fg-muted",
```

- [ ] **Step 3: `Footer.tsx` — tom instrumento** (trocar borda e a linha do nome)

Trocar `border-border/60` por `border-hairline`. Trocar a linha do `tagline` para mono discreto:

```tsx
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-fg-muted">
          © {year} {site.name} — {site.tagline}
        </p>
```

(Manter intacto o bloco LGPD e datas.)

- [ ] **Step 4: Gate**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/Footer.tsx components/VoteBanner.tsx components/QuoteCarousel.tsx
git commit -m "refactor(shell): VoteBanner/QuoteCarousel/Footer no tom Telemetry (sem gradiente)"
```

---

## Task 16: Reconstruir a landing (`app/page.tsx`) mobile-first

**Files:**
- Modify: `app/page.tsx` (reescrever)

**Interfaces:**
- Consumes: `VoteBanner`, `QuoteCarousel`, `Reveal`, `ButtonLink`, `site`, e os primitivos `SectionLabel`, `LiveSignal`, `Readout`, `SignalDivider`, `NeuralField`, `InstrumentPanel`. Imagens do mascote mantidas.

- [ ] **Step 1: Reescrever `app/page.tsx`** (conteúdo completo)

```tsx
import Image from "next/image";
import { VoteBanner } from "@/components/VoteBanner";
import { QuoteCarousel } from "@/components/QuoteCarousel";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SectionLabel } from "@/components/signal/SectionLabel";
import { SignalDivider } from "@/components/signal/SignalDivider";
import { LiveSignal } from "@/components/signal/LiveSignal";
import { Readout } from "@/components/signal/Readout";
import { InstrumentPanel } from "@/components/signal/InstrumentPanel";
import { NeuralField } from "@/components/signal/NeuralField";
import { site } from "@/lib/site";
import mascotWinner from "@/public/assets/images/mascot-winner.png";
import concentracao from "@/public/assets/images/concentracao.png";

export default function Home() {
  return (
    <>
      <VoteBanner />

      {/* ── Hero (mobile-first: título → onda → readout → CTAs) ── */}
      <section className="relative overflow-hidden border-b border-hairline">
        <NeuralField className="absolute inset-0 h-full w-full opacity-60" />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:py-24">
          <Reveal variant="label">
            <SectionLabel>// Neurofeedback Engine · {site.event.name}</SectionLabel>
          </Reveal>
          <Reveal>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
              Sua mente,
              <br />
              medida em <span className="text-attention">tempo real</span>
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-5 max-w-md text-base leading-relaxed text-fg sm:text-lg">
              Um jogo movido pelo seu foco. Conecte o sensor NeuroSky e veja sua
              atenção virar desempenho — sem mouse, sem teclado.
            </p>
          </Reveal>

          <Reveal delay={0.16} className="mt-8">
            <InstrumentPanel title="Sinal ao vivo" live>
              <LiveSignal mode="demo" height={180} />
              <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline">
                <Readout className="p-4" label="Atenção" value="0.78" kind="attention" />
                <Readout className="p-4" label="Meditação" value="0.41" kind="meditation" />
              </div>
            </InstrumentPanel>
          </Reveal>

          <Reveal delay={0.24} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/sobre">Conheça o projeto</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Meu desempenho
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      <QuoteCarousel />

      {/* ── Conceito ── */}
      <section className="bg-bg-elev py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal variant="label">
            <SectionLabel index={2}>O Conceito</SectionLabel>
          </Reveal>
          <Reveal>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
              Quando seu <span className="text-attention">foco</span> vira controle
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg sm:text-lg">
              O sensor <strong className="text-fg-strong">NeuroSky</strong> lê suas
              ondas cerebrais em tempo real. Quanto maior a concentração, melhor o
              desempenho — e tudo fica registrado pra você revisitar depois.
            </p>
          </Reveal>
          <Reveal delay={0.12} className="mt-10 flex justify-center">
            <Image
              src={concentracao}
              alt="Demonstração de concentração"
              className="h-auto w-full max-w-xs"
            />
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-5">
        <SignalDivider className="py-2" />
      </div>

      {/* ── Já jogou? ── */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <Reveal variant="label">
            <SectionLabel index={3} className="!text-center">Já jogou?</SectionLabel>
          </Reveal>
          <Reveal>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
              Confira como você <span className="text-attention">mandou bem</span>
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-4 text-base text-fg sm:text-lg">
              Depois de jogar no estande, volte aqui e veja o replay do seu foco.
            </p>
          </Reveal>
          <Reveal delay={0.16} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/dashboard">Conferir meu desempenho</ButtonLink>
            <ButtonLink href="/ranking" variant="secondary">
              Ver o ranking
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      {/* ── NEXT FIAP ── */}
      <section className="bg-bg-elev py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2">
          <div>
            <Reveal variant="label">
              <SectionLabel index={4}>{site.event.name}</SectionLabel>
            </Reveal>
            <Reveal>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                Feito para o palco
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="mt-4 leading-relaxed text-fg">
                O NEXT é o maior festival de inovação e tecnologia da FIAP. O
                NeuroRace combina{" "}
                <span className="text-attention">neurociência</span>, tecnologia e
                gamificação numa experiência única.
              </p>
            </Reveal>
            <Reveal delay={0.16} className="mt-8">
              <ButtonLink
                href="https://www.fiap.com.br/acontece/next-fiap-festival/"
                variant="secondary"
                target="_blank"
              >
                Conheça o NEXT FIAP Festival
              </ButtonLink>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="flex justify-center">
            <Image
              src={mascotWinner}
              alt="Mascote do NeuroRace vencedor"
              className="h-auto w-full max-w-xs"
            />
          </Reveal>
        </div>
      </section>

      {/* ── Convite ao estande ── */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <h3 className="font-display text-2xl font-bold">
              Pronto para testar sua concentração?
            </h3>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-3 text-fg">
              Visite nosso stand no {site.event.name}. Conecte o sensor NeuroSky e
              assuma o controle.
            </p>
          </Reveal>
          <Reveal delay={0.16} className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="rounded-full border border-hairline px-4 py-1.5 font-mono text-xs uppercase tracking-wide text-fg-muted">
              #NeuroRace
            </span>
            <span className="rounded-full border border-hairline px-4 py-1.5 font-mono text-xs uppercase tracking-wide text-fg-muted">
              #NEXTFIAP
            </span>
          </Reveal>
          <Reveal delay={0.24} className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href={site.social.linkedinShare}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-wide text-fg-muted transition-colors hover:text-attention"
            >
              LinkedIn
            </a>
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-wide text-fg-muted transition-colors hover:text-attention"
            >
              Instagram
            </a>
            <a
              href={site.social.twitterShare}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-wide text-fg-muted transition-colors hover:text-attention"
            >
              X (Twitter)
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Gate de build/lint**

Run: `npm run lint && npm run build`
Expected: PASS. (O mascote running do hero v1 saiu de cena — `mascot-running.png` deixa de ser importado aqui; sem warning de import não usado.)

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(landing): reconstrói a home mobile-first no sistema Telemetry"
```

---

## Task 17: Verificação final (gate de "pronto")

**Files:** nenhum (verificação manual; abrir issues/correções pontuais se algo falhar).

- [ ] **Step 1: Suite + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: tudo PASS.

- [ ] **Step 2: Rodar o dev e conferir no viewport ~390px**

Run: `npm run dev` → abrir `http://localhost:3000` em DevTools com largura 390px.
Conferir: hero empilha (label → título → painel da onda → readouts → CTAs); a onda anima suave; CTAs full-width; alvos ≥ 44px; nada estoura na horizontal.

- [ ] **Step 3: `prefers-reduced-motion`**

No DevTools (Rendering → Emulate CSS prefers-reduced-motion: reduce), recarregar: a onda e a malha ficam **estáticas** (sem varredura/pulse), conteúdo legível.

- [ ] **Step 4: Honestidade de dado**

Confirmar que o painel da onda na landing exibe o rótulo **"demonstração"** e que nenhum número é apresentado como leitura real.

- [ ] **Step 5: Lighthouse mobile**

DevTools → Lighthouse → Mobile → Performance. Conferir LCP < 2.5s e ausência de regressão grosseira de CLS/perf. Anotar o número no commit/PR.

- [ ] **Step 6: Contraste**

Reconfirmar (rápido) que textos de acento (`attention`/`meditation`) e `fg-muted` sobre as superfícies passam AA (já tratado na Task 2.5; recheck visual nos componentes reais).

- [ ] **Step 7: Commit de fechamento (se houve ajustes)**

```bash
git add -A
git commit -m "chore(landing): ajustes finais de verificação (perf/a11y/390px)"
```

---

## Self-Review (executado na escrita do plano)

**1. Cobertura do spec (`docs/REDESIGN.md`):**
- §3.1 tokens → Task 2 ✓ · §3.2 fontes → Task 2 ✓ · §3.3 chrome (rótulos/fios/ticks) → Tasks 4/8 ✓ · §3.4 motion → Tasks 9/11 + keyframes Task 2 ✓
- §4 componentes-assinatura → Tasks 4–10 (`SectionLabel`, `SignalDivider`, `Readout`, `MetricBar`, `InstrumentPanel`, `LiveSignal`, `NeuralField`) ✓; refactors `Reveal`/`Button`/`Logo`/`Header`/`VoteBanner`/`QuoteCarousel` → Tasks 11–15 ✓. (`ReplayChart` é Fase C — fora desta fase, conforme escopo.)
- §5 Fase A landing → Task 16 ✓ (Fases B/C são planos próprios)
- §6 honestidade/limiar → Task 9 (badge demo + `metricsConfig.focusZoneThreshold`) ✓
- §7 perf/mobile → Constraints globais + Tasks 9 (offscreen/reduced-motion) + 17 ✓
- §8 a11y → Tasks 2.5 (contraste), 7 (progressbar), 17 ✓
- §12 verificação → Task 17 ✓

**2. Placeholders:** nenhum "TBD/TODO"; todo passo tem código/comando reais. ✓

**3. Consistência de tipos:** `SeriesPoint` (de `lib/metrics.ts`) usado igual em `signal.ts` e `LiveSignal`. `makeDemoSeries`/`isInFocusZone` com mesma assinatura na definição (Task 3) e consumo (Task 9). `kind: "attention" | "meditation" | "neutral"` consistente em `Readout`; `"attention" | "meditation"` em `MetricBar`/fills. `buttonClass`/`ButtonLink` preservados. ✓

**Lacuna conhecida e aceita:** componentes legados (dashboard/auth/sobre/equipe) seguem em tokens DEPRECATED até os planos B/C; build permanece verde porque os tokens/utilitários legados continuam definidos na Task 2.
