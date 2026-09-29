import { formatClock, formatDecimal } from "./describe";
import type { Archetype, CoachFacts, CoachNarrative, Moment } from "./types";

/** Termos que nenhum texto mostrado ao usuário pode ter (spec §2.8): não existem nos dados. */
export const BANNED_TERMS = /ultrapass|oponente|advers|posi[cç][aã]o|\bbeta\b|\balfa\b|\balpha\b|\bondas?\b/i;

const HEADLINES: Record<Archetype, string> = {
  EM_AQUECIMENTO: "Corrida de aquecimento: a mente ainda pegando o ritmo",
  // Cada manchete só afirma o que a regra do arquétipo garante (rules.ts).
  HIPERFOCADO: "Foco alto na média da corrida",
  ARRANQUE_CRESCENTE: "Você terminou mais forte do que começou",
  SPRINTER: "Começou mais focado do que terminou",
  OSCILADOR: "Foco em altos e baixos: picos rápidos e quedas rápidas",
  MESTRE_ZEN: "Calma e constância do começo ao fim",
  EQUILIBRADO: "Foco parecido do começo ao fim da corrida",
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
