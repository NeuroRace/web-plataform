// Seed de DEMONSTRAÇÃO — popula corridas + telemetria para UM e-mail, simulando
// o que o edge-service enviaria numa corrida real (contrato cloud-sync §3).
//
// Não escreve nada no projeto; só faz POST no backend. Idempotente: usa UUIDs
// determinísticos por corrida, então rodar de novo NÃO duplica (retorna "duplicate").
//
// ATENÇÃO (NEU-74): o alvo é SEMPRE explícito. Não há fallback para o .env.local
// nem para a URL de produção — quem roda escolhe conscientemente onde grava.
// As corridas vão com source="bot": aparecem no dashboard pessoal, mas ficam
// FORA do ranking público (get_leaderboard filtra source='real').
//
// Uso (PowerShell):
//   $env:SEED_SUPABASE_URL="https://<ref>.supabase.co"; $env:SEED_EMAIL="voce@exemplo.com"
//   $env:EDGE_INGEST_TOKEN="<token>"; node scripts/seed-demo.mjs
//   # ou, se só tiver a service_role key:
//   $env:SUPABASE_SERVICE_ROLE_KEY="<key>"; node scripts/seed-demo.mjs
//
// Obrigatórias: SEED_SUPABASE_URL (exceto no dry-run) e SEED_EMAIL.
// Opcionais: SEED_RACES (default 7), SEED_DRY=1 (só valida, não envia).
//
// IMPORTANTE: o e-mail precisa já estar cadastrado E confirmado no Supabase para
// o dashboard mostrar os dados (a RLS liga players.user_id no confirm do e-mail).

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

// Lê a configuração do ambiente. Falha cedo, em vez de adivinhar alvo ou e-mail.
export function resolveSeedConfig(env) {
  const email = (env.SEED_EMAIL || "").trim().toLowerCase();
  if (!email) throw new Error("Defina SEED_EMAIL (e-mail cadastrado e confirmado que vai receber as corridas).");
  const dry = Boolean(env.SEED_DRY);
  const baseUrl = (env.SEED_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  if (!dry && !baseUrl)
    throw new Error("Defina SEED_SUPABASE_URL: o seeder não escolhe o banco sozinho (NEU-74).");
  return {
    email,
    dry,
    baseUrl,
    nRaces: Number(env.SEED_RACES || 7),
    edgeToken: env.EDGE_INGEST_TOKEN || "",
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

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
export function buildRace(i, { email, nRaces }) {
  const rand = rng(`${email}|race|${i}`);
  // foco médio sobe ao longo das corridas (mostra evolução no gráfico)
  const baseAtt = 42 + i * 4.5 + rand() * 6;
  const dur = 70 + Math.floor(rand() * 80); // 70..150s

  // espalha as corridas nas últimas semanas; mais antigas primeiro
  const dayMs = 86_400_000;
  const startedAt =
    Date.now() - (nRaces - i) * 3.4 * dayMs - Math.floor(rand() * 6) * 3_600_000;
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
    idempotency_key: det(`${email}|idem|${i}`),
    race_id: det(`${email}|raceid|${i}`),
    player_slot: 1,
    player_email: email,
    player_uuid: null,
    // "bot": fica fora do ranking público (NEU-74). Nunca "real" para dado fabricado.
    source: "bot",
    started_at: startedMs,
    finished_at: finishedMs,
    telemetry_points: points,
  };
}

// ---- envio ------------------------------------------------------------------
async function send(payload, { baseUrl, edgeToken, serviceKey }) {
  if (edgeToken) {
    const res = await fetch(`${baseUrl}/functions/v1/ingest-race`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-edge-ingest-token": edgeToken,
      },
      body: JSON.stringify(payload),
    });
    return { code: res.status, body: await res.text() };
  }
  if (serviceKey) {
    const res = await fetch(`${baseUrl}/rest/v1/rpc/ingest_race`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
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
export function validate(p) {
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
  const cfg = resolveSeedConfig(process.env);
  if (cfg.dry) {
    console.log(`DRY-RUN → ${cfg.email} | ${cfg.nRaces} corridas | backend ${cfg.baseUrl || "(não definido)"}\n`);
    let bad = 0;
    for (let i = 0; i < cfg.nRaces; i++) {
      const p = buildRace(i, cfg);
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
    console.log("Amostra do 1º ponto:", JSON.stringify(buildRace(0, cfg).telemetry_points[0]));
    return;
  }

  const mode = cfg.edgeToken ? "Edge Function (x-edge-ingest-token)" : "RPC (service_role)";
  console.log(`Seed demo → ${cfg.email}  | ${cfg.nRaces} corridas (source=bot) | via ${mode}`);
  console.log(`Backend: ${cfg.baseUrl}\n`);

  let ok = 0;
  for (let i = 0; i < cfg.nRaces; i++) {
    const payload = buildRace(i, cfg);
    const { code, body } = await send(payload, cfg);
    const tag = code >= 200 && code < 300 ? "OK " : "ERRO";
    console.log(
      `[${tag}] corrida ${i + 1}/${cfg.nRaces}  http=${code}  pts=${payload.telemetry_points.length}  ${body.slice(0, 120)}`,
    );
    if (code >= 200 && code < 300) ok++;
    else if (i === 0) {
      console.error("\nFalhou na 1ª corrida — abortando (cheque a credencial/URL).");
      process.exit(1);
    }
  }
  console.log(`\nConcluído: ${ok}/${cfg.nRaces} aceitas. Abra /dashboard logado como ${cfg.email}.`);
}

// Só executa quando rodado direto (`node scripts/seed-demo.mjs`), não ao importar nos testes.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("Erro:", e.message);
    process.exit(1);
  });
}
