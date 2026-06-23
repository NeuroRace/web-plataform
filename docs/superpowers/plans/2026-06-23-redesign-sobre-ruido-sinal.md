# Redesign "O Projeto" (/sobre) — Ruído → Sinal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir a página `/sobre` como um scroll cinematográfico de 6 cenas que narra a transformação "ruído (crise da atenção) → sinal (foco)", dentro/estendendo o sistema visual Telemetry.

**Architecture:** Duas peças novas em `components/signal/` — `CinematicSection` (casca de cena tela-cheia, server component, com contador sticky) e `NoiseField` (campo de ruído decorativo, client, pausa offscreen). Uma função pura semeada `makeNoiseSegments` em `lib/signal.ts` (TDD, reusa o `mulberry32` já existente). `app/sobre/page.tsx` é recomposto com esses componentes + reuso de `LiveSignal`, `Readout`, `SectionLabel`, `Reveal`, `ButtonLink`.

**Tech Stack:** Next 16 (App Router) · React 19 · TypeScript · Tailwind v4 · `motion` · `next/font`. Testes: Vitest + Testing Library.

## Global Constraints

Copiados verbatim do spec (`docs/superpowers/specs/2026-06-23-redesign-sobre-ruido-sinal-design.md`). Valem para TODAS as tarefas:

- **Mobile-first.** Validar em ~390px. Alvos de toque ≥ 44px.
- **Zero lib runtime nova.** Só `motion` (já no projeto). Animação = SVG leve + keyframes CSS. **Nada de canvas/partículas/WebGL/Three.js/Lottie/GSAP.**
- **Performance:** só `transform`/`opacity` (GPU); zero animação que dispare layout/reflow. Animações **pausam fora da viewport** (`IntersectionObserver`) e **respeitam `prefers-reduced-motion`** (ruído/onda viram estáticos). Meta LCP < 2.5s, sem regressão de CLS.
- **Paleta = base sóbria + EXATAMENTE 2 acentos semânticos:** `--color-attention #5be3c8` (frio = foco), `--color-meditation #f0a45b` (quente = calma). Ruído usa neutros existentes (`fg-muted`). **Proibido** gradiente ciano→rosa; **proibidos** os tokens DEPRECATED (`cyan/pink/purple/gold/card`, `.text-gradient`, `.bg-gradient-brand`, `.glow-cyan/pink`) nesta página.
- **Tipografia:** display **Space Grotesk**, mono **JetBrains Mono** (rótulos/contadores), corpo **Inter** — via `next/font` (já configurado).
- **Honestidade de dado:** a onda da cena 03 é **demonstração** (`LiveSignal mode="demo"`, badge "demonstração" mantido). Nunca apresentar dado sintético como leitura real.
- **Determinismo/SSR:** posições do ruído via função pura semeada (sem `Math.random()`/`Date.now()` em render).
- **Acessibilidade:** contraste AA; cor nunca é o único portador de significado (sempre rótulo/posição); foco visível; decorativo `aria-hidden`. Usar `min-h-[100svh]` (não `100vh`).
- **Idioma:** pt-BR. **Sem emojis em headings.**

Comandos de gate (rodar da raiz `E:\projetos_breq\neurorace-v2`):
- `npm run test` → Vitest (ou `npx vitest run <arquivo>` para um só)
- `npm run lint` → ESLint
- `npm run build` → build de produção Next

## File Structure

**Criar:**
- `components/signal/CinematicSection.tsx` — casca de cena tela-cheia (server).
- `components/signal/CinematicSection.test.tsx` — teste de comportamento.
- `components/signal/NoiseField.tsx` — campo de ruído decorativo (client, pausa offscreen).
- `components/signal/NoiseField.test.tsx` — teste de comportamento.

**Modificar:**
- `lib/signal.ts` — adicionar `NoiseSegment` + `makeNoiseSegments` (reusa `mulberry32`).
- `lib/signal.test.ts` — adicionar testes de `makeNoiseSegments`.
- `app/globals.css` — adicionar utilitário/keyframe `.animate-noise-drift` (NÃO mexe em tokens).
- `app/sobre/page.tsx` — reconstruir nas 6 cenas; remover tokens depreciados.

**Não tocar:** tokens do `@theme` em `app/globals.css`, demais páginas, `components/signal/*` existentes, `lib/supabase/*`, `proxy.ts`, dados/auth.

