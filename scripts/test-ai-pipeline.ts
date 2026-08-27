import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // Especifica o arquivo .env.local

import chokeMock from "../lib/ai/mocks/scenario-choke.json";
import { generateCognitiveReport } from "../lib/ai/services/cognitive-engine.service";
import type { RaceSummary } from "../lib/metrics";

async function runTest() {
  console.log("==================================================");
  console.log("🧠 NEURORACE AI ENGINE - TESTE DE PIPELINE (GEMINI)");
  console.log("==================================================");

  // Converte o mock para o tipo RaceSummary esperado
  const playerMock = chokeMock.playerSummary as unknown as RaceSummary;
  const opponentMock = chokeMock.opponentSummary as unknown as RaceSummary;

  // Garante uma série mínima para o extrator
  if (!playerMock.series || playerMock.series.length === 0) {
    playerMock.series = [
      { t: 5, attention: 85, meditation: 52 },
      { t: 20, attention: 80, meditation: 50 },
      { t: 35, attention: 75, meditation: 45 },
      { t: 42, attention: 31, meditation: 47 },
      { t: 55, attention: 34, meditation: 47 },
    ];
  }

  console.log("\n⏳ Enviando telemetria para o Google Gemini...");
  const startTime = Date.now();

  const { report, isFallback } = await generateCognitiveReport(
    playerMock,
    opponentMock
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Resposta recebida em ${duration}s! (Fallback: ${isFallback ? "SIM" : "NÃO"})`);
  console.log("\n--------------------------------------------------");
  console.log(`Arquétipo: ${report.archetype}`);
  console.log(`Headline: "${report.headline}"`);
  console.log(`🎖️ Badges Desbloqueadas: ${report.badges_unlocked.join(", ") || "Nenhuma"}`);
  console.log("\nResumo Narrativo:");
  console.log(report.narrative_summary);
  console.log("\nPontos Fortes:");
  report.mental_strengths.forEach((s) => console.log(`  - ${s}`));
  console.log("\nOportunidades de Melhoria:");
  report.areas_for_improvement.forEach((i) => console.log(`  - ${i}`));
  console.log("\nTreino Mental Recomendado:");
  report.actionable_drills.forEach((d) =>
    console.log(`  [${d.category}] ${d.title}: ${d.instruction}`)
  );
  console.log("--------------------------------------------------\n");
}

runTest().catch((err) => {
  console.error("Erro fatal durante a execução do teste:", err);
});