# NeuroRace v2 — Redesign "Telemetry"

> Spec do redesign visual. Resultado do brainstorming de 2026-06-22.
> Acompanha e **substitui a direção estética** do `DESIGN.md` (que segue válido para arquitetura, rotas, auth, dashboard e pendências de backend).
> Objetivo: tirar o site do "premium genérico de IA/template" e dar uma **identidade autoral**, nascida do próprio produto (neurofeedback), **mobile-first**, original, performática e honesta.

Mockups de referência: `.superpowers/brainstorm/1411-1782165115/content/` (`hero-directions.html`, `mobile-telemetry.html`).

---

## 1. Problema (diagnóstico honesto)

O v2 atual é tecnicamente limpo, mas **sem ponto de vista** — colide com os clichês de "dark SaaS premium gerado por IA":

- Gradiente ciano→rosa (`.text-gradient`) em **todo** título → vira ruído, não marca.
- Blob de glow radial atrás do hero.
- `Reveal` (fade + slide-up) **idêntico** em cada bloco — motion default, não "motion com propósito".
- Emojis em headings (`🎮 / 🏆`), pills de hashtag, mascote PNG estático.
- Poppins + Inter — o pairing mais previsível possível.

Resultado: intercambiável com mil templates. Nada na linguagem visual diz "**jogo controlado pelas SUAS ondas cerebrais em tempo real**".

---

## 2. Conceito (decisões travadas no brainstorming)

| Decisão | Escolha |
|---|---|
| **Âncora visual** | Mente / rede neural — porém **viva e guiada pelo dado real**, nunca o "campo de pontos flutuante" (o clichê nº1). A rede só pulsa porque é o *seu* cérebro. |
| **Direção** | **C · Telemetry** — o site inteiro se comporta como um **instrumento que lê seu cérebro**. Onda de EEG ao vivo, rótulos mono, fios de 1px, readouts numéricos. |
| **Paleta** | **Base sóbria (quase preta) + 2 acentos com SIGNIFICADO**: frio = **atenção**, quente = **meditação**. Cor é informação, não decoração. Mata o "gradiente em tudo". |
| **Tipografia** | Display **Space Grotesk** · rótulos/numerais **JetBrains Mono** · corpo **Inter**. |
| **Escopo** | Sistema visual novo → **landing primeiro** (vitrine-prova) → propaga p/ sobre, equipe, auth e dashboard. |
| **Plataforma** | **Mobile-first** (estande = quase todo acesso é celular). |

**Por que isso é autoral e não copiável:** a estética nasce do dado que só o NeuroRace tem (telemetria EEG). É a ponte natural entre a landing e o **diferencial real** do produto — o replay de telemetria do dashboard (`DESIGN.md §5`).

---

## 3. Design system

### 3.1 Cor — tokens (substituem o `@theme` em `app/globals.css`)

Base escura sóbria + **exatamente dois** acentos semânticos. Roxo e dourado do v2 **saem do core**.

```
/* Superfícies */
--color-bg          #0a0e13   (fundo, quase preto azulado)
--color-bg-elev     #10171f   (seções alternadas)
--color-surface     #131c26   (cards / painéis-instrumento)
--color-hairline    #1d2935   (fios de 1px — chrome de instrumento)
--color-border      #26323f   (bordas de card)

/* Texto */
--color-fg-strong   #eef6f3
--color-fg          #9fb1c5
--color-fg-muted    #7e94aa   (rótulos mono pequenos)

/* Acentos semânticos (a regra de ouro do redesign) */
--color-attention   #5be3c8   (FRIO — foco/atenção; é o acento primário)
--color-meditation  #f0a45b   (QUENTE — calma/meditação)
```

**Regras de uso (disciplina é o que separa premium de arcade):**
- `attention` é o único acento "de marca" recorrente (links ativos, CTA primário, a onda, foco). `meditation` aparece **só quando há significado de calma/meditação** (2ª série da onda, métrica de calma).
- **Proibido** gradiente ciano→rosa em títulos. Título é branco-forte; ênfase usa **uma** palavra em `attention`.
- Glow é sutil e raro (foco/hover), nunca ambiente.
- Verificar contraste AA (≥4.5 corpo / ≥3 large) de `attention` e `meditation` sobre as superfícies antes de fechar (passo de verificação no §8).

### 3.2 Tipografia (via `next/font`, self-host, sem flash)

