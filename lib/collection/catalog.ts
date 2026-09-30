import type { Archetype, Badge } from "@/lib/coach/types";

/**
 * Coleção de molduras e figurinhas (NEU-134). Única fonte dos itens: para aumentar a
 * coleção, acrescente uma linha aqui e a arte em public/assets/colecao/.
 * Desenho aprovado: https://claude.ai/artifact/KJRVZGN3qRpY1sQpsXUkS1
 */

export type CollectionKind = "frame" | "sticker";

/** O que desbloqueia o item: a conta, um arquétipo ou uma conquista do NeuroCoach. */
export type UnlockRule =
  | { type: "account" }
  | { type: "archetype"; archetype: Archetype }
  | { type: "badge"; badge: Badge };

export interface CollectionItem {
  id: string;
  kind: CollectionKind;
  name: string;
  /** Cor principal (borda da moldura, fundo do destaque). */
  color: string;
  /** Caminho público da arte (personagem da moldura ou figurinha). */
  art: string;
  /** O que o item significa, em tom leve. */
  meaning: string;
  /** Como ganhar. */
  how: string;
  rule: UnlockRule;
}

const ART = "/assets/colecao";

const ARCHETYPE_SLUG: Record<Archetype, string> = {
  EM_AQUECIMENTO: "em-aquecimento",
  HIPERFOCADO: "hiperfocado",
  ARRANQUE_CRESCENTE: "arranque-crescente",
  SPRINTER: "sprinter",
  OSCILADOR: "oscilador",
  MESTRE_ZEN: "mestre-zen",
  EQUILIBRADO: "equilibrado",
};

/** Arte do personagem de um arquétipo (moldura, card dos Stories). */
export function characterArtFor(archetype: Archetype): string {
  return `${ART}/personagem-${ARCHETYPE_SLUG[archetype]}.png`;
}

function frame(
  archetype: Archetype,
  name: string,
  color: string,
  meaning: string,
  how: string,
): CollectionItem {
  return {
    id: ARCHETYPE_SLUG[archetype],
    kind: "frame",
    name,
    color,
    art: characterArtFor(archetype),
    meaning,
    how,
    rule: { type: "archetype", archetype },
  };
}

function sticker(badge: Badge, id: string, name: string, color: string, meaning: string, how: string): CollectionItem {
  return { id, kind: "sticker", name, color, art: `${ART}/figurinha-${id}.png`, meaning, how, rule: { type: "badge", badge } };
}

export const FRAMES: CollectionItem[] = [
  {
    id: "neurorace",
    kind: "frame",
    name: "NeuroRace",
    color: "#eaf2f7",
    art: `${ART}/personagem-neurorace.png`,
    meaning: "A moldura oficial de quem entrou na corrida.",
    how: "Vem com a sua conta.",
    rule: { type: "account" },
  },
  frame("EM_AQUECIMENTO", "Em Aquecimento", "#f0a45b", "Todo mundo começa se aquecendo.", "Termine uma corrida com foco médio abaixo de 45."),
  frame("HIPERFOCADO", "Hiperfocado", "#5be3c8", "Nada tira seu olho da pista.", "Termine uma corrida com foco médio de 60 ou mais."),
  frame("ARRANQUE_CRESCENTE", "Arranque Crescente", "#4da3ff", "Começou devagar, terminou voando.", "Termine uma corrida 10 pontos mais focado do que começou."),
  frame("SPRINTER", "Sprinter", "#ff6b5b", "Sai voando. Chegar é outra história.", "Comece forte e perca 10 pontos de foco até o fim."),
  frame("OSCILADOR", "Oscilador", "#b06bff", "Sua mente é uma montanha-russa, e tudo bem.", "Tenha um foco com altos e baixos fortes na corrida."),
  frame("MESTRE_ZEN", "Mestre Zen", "#ffd166", "Nem o trânsito de São Paulo te tira do sério.", "Corra com calma alta e foco estável do começo ao fim."),
  frame("EQUILIBRADO", "Equilibrado", "#7bd88f", "Nem 8 nem 80.", "Corra sem grandes quedas nem arrancadas."),
];

export const STICKERS: CollectionItem[] = [
  {
    id: "piloto-neurorace",
    kind: "sticker",
    name: "Piloto NeuroRace",
    color: "#5be3c8",
    art: `${ART}/figurinha-piloto-neurorace.png`,
    meaning: "Bem-vindo ao grid.",
    how: "Vem com a sua conta.",
    rule: { type: "account" },
  },
  sticker("PRIMEIRA_CORRIDA", "primeira-corrida", "Primeira Corrida", "#eaf2f7", "A primeira a gente nunca esquece.", "Termine a sua primeira corrida."),
  sticker("LARGADA_RELAMPAGO", "largada-relampago", "Largada Relâmpago", "#ffd166", "Saiu na frente antes de todo mundo piscar.", "Tenha foco de 60 ou mais no primeiro terço da corrida."),
  sticker("MODO_FLOW", "modo-flow", "Modo Flow", "#4da3ff", "Entrou na zona e ficou lá.", "Passe metade da corrida na zona de foco."),
  sticker("MENTE_DE_ACO", "mente-de-aco", "Mente de Aço", "#c7d3df", "Nada te abala.", "Mantenha o foco estável do começo ao fim."),
  sticker("VIRADA_MENTAL", "virada-mental", "Virada Mental", "#b06bff", "Caiu, respirou e voltou.", "Recupere 45 pontos de foco em 5 segundos."),
  sticker("CALMA_TOTAL", "calma-total", "Calma Total", "#7bd88f", "Paz de monge no meio da corrida.", "Tenha calma média de 55 ou mais."),
  sticker("FADIGA_ZERO", "fadiga-zero", "Fadiga Zero", "#ff6b5b", "Terminou com a bateria cheia.", "Termine tão focado quanto começou."),
  sticker("RECORDE_PESSOAL", "recorde-pessoal", "Recorde Pessoal", "#f0a45b", "Você contra você, e você ganhou.", "Bata o seu melhor foco ou o seu melhor tempo."),
];

export const COLLECTION: CollectionItem[] = [...FRAMES, ...STICKERS];

export const TOTAL_ITEMS = COLLECTION.length;

export function findItem(id: string): CollectionItem | undefined {
  return COLLECTION.find((i) => i.id === id);
}
