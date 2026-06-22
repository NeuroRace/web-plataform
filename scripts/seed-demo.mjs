// Seed de DEMONSTRAÇÃO — popula corridas + telemetria para UM e-mail, simulando
// o que o edge-service enviaria numa corrida real (contrato cloud-sync §3).
//
// Não escreve nada no projeto; só faz POST no backend. Idempotente: usa UUIDs
// determinísticos por corrida, então rodar de novo NÃO duplica (retorna "duplicate").
//
// Uso (PowerShell):
//   $env:EDGE_INGEST_TOKEN="<token>"; node scripts/seed-demo.mjs
//   # ou, se só tiver a service_role key:
//   $env:SUPABASE_SERVICE_ROLE_KEY="<key>"; node scripts/seed-demo.mjs
//
// Opcionais: $env:SEED_EMAIL (default abaixo), $env:SEED_RACES (default 7).
//
// IMPORTANTE: o e-mail precisa já estar cadastrado E confirmado no Supabase para
// o dashboard mostrar os dados (a RLS liga players.user_id no confirm do e-mail).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const EMAIL = (process.env.SEED_EMAIL || "guirochabianchini@gmail.com")
  .trim()
  .toLowerCase();
const N_RACES = Number(process.env.SEED_RACES || 7);

const EDGE_TOKEN = process.env.EDGE_INGEST_TOKEN || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// URL do backend: lê do .env.local do front, com fallback no valor conhecido.
function readSupabaseUrl() {
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const m = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    if (m) return m[1].trim();
  } catch {}
  return "https://wtaulbdkgrnrtbfezaxw.supabase.co";
}
const BASE_URL = readSupabaseUrl();

// ---- helpers determinísticos ----------------------------------------------
function det(seed) {
  const h = createHash("sha1").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
function rng(seedStr) {
  let a = parseInt(createHash("sha1").update(seedStr).digest("hex").slice(0, 8), 16) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---- gera uma corrida (telemetria 1 amostra/seg, curvas suaves) -------------
function buildRace(i) {
  const rand = rng(`${EMAIL}|race|${i}`);
  // foco médio sobe ao longo das corridas (mostra evolução no gráfico)
  const baseAtt = 42 + i * 4.5 + rand() * 6;
  const dur = 70 + Math.floor(rand() * 80); // 70..150s

  // espalha as corridas nas últimas semanas; mais antigas primeiro
  const dayMs = 86_400_000;
  const startedAt =
    Date.now() - (N_RACES - i) * 3.4 * dayMs - Math.floor(rand() * 6) * 3_600_000;
  const startedMs = Math.round(startedAt);
  const finishedMs = startedMs + dur * 1000;

  let att = baseAtt + (rand() - 0.5) * 10;
  let med = 48 + (rand() - 0.5) * 10;
  const points = [];
  for (let s = 0; s <= dur; s++) {
    att += (rand() - 0.5) * 9 + (baseAtt - att) * 0.06;
    med += (rand() - 0.5) * 7 + (54 - med) * 0.06;
    att = clamp(att, 6, 98);
    med = clamp(med, 6, 96);
    points.push({
      t: startedMs + s * 1000,
      attention: Math.round(att),
      meditation: Math.round(med),
      poor_signal_level: 0,
      signal_status: "ok",
      eeg_power: {
        delta: 100000 + Math.floor(rand() * 100000),
        theta: 10000 + Math.floor(rand() * 40000),
        lowAlpha: 1000 + Math.floor(rand() * 19000),
        highAlpha: 1000 + Math.floor(rand() * 19000),
        lowBeta: 500 + Math.floor(rand() * 14500),
        highBeta: 500 + Math.floor(rand() * 14500),
        lowGamma: 200 + Math.floor(rand() * 9800),
        highGamma: 200 + Math.floor(rand() * 9800),
      },
    });
  }

  return {
    schema_version: "1.0",
    idempotency_key: det(`${EMAIL}|idem|${i}`),
    race_id: det(`${EMAIL}|raceid|${i}`),
    player_slot: 1,
    player_email: EMAIL,
    player_uuid: null,
    source: "real",
    started_at: startedMs,
    finished_at: finishedMs,
    telemetry_points: points,
  };
}

// ---- envio ------------------------------------------------------------------
async function send(payload) {
  if (EDGE_TOKEN) {
    const res = await fetch(`${BASE_URL}/functions/v1/ingest-race`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-edge-ingest-token": EDGE_TOKEN,
      },
      body: JSON.stringify(payload),
    });
    return { code: res.status, body: await res.text() };
  }
  if (SERVICE_KEY) {
    const res = await fetch(`${BASE_URL}/rest/v1/rpc/ingest_race`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ payload }),
    });
    return { code: res.status, body: await res.text() };
  }
  throw new Error(
    "Faltou credencial: defina EDGE_INGEST_TOKEN (Edge Function) ou SUPABASE_SERVICE_ROLE_KEY (RPC).",
  );
}