- **Display — Space Grotesk** (500/600/700): h1–h4, números grandes de readout. Substitui Poppins.
- **Mono — JetBrains Mono** (500/700): rótulos uppercase, numeração de seção (`02 —`), valores de readout, chrome "REC/AO VIVO". É a assinatura do "instrumento".
- **Corpo — Inter** (400/500/600): mantido.
- Trocar no `app/layout.tsx`: remover `Poppins`, adicionar `Space_Grotesk` e `JetBrains_Mono` como `--font-display` e `--font-mono`. Atualizar `@theme inline` no `globals.css`.

### 3.3 Espaço, forma e "chrome de instrumento"

- Escala 4/8px. Raio: `14px` painéis, `10–11px` botões, `999px` chips.
- **Fios de 1px** (`--color-hairline`) como linguagem estrutural (não sombras pesadas).
- **Cantos com tick** (corner marks) em painéis-herói/instrumento — opcional e discreto.
- **Rótulos de seção numerados** em mono: `02 — O CONCEITO`. Dá ritmo editorial e reforça o "aparelho de medição".

### 3.4 Movimento — "tudo que se move é sinal"

Princípio: **motion = leitura/medição**, nunca enfeite. Substitui o `Reveal` uniforme por um vocabulário pequeno e intencional:

- **Onda EEG**: loop contínuo de varredura (`translateX`, 1 keyframe). Elemento-herói.
- **Linhas "desenhando"**: traços (onda, divisores) entram via `stroke-dashoffset` (parece o aparelho traçando o sinal).
- **Rótulos/readouts**: revelam com clip/contagem curta, não fade genérico.
- **Hover**: realce de fio + "tick" sutil. Sem scale exagerado.
- **Entrada de conteúdo**: mantém um reveal, mas **diferenciado por papel** (label, título, painel) em vez de igual pra tudo.

Todas as regras de performance no §7.

---

## 4. Componentes-assinatura (o "kit instrumento")

Novos (`components/signal/`):

| Componente | Papel | Notas |
|---|---|---|
| `LiveSignal` | A onda EEG animada (varredura + linha de limiar + grid). | **2 modos:** `demo` (landing — dado sintético, **rotulado como demonstração**) e `data` (dashboard — telemetria real). SVG leve. |
| `Readout` | Bloco numérico mono com rótulo + valor semântico. | Cor por tipo (`attention`/`meditation`). |
| `MetricBar` | Barra horizontal semântica (foco/calma). | Reaproveita ideia do v1, agora com cor-significado. |
| `SectionLabel` | Rótulo de seção numerado em mono (`02 — …`). | Ritmo editorial. |
| `SignalDivider` | Divisor de seção em forma de sinal (linha viva fina). | Substitui divisores neutros. |
| `InstrumentPanel` | Painel com chrome (fio 1px, header mono "REC/AO VIVO", cantos com tick). | Casca dos readouts/onda. |
| `NeuralField` | Malha neural sutil de fundo (a "rede viva"). | **Reativa e leve**; pausa fora da viewport; some em `reduced-motion`. Uso comedido (hero/seções-chave), não em tudo. |

Refatorar existentes:

- `Reveal` → vocabulário de motion do §3.4 (variantes por papel; manter fallback `reduced-motion`).
- `ui/Button` → remover `bg-gradient-brand`; primário = `attention` sólido c/ texto escuro; secundário = fio + texto; hover discreto.
- `Logo` → `NEURO`/`RACE` sem o par ciano/rosa; usar `fg-strong` + `attention` numa parte só.
- `Header` → tipografia mono nos itens, item ativo em `attention`, manter drawer mobile (já bom).
- `QuoteCarousel` → manter (drag/auto), retirar aspas em gradiente; tratar frase como "leitura".
- `ReplayChart` (Recharts) → **já é instrumento**: realinhar cores aos novos tokens (`attention`/`meditation`), grade em `hairline`, adicionar a **linha de limiar de foco** (ver §6).
- Remover emojis de headings (`app/page.tsx`); copy mantém tom, ganha rótulos de seção.

---

## 5. Aplicação por página (landing primeiro)

**Fase A — Sistema + Landing (`/`):**
- Hero mobile-first: `SectionLabel` → título (Space Grotesk) → **`LiveSignal` modo `demo`** (herói da tela no celular, acima da dobra) → `Readout` atenção/meditação em linha → CTAs full-width empilhados.
- Seções (Conceito, Ciência, NEXT, CTA) reescritas com `SectionLabel` numerado + `SignalDivider`; sem emoji; `NeuralField` sutil só onde agrega.
- `VoteBanner` e `QuoteCarousel` mantidos, re-skin.

**Fase B — Propaga:** `/sobre`, `/equipe` (TeamCard vira "ficha de instrumento"), `/login` `/cadastro` `/confirmar` (auth com chrome sóbrio), `/ranking` (placeholder coerente).

