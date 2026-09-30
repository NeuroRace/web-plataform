import type { RaceSummary } from "@/lib/metrics";
import { analyzeRace } from "@/lib/coach/analyze";
import type { Archetype, Badge, CoachFacts } from "@/lib/coach/types";
import { COLLECTION, type UnlockRule } from "./catalog";

/** Um item desbloqueado: quando e, se fizer sentido, o número que ele premia. */
export interface Unlock {
  id: string;
  /** ISO. Conta: data de criação; corrida: início da 1ª corrida que desbloqueou. null se desconhecida. */
  at: string | null;
  metric: string | null;
}

const int = (v: number | null | undefined): number | null => (v == null ? null : Math.round(v));
const seconds = (v: number): string => v.toFixed(1).replace(".", ",");

function archetypeMetric(archetype: Archetype, facts: CoachFacts): string | null {
  const m = facts.metrics;
  const [t1, , t3] = m.thirds ?? [null, null, null];
  switch (archetype) {
    case "ARRANQUE_CRESCENTE":
      return t1 == null ? null : `Foco subiu de ${int(t1)} para ${int(t3)}`;
    case "SPRINTER":
      return t1 == null ? null : `Foco caiu de ${int(t1)} para ${int(t3)}`;
    case "OSCILADOR":
      return m.volatility == null ? null : `Variação de foco de ${int(m.volatility)} pontos`;
    case "MESTRE_ZEN":
      return m.avgMeditation == null ? null : `Calma média de ${int(m.avgMeditation)}`;
    default:
      return m.avgAttention == null ? null : `Foco médio de ${int(m.avgAttention)}`;
  }
}

function badgeMetric(badge: Badge, facts: CoachFacts): string | null {
  const m = facts.metrics;
  const [t1, , t3] = m.thirds ?? [null, null, null];
  switch (badge) {
    case "LARGADA_RELAMPAGO":
      return t1 == null ? null : `Foco de ${int(t1)} no começo`;
    case "MENTE_DE_ACO":
      return m.volatility == null ? null : `Variação de só ${int(m.volatility)} pontos no foco`;
    case "VIRADA_MENTAL": {
      const rise = facts.moments.filter((x) => x.kind === "rise").map((x) => x.value);
      return rise.length ? `Subiu ${int(Math.max(...rise))} pontos em 5 s` : null;
    }
    case "MODO_FLOW":
      return m.focusZonePct == null ? null : `${int(m.focusZonePct)}% da corrida na zona de foco`;
    case "CALMA_TOTAL":
      return m.avgMeditation == null ? null : `Calma média de ${int(m.avgMeditation)}`;
    case "FADIGA_ZERO":
      return t1 == null ? null : `Começou com ${int(t1)} e terminou com ${int(t3)}`;
    case "RECORDE_PESSOAL":
      if (facts.progress.personalBest.time && m.durationSeconds != null) return `Tempo de ${seconds(m.durationSeconds)} s`;
      return m.avgAttention == null ? null : `Foco médio de ${int(m.avgAttention)}`;
    case "PRIMEIRA_CORRIDA":
      return null;
  }
}

function matches(rule: UnlockRule, facts: CoachFacts): boolean {
  if (rule.type === "archetype") return facts.archetype === rule.archetype;
  if (rule.type === "badge") return facts.badges.includes(rule.badge);
  return false;
}

function metricFor(rule: UnlockRule, facts: CoachFacts): string | null {
  if (rule.type === "archetype") return archetypeMetric(rule.archetype, facts);
  if (rule.type === "badge") return badgeMetric(rule.badge, facts);
  return null;
}

/**
 * O que a pessoa já desbloqueou. Permanente: vale a 1ª corrida (em ordem cronológica) que
 * deu o arquétipo ou a conquista, com o mesmo `analyzeRace` do NeuroCoach; uma corrida pior
 * depois não tira nada. Os itens de conta valem sempre.
 */
export function computeUnlocks(races: RaceSummary[], accountCreatedAt: string | null): Unlock[] {
  const out = new Map<string, Unlock>();
  for (const item of COLLECTION) {
    if (item.rule.type === "account") out.set(item.id, { id: item.id, at: accountCreatedAt, metric: null });
  }
  const ordered = [...races].sort(
    (a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.racePlayerId.localeCompare(b.racePlayerId),
  );
  for (const race of ordered) {
    const facts = analyzeRace(race, races);
    for (const item of COLLECTION) {
      if (out.has(item.id) || !matches(item.rule, facts)) continue;
      out.set(item.id, { id: item.id, at: race.startedAt, metric: metricFor(item.rule, facts) });
    }
  }
  return [...out.values()];
}

const DAY_MONTH = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

/** dd/mm no fuso do evento (São Paulo), igual em servidor e navegador. */
export function formatUnlockDate(iso: string): string {
  return DAY_MONTH.format(new Date(iso));
}