---

## Task 1: `makeNoiseSegments` — lógica de ruído (TDD)

**Files:**
- Modify: `lib/signal.ts` (append)
- Test: `lib/signal.test.ts` (append)

**Interfaces:**
- Consumes: `mulberry32` (privado, já existe no mesmo arquivo).
- Produces:
  - `interface NoiseSegment { x1: number; y1: number; x2: number; y2: number; opacity: number }`
  - `interface NoiseSegmentsOptions { count?: number; seed?: number; width?: number; height?: number }`
  - `makeNoiseSegments(options?: NoiseSegmentsOptions): NoiseSegment[]` — fragmentos de linha determinísticos. Defaults: `count 22`, `seed 13`, `width 200`, `height 300`. `x1`/`y1` dentro do viewBox; `opacity` em `[0.12, 0.45]`.

- [ ] **Step 1: Escrever os testes (append em `lib/signal.test.ts`)**

```ts
import { makeNoiseSegments } from "@/lib/signal";

describe("makeNoiseSegments", () => {
  it("gera o número pedido de segmentos", () => {
    expect(makeNoiseSegments({ count: 10 })).toHaveLength(10);
  });

  it("usa 22 segmentos por padrão", () => {
    expect(makeNoiseSegments()).toHaveLength(22);
  });

  it("é determinístico para o mesmo seed (SSR === CSR)", () => {
    expect(makeNoiseSegments({ seed: 42 })).toEqual(makeNoiseSegments({ seed: 42 }));
  });

  it("difere com seeds diferentes", () => {
    expect(makeNoiseSegments({ seed: 1 })).not.toEqual(makeNoiseSegments({ seed: 2 }));
  });

  it("mantém origem dentro do viewBox e opacidade no intervalo", () => {
    const segs = makeNoiseSegments({ count: 50, seed: 5, width: 200, height: 300 });
    for (const s of segs) {
      expect(s.x1).toBeGreaterThanOrEqual(0);
      expect(s.x1).toBeLessThanOrEqual(200);
      expect(s.y1).toBeGreaterThanOrEqual(0);
      expect(s.y1).toBeLessThanOrEqual(300);
      expect(s.opacity).toBeGreaterThanOrEqual(0.12);
      expect(s.opacity).toBeLessThanOrEqual(0.45);
    }
  });
});
```

> Nota: `lib/signal.test.ts` já importa `describe/it/expect` de `vitest` e já tem um import de `@/lib/signal`. Adicione `makeNoiseSegments` ao import existente (ou use o import novo acima — duplicar o import do mesmo módulo é erro de lint; prefira ampliar a linha de import já existente).

- [ ] **Step 2: Rodar e verificar FAIL**

Run: `npx vitest run lib/signal.test.ts`
Expected: FAIL — `makeNoiseSegments` não existe.

- [ ] **Step 3: Implementar (append em `lib/signal.ts`)**

```ts
export interface NoiseSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
}

export interface NoiseSegmentsOptions {
  /** quantidade de fragmentos (default 22) */
  count?: number;
  /** semente do PRNG (default 13) — determinístico (SSR === CSR) */
  seed?: number;
  /** largura do viewBox de referência (default 200) */
  width?: number;
  /** altura do viewBox de referência (default 300) */
  height?: number;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Fragmentos de linha curtos e dispersos para o campo de RUÍDO (decorativo).
 * Determinístico via mulberry32 — sem Math.random() em render (mismatch de hidratação).
 */
export function makeNoiseSegments(options: NoiseSegmentsOptions = {}): NoiseSegment[] {
  const count = options.count ?? 22;
  const width = options.width ?? 200;
  const height = options.height ?? 300;
  const rnd = mulberry32(options.seed ?? 13);
  const out: NoiseSegment[] = [];
  for (let i = 0; i < count; i++) {
    const x1 = rnd() * width;
    const y1 = rnd() * height;
    const len = 18 + rnd() * 46; // fragmentos curtos
    const angle = (rnd() - 0.5) * 1.4; // leve inclinação
    const opacity = Math.round((0.12 + rnd() * 0.33) * 100) / 100;
    out.push({
      x1: round1(x1),
      y1: round1(y1),
      x2: round1(x1 + Math.cos(angle) * len),
      y2: round1(y1 + Math.sin(angle) * len),
      opacity,
    });
  }
  return out;
}
```

