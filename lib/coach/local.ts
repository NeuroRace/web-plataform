import type { RaceSummary } from "@/lib/metrics";
import { analyzeRace } from "./analyze";
import { templateNarrative } from "./narrative-template";
import type { CoachActionResult } from "./types";

/**
 * Análise no cliente, sem servidor nem IA — só para a corrida de demonstração, que não
 * existe no banco (a action a recusaria). O motor e o texto-modelo são puros.
 */
export function analyzeLocally(race: RaceSummary, history: RaceSummary[]): CoachActionResult {
  const facts = analyzeRace(race, history);
  return { ok: true, facts, narrative: templateNarrative(facts) };
}