**Fase C — Dashboard:** alinhar `StatCard`→`Readout`, `EvolutionChart`/`ReplayChart` aos tokens; `EmptyState` no tom instrumento. Aqui o `LiveSignal` modo `data` usa telemetria **real** — a promessa da landing se cumpre.

---

## 6. Dado, honestidade e o limiar de foco

- **`LiveSignal` na landing é demonstração.** Usa dado sintético e **deve ser rotulado** (ex: micro-legenda "demonstração"/"exemplo"). **Não** mascarar dado falso como leitura real — questão de integridade do produto e de não enganar jurados/usuários.
- **Linha "zona de foco"** = `metricsConfig.focusZoneThreshold` (`lib/site.ts`, hoje `60`, **provisório — pendência D1 do backend**, `DESIGN.md §9`). Centralizado e fácil de trocar quando o backend publicar a definição oficial.
- Dashboard (`data`) lê via Supabase + RLS já existentes — **redesign não toca em auth/dados/segurança de acesso**.

---

## 7. Performance & guardrails mobile-first (cravados)

- **Onda/rede = SVG leve + keyframes CSS** (`translateX`, `stroke-dashoffset`). **Nada de canvas/partículas/WebGL.** Roda liso em celular fraco de estande.
- **Pausar fora da viewport** (`IntersectionObserver`) e **respeitar `prefers-reduced-motion`** → onda/rede viram estado estático.
- **Só `transform`/`opacity`** (composição GPU). Zero animação de propriedade que dispara layout/reflow.
- **Sem libs novas:** reutilizar `motion` (já no projeto) e `recharts`. Não aumentar o bundle por enfeite.
- Tipos via `next/font` (sem FOUT/flash). Imagens via `next/image`.
- Alvos de toque ≥ 44px. Testar em viewport real ~390px.
- **Orçamento:** preservar/ melhorar Lighthouse mobile; meta LCP < 2.5s; sem regressão de CLS.

---

## 8. Acessibilidade

- Contraste AA para `attention`/`meditation` e textos sobre as superfícies (verificar, ajustar tom se reprovar).
- Cor **nunca** é o único portador de significado (atenção vs. meditação também por rótulo/posição).
- Foco visível (já há `focus-visible` no Button) mantido em todos os interativos.
- `reduced-motion` é caminho de 1ª classe, não improviso.

---

## 9. Riscos & questões em aberto

1. **Contraste dos acentos** sobre fundo quase preto — validar e ajustar hex se preciso (não fechar tokens sem checar).
2. **Limiar de foco** depende de D1 (backend) — usar provisório, manter trocável.
3. **`NeuralField`** pode pesar/distrair se exagerado — usar comedido; se conflitar com perf no mobile, degrada para estático.
4. **Espírito "premium" vs. "divertido de estande"** — calibrar na implementação; não deixar frio demais.

---

## 10. Fora de escopo (YAGNI)

- Light mode (segue dark-only no MVP).
- Libs de animação/3D novas (Three.js, Lottie, GSAP).
- Reescrita de arquitetura, rotas, auth ou data layer (intacto).
- Ranking/duelo 1x1 (dependem de views do backend — `DESIGN.md §9`).

---

## 11. Ordem de execução sugerida

1. **Tokens + fontes** — reescrever `@theme` (`globals.css`) e fontes (`layout.tsx`). Base do sistema.
2. **Primitivos** — `components/signal/*` (`LiveSignal`, `Readout`, `MetricBar`, `SectionLabel`, `SignalDivider`, `InstrumentPanel`) + refactor `Reveal`/`Button`/`Logo`.
3. **Landing** — reconstruir `app/page.tsx` mobile-first com os primitivos. Vitrine-prova.
4. **Verificação** — build, lint, Lighthouse mobile, axe/contraste, teste em ~390px e em `reduced-motion`.
5. **Propaga** — sobre/equipe/auth/ranking.
6. **Dashboard** — alinhar charts/cards; `LiveSignal` modo `data` com telemetria real; linha de limiar.

---

## 12. Verificação (definição de "pronto")

- `npm run lint` e `npm run build` ok.
- Lighthouse mobile sem regressão (perf/CLS/LCP dentro do §7).
- Contraste AA conferido nos acentos.
- Conferido em viewport ~390px **e** com `prefers-reduced-motion: reduce`.
- Nenhum dado sintético aparece sem rótulo de demonstração.
- Revisão Breq: UI premium + segurança + arquitetura + produto (barra de qualidade global).