- [ ] **Step 4: Rodar e verificar PASS**

Run: `npx vitest run lib/signal.test.ts`
Expected: todos PASS (inclui os testes antigos de `makeDemoSeries`/`isInFocusZone`).

- [ ] **Step 5: Commit**

```bash
git add lib/signal.ts lib/signal.test.ts
git commit -m "feat(signal): makeNoiseSegments (fragmentos determinísticos p/ campo de ruído)"
```

---

## Task 2: `NoiseField` (campo de ruído decorativo)

**Files:**
- Create: `components/signal/NoiseField.tsx`
- Test: `components/signal/NoiseField.test.tsx`
- Modify: `app/globals.css` (utilitário/keyframe `.animate-noise-drift`)

**Interfaces:**
- Consumes: `makeNoiseSegments` de `@/lib/signal`; `cn` de `@/lib/utils`.
- Produces: `NoiseField({ intensity?, className? }: { intensity?: "low" | "high"; className?: string })` — SVG `aria-hidden` de fragmentos em neutro frio; `high` = mais fragmentos; drift sutil via `.animate-noise-drift`, pausa offscreen (`data-playing`), `reduced-motion` congela (regra global do CSS).

- [ ] **Step 1: Adicionar utilitário/keyframe em `app/globals.css`**

No bloco `@layer utilities { ... }`, logo após o bloco `.animate-signal-draw { ... }`, adicionar:

```css
  /* Drift sutil do campo de ruído. Pausável via data-playing; reduced-motion congela (regra global). */
  .animate-noise-drift { animation: noise-drift 11s ease-in-out infinite alternate; }
  .animate-noise-drift[data-playing="false"] { animation-play-state: paused; }
```

E logo após o bloco `@keyframes signal-draw { ... }`, adicionar:

```css
@keyframes noise-drift {
  from { transform: translate3d(-4px, 0, 0); }
  to { transform: translate3d(4px, -6px, 0); }
}
```

- [ ] **Step 2: Implementar `components/signal/NoiseField.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { makeNoiseSegments } from "@/lib/signal";
import { cn } from "@/lib/utils";

const VB_W = 200;
const VB_H = 300;

/** Campo de ruído decorativo (inverso do NeuralField). Leve, pausa offscreen, respeita reduced-motion. */
export function NoiseField({
  intensity = "low",
  className,
}: {
  intensity?: "low" | "high";
  className?: string;
}) {
  const count = intensity === "high" ? 34 : 18;
  const segments = useMemo(
    () => makeNoiseSegments({ count, seed: 13, width: VB_W, height: VB_H }),
    [count],
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.02 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} aria-hidden className={cn("pointer-events-none", className)}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full text-fg-muted"
      >
        <g
          className="animate-noise-drift"
          data-playing={String(visible)}
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        >
          {segments.map((s, i) => (
            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeOpacity={s.opacity} />
          ))}
        </g>
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Teste `components/signal/NoiseField.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NoiseField } from "@/components/signal/NoiseField";