// validação local espelhando contract.ts (pra pegar erro antes de enviar)
function validate(p) {
  const errs = [];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (p.schema_version !== "1.0") errs.push("schema_version");
  if (!uuid.test(p.idempotency_key)) errs.push("idempotency_key");
  if (!uuid.test(p.race_id)) errs.push("race_id");
  if (p.player_slot !== 1 && p.player_slot !== 2) errs.push("player_slot");
  if (!p.player_email) errs.push("player_email");
  if (p.source !== "real" && p.source !== "bot") errs.push("source");
  if (!Number.isInteger(p.started_at) || !Number.isInteger(p.finished_at) || p.finished_at < p.started_at)
    errs.push("timestamps");
  for (const tp of p.telemetry_points) {
    if (!Number.isInteger(tp.t)) errs.push("t");
    if (!Number.isInteger(tp.attention) || tp.attention < 0 || tp.attention > 100) errs.push("attention");
    if (!Number.isInteger(tp.meditation) || tp.meditation < 0 || tp.meditation > 100) errs.push("meditation");
    if (!["ok", "poor", "no-signal", "unknown"].includes(tp.signal_status)) errs.push("signal_status");
    if (typeof tp.eeg_power !== "object" || tp.eeg_power === null || Array.isArray(tp.eeg_power)) errs.push("eeg_power");
  }
  return [...new Set(errs)];
}

async function main() {
  if (process.env.SEED_DRY) {
    console.log(`DRY-RUN → ${EMAIL} | ${N_RACES} corridas | backend ${BASE_URL}\n`);
    let bad = 0;
    for (let i = 0; i < N_RACES; i++) {
      const p = buildRace(i);
      const errs = validate(p);
      const avg = Math.round(
        p.telemetry_points.reduce((a, x) => a + x.attention, 0) / p.telemetry_points.length,
      );
      const when = new Date(p.started_at).toISOString().slice(0, 16).replace("T", " ");
      console.log(
        `corrida ${i + 1}: ${when} | ${p.telemetry_points.length} pts | foco médio ~${avg}% | ${errs.length ? "INVÁLIDO:" + errs.join(",") : "ok"}`,
      );
      if (errs.length) bad++;
    }
    console.log(`\n${bad === 0 ? "Todos os payloads válidos ✓" : bad + " inválidos ✗"}`);
    console.log("Amostra do 1º ponto:", JSON.stringify(buildRace(0).telemetry_points[0]));
    return;
  }

  const mode = EDGE_TOKEN ? "Edge Function (x-edge-ingest-token)" : "RPC (service_role)";
  console.log(`Seed demo → ${EMAIL}  | ${N_RACES} corridas | via ${mode}`);
  console.log(`Backend: ${BASE_URL}\n`);

  let ok = 0;
  for (let i = 0; i < N_RACES; i++) {
    const payload = buildRace(i);
    const { code, body } = await send(payload);
    const tag = code >= 200 && code < 300 ? "OK " : "ERRO";
    console.log(
      `[${tag}] corrida ${i + 1}/${N_RACES}  http=${code}  pts=${payload.telemetry_points.length}  ${body.slice(0, 120)}`,
    );
    if (code >= 200 && code < 300) ok++;
    else if (i === 0) {
      console.error("\nFalhou na 1ª corrida — abortando (cheque a credencial/URL).");
      process.exit(1);
    }
  }
  console.log(`\nConcluído: ${ok}/${N_RACES} aceitas. Abra /dashboard logado como ${EMAIL}.`);
}

main().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});
