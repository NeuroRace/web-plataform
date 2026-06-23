# Redesign "O Projeto" (/sobre) — Ruído → Sinal (cinematográfico)

> Spec do redesign da página `/sobre` ("O Projeto") do NeuroRace v2.
> Resultado do brainstorming de 2026-06-23 (visual companion). Direção escolhida pela fusão de duas propostas:
> **#5 Cinematográfico** (formato tela-cheia, respiro Apple/Tesla) + **#2 Sinal vs. Ruído** (enredo de transformação caos→foco).
> Acompanha e estende o sistema visual **"Telemetry"** (`docs/REDESIGN.md`), que continua sendo a fonte da direção estética.

---

## 1. Objetivo

Tirar `/sobre` do estado legado (cards genéricos empilhados, gradiente ciano→rosa depreciado `.text-gradient`, `text-cyan`/`text-pink`, `bg-card`) e transformá-la numa **experiência narrativa premium**, mobile-first, que conta a história do produto como uma jornada visual **do ruído (a crise da atenção) ao sinal (o foco no comando)**. É a Fase B do roadmap do redesign para esta página.

**Critério de sucesso:** ao rolar a página num celular, a pessoa sente a transição do caos frio/fragmentado para o sinal limpo e quente de atenção, com a onda de EEG (que já existe na landing) como ponto de virada. Nenhum token depreciado permanece em `/sobre`.

---

## 2. Conceito

A página inteira é um **scroll cinematográfico de 6 cenas**, cada uma ocupando ~1 tela no celular (`min-h-[100svh]`), com um **contador de seção em mono fixo/sticky** (`01 / 06`). A cor e o fundo evoluem ao longo do scroll:

- **Início (ruído):** base fria, dessaturada, com fragmentos de linha quebrados (`NoiseField`).
- **Virada:** o ruído se organiza numa onda limpa de atenção (`LiveSignal` modo `demo`).
- **Fim (sinal):** base com leve tom do acento de **atenção**; foco "no comando".

A "cor de ruído" **não é um terceiro acento** — usa neutros dessaturados derivados dos tokens existentes (`fg-muted`, aço frio). A disciplina de **exatamente 2 acentos semânticos** (atenção/meditação) do Telemetry é mantida.

---

## 3. Restrições globais (herdadas do REDESIGN + novas)

Valem para todas as cenas:

- **Mobile-first.** Validar em ~390px. Alvos de toque ≥ 44px.
- **Zero lib runtime nova.** Só `motion` (já no projeto). Animação = SVG leve + keyframes CSS. **Nada de canvas/partículas/WebGL/Three.js/Lottie/GSAP.**
- **Performance:** só `transform`/`opacity` (GPU); zero animação que dispare layout/reflow. Animações **pausam fora da viewport** (`IntersectionObserver`) e **respeitam `prefers-reduced-motion`** (ruído e onda viram estado estático). Sem regressão de LCP/CLS; meta LCP < 2.5s.
- **Paleta:** base sóbria + **exatamente 2 acentos** (`--color-attention #5be3c8`, `--color-meditation #f0a45b`). Ruído usa neutros existentes. **Proibido** gradiente ciano→rosa; **proibidos** os tokens depreciados (`cyan/pink/purple/gold/card`, `.text-gradient`, `.bg-gradient-brand`, `.glow-cyan/pink`) nesta página.
- **Tipografia:** display **Space Grotesk**, mono **JetBrains Mono** (rótulos/contadores), corpo **Inter** — já configurados via `next/font`.
- **Honestidade de dado:** a onda da virada é **demonstração** (dado sintético via `makeDemoSeries`) e **mantém o rótulo "demonstração"** do `LiveSignal`. Nunca apresentar como leitura real.
- **Determinismo/SSR:** posições do ruído geradas por função pura semeada (sem `Math.random()`/`Date.now()` em render) para evitar mismatch de hidratação.
- **Acessibilidade:** contraste AA; cor nunca é o único portador de significado (sempre acompanha rótulo/posição); foco visível mantido; conteúdo decorativo `aria-hidden`.
- **Idioma:** pt-BR. **Sem emojis em headings.**