describe("NoiseField", () => {
  it("renderiza decorativo (aria-hidden) com fragmentos de linha", () => {
    const { container } = render(<NoiseField />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(container.querySelector("[aria-hidden]")).not.toBeNull();
    expect(container.querySelectorAll("line").length).toBeGreaterThan(0);
  });

  it("intensity 'high' tem mais fragmentos que 'low'", () => {
    const low = render(<NoiseField intensity="low" />);
    const high = render(<NoiseField intensity="high" />);
    expect(high.container.querySelectorAll("line").length).toBeGreaterThan(
      low.container.querySelectorAll("line").length,
    );
  });
});
```

- [ ] **Step 4: Gate**

Run: `npx vitest run components/signal/NoiseField.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/signal/NoiseField.tsx components/signal/NoiseField.test.tsx app/globals.css
git commit -m "feat(signal): NoiseField (campo de ruído decorativo, pausa offscreen)"
```

---

## Task 3: `CinematicSection` (casca de cena tela-cheia)

**Files:**
- Create: `components/signal/CinematicSection.tsx`
- Test: `components/signal/CinematicSection.test.tsx`

**Interfaces:**
- Consumes: `SectionLabel` de `@/components/signal/SectionLabel`; `cn` de `@/lib/utils`.
- Produces: `CinematicSection({ index, total?, label, tone?, background?, children, className? }: { index: number; total?: number; label: string; tone?: "noise" | "transition" | "signal"; background?: ReactNode; children: ReactNode; className?: string })` — `<section>` `min-h-[100svh]`, contador mono sticky `NN / TT`, `SectionLabel` (sem índice, o contador carrega o número), `background` renderizado full-bleed atrás do conteúdo. Server component (sticky é CSS puro).

- [ ] **Step 1: Implementar `components/signal/CinematicSection.tsx`**

```tsx
import type { CSSProperties, ReactNode } from "react";
import { SectionLabel } from "@/components/signal/SectionLabel";
import { cn } from "@/lib/utils";

const toneStyle: Record<"noise" | "transition" | "signal", CSSProperties> = {
  noise: { background: "var(--color-bg)" },
  transition: {
    background:
      "linear-gradient(180deg, var(--color-bg), color-mix(in srgb, var(--color-attention) 8%, var(--color-bg)))",
  },
  signal: {
    background: "color-mix(in srgb, var(--color-attention) 4%, var(--color-bg))",
  },
};

/** Cena tela-cheia do scroll cinematográfico de /sobre. Contador sticky + label + fundo opcional. */
export function CinematicSection({
  index,
  total = 6,
  label,
  tone = "signal",
  background,
  children,
  className,
}: {
  index: number;
  total?: number;
  label: string;
  tone?: "noise" | "transition" | "signal";
  background?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const counter = `${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  return (
    <section
      style={toneStyle[tone]}
      className={cn(
        "relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 py-20 sm:px-8",
        className,
      )}
    >
      {background ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {background}
        </div>
      ) : null}
      <div className="pointer-events-none sticky top-4 z-10 mb-8 font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em] text-fg-muted">
        {counter}
      </div>
      <div className="relative z-[1] mx-auto w-full max-w-3xl">
        <SectionLabel>{label}</SectionLabel>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Teste `components/signal/CinematicSection.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CinematicSection } from "@/components/signal/CinematicSection";

describe("CinematicSection", () => {
  it("mostra contador NN / TT, o label e os filhos", () => {
    render(
      <CinematicSection index={2} label="O Cenário">
        <p>conteúdo da cena</p>
      </CinematicSection>,
    );
    expect(screen.getByText("02 / 06")).toBeInTheDocument();
    expect(screen.getByText(/O Cenário/i)).toBeInTheDocument();
    expect(screen.getByText("conteúdo da cena")).toBeInTheDocument();
  });

  it("renderiza o background quando fornecido", () => {
    render(
      <CinematicSection index={1} label="Abertura" background={<div data-testid="bg" />}>
        <p>oi</p>
      </CinematicSection>,
    );
    expect(screen.getByTestId("bg")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Gate**

Run: `npx vitest run components/signal/CinematicSection.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/signal/CinematicSection.tsx components/signal/CinematicSection.test.tsx
git commit -m "feat(signal): CinematicSection (casca de cena tela-cheia + contador sticky)"
```

---

## Task 4: Reconstruir `app/sobre/page.tsx` (as 6 cenas)

**Files:**
- Modify: `app/sobre/page.tsx` (substituir o conteúdo inteiro)

**Interfaces:**
- Consumes: `CinematicSection`, `NoiseField`, `LiveSignal`, `Readout`, `Reveal`, `ButtonLink`.
- Produces: a página `/sobre` (server component). Gate = `lint` + `build` + checklist visual manual (390px + reduced-motion). Sem teste de DOM frágil (composição), conforme a estratégia da Fase A.

- [ ] **Step 1: Substituir todo o conteúdo de `app/sobre/page.tsx`**

```tsx
import type { Metadata } from "next";
import { CinematicSection } from "@/components/signal/CinematicSection";
import { NoiseField } from "@/components/signal/NoiseField";
import { LiveSignal } from "@/components/signal/LiveSignal";
import { Readout } from "@/components/signal/Readout";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "O Projeto",
  description:
    "A ciência por trás do NeuroRace: neuroplasticidade, neurofeedback em tempo real e performance cognitiva gamificada.",
};

export default function SobrePage() {
  return (
    <div>
      {/* 01 — Abertura */}
      <CinematicSection
        index={1}
        label="O Projeto · NEXT FIAP 2026"
        tone="noise"
        background={<NoiseField intensity="low" className="h-full w-full opacity-60" />}
      >
        <Reveal>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            A atenção virou o<br />
            recurso mais <span className="text-fg-muted">disputado.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg">
            O NeuroRace nasce para transformar esse desafio em treino: foco que
            vira jogo, medido em tempo real.
          </p>
        </Reveal>
        <p className="mt-10 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg-muted">
          ▾ role
        </p>
      </CinematicSection>

      {/* 02 — O Ruído (a crise) */}
      <CinematicSection
        index={2}
        label="O Cenário"
        tone="noise"
        background={<NoiseField intensity="high" className="h-full w-full opacity-70" />}
      >
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight text-fg-strong sm:text-5xl">
            Telas. Notificações.
            <br />
            <span className="text-fg-muted">Dispersão.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg">
            Vivemos numa era de excesso de estímulos digitais. Notificações
            constantes, múltiplas telas e o consumo acelerado de conteúdos
            superficiais estão moldando nosso cérebro — levando a uma dificuldade
            crescente de manter a atenção.
          </p>
        </Reveal>
      </CinematicSection>

      {/* 03 — A Virada (ruído → sinal) */}
      <CinematicSection index={3} label="A Virada" tone="transition">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
            Do ruído ao <span className="text-attention">sinal.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg">
            O foco não é ruído — é sinal. O NeuroRace lê a sua atividade cerebral e
            a transforma numa curva viva de atenção.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface">
            <LiveSignal mode="demo" className="w-full" />
          </div>
        </Reveal>
      </CinematicSection>

      {/* 04 — A Solução */}
      <CinematicSection index={4} label="A Solução" tone="signal">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
            Seu foco vira <span className="text-attention">velocidade.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg">
            A velocidade do seu personagem é controlada diretamente pelo seu nível
            de foco, medido em tempo real por um headset de EEG. Cada corrida vira
            um exercício divertido de foco e autorregulação.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-8 flex items-center gap-4">
            <Readout label="Atenção" value="78" kind="attention" suffix="%" />
            <span aria-hidden className="text-2xl text-attention">
              →
            </span>
            <Readout label="Velocidade" value="↑↑" kind="neutral" />
          </div>
        </Reveal>
      </CinematicSection>

      {/* 05 — A Ciência */}
      <CinematicSection index={5} label="A Ciência por trás do foco" tone="signal">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
            Não é mágica.
            <br />
            <span className="text-attention">É neurociência.</span>
          </h2>
        </Reveal>

        <div className="mt-12 space-y-12">
          <Reveal>
            <h3 className="font-display text-xl font-semibold text-fg-strong">
              Neuroplasticidade
            </h3>
            <p className="mt-3 max-w-xl leading-relaxed text-fg">
              A atenção não é estática. O cérebro reorganiza e fortalece redes
              neurais com prática repetida — mesmo intervenções breves geram ganhos
              no controle executivo da atenção.
            </p>
          </Reveal>
          <Reveal>
            <h3 className="font-display text-xl font-semibold text-fg-strong">
              Neurofeedback em tempo real
            </h3>
            <p className="mt-3 max-w-xl leading-relaxed text-fg">
              Um headset de EEG capta a atividade elétrica cerebral e o sistema a
              traduz num indicador de <span className="text-attention">atenção</span>{" "}
              (0 a 100). Ao ver o resultado direto do seu foco, você aprende a
              modular a própria atividade cerebral.
            </p>
          </Reveal>
          <Reveal>
            <h3 className="font-display text-xl font-semibold text-fg-strong">
              O sensor NeuroSky
            </h3>
            <p className="mt-3 max-w-xl leading-relaxed text-fg">
              O NeuroSky lê sinais de EEG na testa e envia, a cada instante, o nível
              de <span className="text-attention">atenção</span> e{" "}
              <span className="text-meditation">meditação</span>, além das bandas de
              ondas cerebrais. É essa telemetria que, no seu painel, vira a curva do
              seu foco ao longo da corrida.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-xs text-fg-muted">
              <span className="rounded-md border border-border px-2.5 py-1.5">EEG</span>
              <span aria-hidden>→</span>
              <span className="rounded-md border border-border px-2.5 py-1.5">
                atenção 0–100
              </span>
              <span aria-hidden>→</span>
              <span className="rounded-md border border-attention px-2.5 py-1.5 text-attention">
                velocidade
              </span>
            </div>
          </Reveal>
        </div>
      </CinematicSection>

      {/* 06 — Propósito + CTA */}
      <CinematicSection index={6} label="Propósito" tone="signal">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
            Educar. Inspirar.
            <br />
            <span className="text-attention">Inovar.</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <Reveal>
            <h3 className="font-display text-lg font-semibold text-fg-strong">Educar</h3>
            <p className="mt-2 leading-relaxed text-fg">
              Mostrar de forma lúdica que o foco é uma habilidade que pode ser
              treinada e fortalecida.
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h3 className="font-display text-lg font-semibold text-fg-strong">Inspirar</h3>
            <p className="mt-2 leading-relaxed text-fg">
              Despertar consciência sobre o impacto do uso excessivo de telas e a
              importância da atenção.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h3 className="font-display text-lg font-semibold text-fg-strong">Inovar</h3>
            <p className="mt-2 leading-relaxed text-fg">
              Integrar neurociência, tecnologia e entretenimento para o
              desenvolvimento humano.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.15}>
          <div className="mt-14">
            <ButtonLink href="/dashboard">Veja o seu sinal</ButtonLink>
          </div>
        </Reveal>
      </CinematicSection>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sem erros (sem tokens depreciados, sem imports não usados).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build conclui sem erro; `/sobre` compila como rota estática.

- [ ] **Step 4: Conferir ausência de tokens depreciados**

Run (Grep/ripgrep na raiz): procurar em `app/sobre/page.tsx` por `text-gradient`, `text-cyan`, `text-pink`, `bg-card`, `bg-gradient-brand`, `glow-cyan`, `glow-pink`.
Expected: zero ocorrências.

- [ ] **Step 5: Checklist visual manual (dev server)**

Com `npm run dev -- -p 3000`, abrir `http://localhost:3000/sobre` e conferir:
- As 6 cenas ocupam ~1 tela cada no celular (DevTools ~390px).
- Cena 01/02: ruído visível e sutil ao fundo; cena 03: a onda EEG (`LiveSignal`) com badge "demonstração".
- O fundo evolui de frio (cenas 01/02) para tom de atenção (cenas 04–06).
- Com `prefers-reduced-motion: reduce` (DevTools → Rendering → Emulate CSS prefers-reduced-motion): ruído e onda ficam estáticos.
- CTA "Veja o seu sinal" leva a `/dashboard`.

- [ ] **Step 6: Commit**

```bash
git add app/sobre/page.tsx
git commit -m "feat(sobre): landing 'O Projeto' como scroll cinematográfico Ruído → Sinal"
```

---

## Self-Review (preenchido)

**1. Spec coverage:**
- §2 conceito (6 cenas, contador, evolução de cor) → Tasks 3 (CinematicSection: tone + contador) e 4 (composição).
- §4 arquitetura de conteúdo (6 cenas + copy) → Task 4.
- §5.1 `CinematicSection` → Task 3; `NoiseField` → Task 2.
- §5.2 `makeNoiseSegments` (TDD) → Task 1.
- §5.3 reuso (`LiveSignal`/`SectionLabel`/`Readout`/`Reveal`/`ButtonLink`) → Task 4.
- §6 movimento (drift, pausa offscreen, reveal por papel, virada) → Tasks 2 (drift/keyframe/offscreen) e 4 (Reveal + LiveSignal na virada).
- §7 perf/a11y (`min-h-[100svh]`, `aria-hidden`, reduced-motion) → Tasks 2/3/4 + checklist Step 5.
- §9 verificação (test/lint/build/390px/reduced-motion/zero token legado) → gates das tasks + Task 4 Steps 2–5.

**2. Placeholder scan:** sem TBD/TODO; todo passo de código tem o código. (O bloco de opacidade do Task 1 tem duas versões — a nota instrui usar explicitamente o segundo bloco.)

**3. Type consistency:** `makeNoiseSegments`/`NoiseSegment`/`NoiseSegmentsOptions` idênticos entre Task 1 (definição) e Task 2 (consumo). `CinematicSection` props (`index/total/label/tone/background/children/className`) idênticas entre Task 3 (definição) e Task 4 (uso). `Readout` usa `kind` `attention|neutral` (existe no componente). `ButtonLink` usa `href` (existe).
