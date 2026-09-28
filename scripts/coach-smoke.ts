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
  [
    {
      id: "smoke",
      race_id: "smoke",
      player_slot: 1,
      started_at: new Date(started).toISOString(),
      finished_at: new Date(started + 45_000).toISOString(),
    },
  ],
  attention.map((a, i) => ({
    race_player_id: "smoke",
    t: new Date(started + i * 1000).toISOString(),
    attention: a,
    meditation: 50,
  })),
);

async function main() {
  const facts = analyzeRace(race, [race]);
  console.log(
    "Fatos:",
    JSON.stringify({ archetype: facts.archetype, badges: facts.badges, moments: facts.moments, goal: facts.goal }, null, 2),
  );
  console.log("Texto-modelo:", templateNarrative(facts));
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log("Sem GROQ_API_KEY no .env.local: pulando a Groq.");
    return;
  }
  const t0 = Date.now();
  try {
    const text = await generateAiNarrative(facts, { apiKey, model: process.env.GROQ_MODEL || undefined });
    console.log("Groq:", text, `(${Date.now() - t0} ms)`);
  } catch (err) {
    console.error("Groq falhou (o site usaria o texto-modelo):", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

main();