---

## 4. Arquitetura de conteúdo (as 6 cenas)

A copy reaproveita/eleva o texto atual de `app/sobre/page.tsx`. Cada cena é uma `CinematicSection`.

| # | Cena | Tom | Conteúdo |
|---|---|---|---|
| 01 | **Abertura** | `noise` | Kicker mono "O PROJETO · NEXT FIAP 2026". Título grande: *"A atenção virou o recurso mais disputado."* Subtítulo curto (1–2 linhas do intro atual). `NoiseField` sutil ao fundo. Indicador "▾ role". |
| 02 | **O Ruído (a crise)** | `noise` | Título *"Telas. Notificações. Dispersão."* + o parágrafo de "O Cenário Atual: A Crise da Atenção". `NoiseField` em intensidade `high` (caos no auge), frio/dessaturado. |
| 03 | **A Virada ★** | `transition` | Título *"Do ruído ao sinal."* O `NoiseField` esmaece e entra o **`LiveSignal` modo `demo`** (com badge "demonstração"). Clímax visual; ponte explícita pro diferencial do produto (telemetria). |
| 04 | **A Solução** | `signal` | Título *"Seu foco vira velocidade."* Parágrafo de "Nossa Solução". Um par de `Readout`: **Atenção** (acento atenção) → seta → **Velocidade** (neutro forte). Explica o loop de neurofeedback gamificado. |
| 05 | **A Ciência** | `signal` | Rótulo "A CIÊNCIA POR TRÁS DO FOCO" + 3 sub-blocos espaçosos (não cards densos): **Neuroplasticidade**, **Neurofeedback em tempo real**, **Sensor NeuroSky** (este tratado como "produto"). Opcional: micro-esquema do pipeline `EEG → atenção 0–100 → velocidade` (toque de credibilidade da proposta #3). |
| 06 | **Propósito + CTA** | `signal` | Os 3 princípios **Educar / Inspirar / Inovar** com respiro. CTA final *"Veja o seu sinal"* → `ButtonLink` primário para `/dashboard`. Fecha o arco. |

> Toda a copy hoje em `text-cyan`/`text-pink` migra para `text-attention`/`text-meditation` conforme o significado (atenção vs. meditação).

---

## 5. Componentes

### 5.1 Novos (`components/signal/`)

**`CinematicSection`** — casca de cena tela-cheia.
- Interface: `CinematicSection({ index, total = 6, label, tone = "signal", children, className }: { index: number; total?: number; label: string; tone?: "noise" | "transition" | "signal"; children: ReactNode; className?: string })`.
- Renderiza `<section>` com `min-h-[100svh]`, padding generoso, contador mono sticky (`{index}/{total}` com dois dígitos) + `SectionLabel`. `tone` controla o gradiente de fundo: `noise` (neutro frio dessaturado), `transition` (neutro→atenção), `signal` (leve tom atenção sobre `bg`).
- **Server component** (sem estado; o sticky é CSS puro). Conteúdo animado entra via `Reveal`.

**`NoiseField`** — campo de ruído decorativo (inverso do `NeuralField`).
- Interface: `NoiseField({ intensity = "low", className }: { intensity?: "low" | "high"; className?: string })`.
- SVG `aria-hidden` de segmentos de linha curtos e fragmentados, em neutro frio (`fg-muted`/aço). Posições vêm de função pura semeada (SSR-safe). `motion-safe`: drift sutil via `transform`; **pausa fora da viewport** (`IntersectionObserver`); `reduced-motion` → estático. `intensity` controla a quantidade/opacidade dos segmentos.
- **Client component** (segue o padrão de pausa offscreen do `LiveSignal`).

### 5.2 Lógica pura (TDD)

**`makeNoiseSegments`** em `lib/signal.ts` (mesmo arquivo do `LiveSignal`, reusa o `mulberry32` já existente):
- `makeNoiseSegments(options?: { count?: number; seed?: number }): NoiseSegment[]` onde `NoiseSegment = { x1: number; y1: number; x2: number; y2: number; opacity: number }`, em coordenadas de viewBox normalizado.
- Determinístico (reusa `mulberry32` já existente em `lib/signal.ts`). Testes: contagem pedida, determinismo por seed (SSR===CSR), valores dentro do viewBox.

### 5.3 Reuso (sem alterar)

- `LiveSignal` (modo `demo`) — a virada (cena 03).
- `SectionLabel` — rótulos numerados.
- `Readout` — par atenção→velocidade (cena 04).
- `Reveal` — entradas por papel (`variant="label"` para rótulos, `rise` para blocos).
- `ButtonLink` — CTA (cena 06).
- Tokens Telemetry de `app/globals.css`.

---

## 6. Movimento

- **Ruído (`NoiseField`):** drift lento dos segmentos (`transform`), opacidade baixa; `reduced-motion` congela.
- **Virada:** `NoiseField` esmaece (opacity) enquanto o `LiveSignal` entra com `.animate-signal-draw`/varredura — a sensação é o aparelho "encontrando" o sinal no meio do ruído.
- **Entradas de conteúdo:** `Reveal` por papel (rótulo curto, título sobe). Distâncias curtas, `viewport once`.
- **Contador de seção:** estático/sticky, sem animação chamativa.
- Tudo via `transform`/`opacity`; nada que dispare reflow.

---

## 7. Performance & Acessibilidade

- SVG leve + keyframes CSS; sem libs novas; sem canvas/WebGL.
- `NoiseField` e `LiveSignal` pausam fora da viewport; `prefers-reduced-motion` → estáticos.
- Contraste AA dos textos sobre os fundos `noise`/`transition`/`signal` (verificar o neutro de ruído sobre `bg`).
- Cor nunca é único portador de significado (atenção/meditação sempre com rótulo).
- Foco visível mantido no CTA. Conteúdo decorativo `aria-hidden`. `min-h-[100svh]` (não `100vh`) para não quebrar com a barra de URL no mobile.

---

## 8. Fora de escopo (YAGNI)

- Light mode (segue dark-only).
- Animação dirigida por scroll-progress complexa (scrollytelling com timeline) — usar reveals por viewport, não scrubbing. Pode virar evolução futura.
- Migração das outras páginas da Fase B (`/equipe`, auth, `/ranking`) — cada uma no seu ciclo.
- Qualquer mudança em dados/auth/backend.

---

## 9. Verificação (definição de "pronto")

- `npm run test` — testes de `makeNoiseSegments` (pura) + 1 teste de comportamento de `NoiseField` (decorativo/`aria-hidden`) e de `CinematicSection` (contador + label presentes) passam.
- `npm run lint` e `npm run build` ok.
- Conferido em viewport ~390px **e** com `prefers-reduced-motion: reduce` (ruído/onda estáticos).
- **Nenhum token depreciado** (`text-gradient`, `text-cyan`, `text-pink`, `bg-card`, etc.) permanece em `app/sobre/page.tsx`.
- A onda de demonstração mantém o rótulo "demonstração".
- Lighthouse mobile sem regressão (LCP/CLS dentro do §7).
- Revisão Breq: UI premium + segurança + arquitetura + produto.

---

## 10. Arquivos

**Criar:**
- `components/signal/CinematicSection.tsx` + `.test.tsx`
- `components/signal/NoiseField.tsx` + `.test.tsx`
- (lógica) `makeNoiseSegments` em `lib/signal.ts` (reusa `mulberry32`) + testes em `lib/signal.test.ts`

**Modificar:**
- `app/sobre/page.tsx` — reconstruir nas 6 cenas com os componentes acima; remover tokens depreciados.

**Não tocar:** tokens em `app/globals.css` (já existem; só os DEPRECATED continuam para outras páginas legadas), demais páginas, `lib/supabase/*`, `proxy.ts`, dados/auth.
