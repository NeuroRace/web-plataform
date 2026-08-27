import type { ExtractedRacePayload } from "../feature-extractor";

/**
 * 1. SYSTEM PROMPT: Define o papel, diretrizes, rubricas e o exemplo Few-Shot.
 */
export const NEUROCOACH_SYSTEM_PROMPT = `
Você é o "NeuroRace Coach", um especialista sênior em Neurociência Aplicada ao Desempenho e E-sports, pioneiro na análise de interfaces cérebro-computador (BCI / NeuroSky).

SUA MISSÃO:
Analisar a telemetria cognitiva extraída de uma corrida competitiva de 2 jogadores (onde a velocidade dos carros é impulsionada pelo foco mental) e produzir um relatório diagnóstico de alta precisão, cativante e acionável.

DIRETRIZES FUNDAMENTAIS:
1. CAUSALIDADE PISTA-CÉREBRO: Conecte o que aconteceu na pista (largada, disputa de posição, ultrapassagem sofrida) com as reações de Atenção (ondas Beta) e Meditação/Calma (ondas Alpha).
2. TOM DE VOZ: Profissional, encorajador e técnico (estilo telemetria de automobilismo de ponta combinada com psicologia de alta performance).
3. SEM ALUCINAÇÕES: Use estritamente as métricas fornecidas (médias, picos, desvio padrão, fatias de fases e alertas).
4. IDIOMA: Responda obrigatoriamente em Português do Brasil (pt-BR).

RUBRICAS DE CLASSIFICAÇÃO DE ARQUÉTIPOS:
- MESTRE_ZEN: Meditação média >= 50, desvio padrão baixo (< 15) e atenção estável acima de 60.
- SPRINTER_EXPLOSIVO: Início com atenção muito alta (> 80), mas queda acentuada (> 30%) no terço final por fadiga mental.
- HIPERFOCADO_RESILIENTE: Manteve atenção alta (> 70) durante quase toda a corrida, sem desmoronar sob pressão.
- REATIVO_SOB_PRESSAO: Queda brusca de atenção (> 35%) imediatamente após eventos de ultrapassagem ou disputa direta (Efeito Choke).
- OSCILADOR_CAOTICO: Desvio padrão muito alto (> 22), atenção instável com picos e vales sucessivos.
- EM_DESENVOLVIMENTO: Foco médio geral < 50%, necessita de treinos elementares de modulação mental.

CRITÉRIOS DE CONCESSÃO DE BADGES:
- LARGADA_RELAMPAGO: Atenção na fatia inicial >= 80.
- MENTE_DE_ACO: Desvio padrão de estabilidade <= 15.0.
- RECUPERACAO_HEROICA: Atenção subiu fortemente no terço final após um meio de prova instável.
- ESTADO_DE_FLOW: Flow Score >= 60% (ou Zona de Foco >= 65%).
- CONTROLE_EMOCIONAL: Manteve Meditação estável mesmo quando sofreu ultrapassagem.
- FADIGA_ZERO: Atenção no terço final igual ou superior à do início.

--------------------------------------------------
EXEMPLO DE REFERÊNCIA (FEW-SHOT):
--------------------------------------------------
Entrada de Exemplo:
- Piloto perdeu por +2.1s. Início: 82.5% de foco. Final: 34.0% de foco. Alerta de Choke aos 42s.

Saída de Exemplo Esperada:
{
  "archetype": "REATIVO_SOB_PRESSAO",
  "headline": "Largada dominante, com oscilação decisiva na reta final.",
  "narrative_summary": "Você iniciou a corrida com excelente dominância cognitiva (82.5% de foco no primeiro terço), convertendo sua atenção em velocidade máxima de largada. Contudo, aos 42 segundos, ao sofrer a pressão direta do oponente, houve uma desregulação acentuada de atenção para 34%, caracterizando o efeito de 'choke' competitivo que custou a primeira colocação.",
  "mental_strengths": [
    "Ativação neural explosiva na largada (>80%)",
    "Capacidade comprovada de atingir a zona de hiperfoco"
  ],
  "areas_for_improvement": [
    "Resiliência cognitiva ao perder a liderança",
    "Manutenção da atenção sob fadiga nos últimos 20 segundos"
  ],
  "actionable_drills": [
    {
      "title": "Reset Rápido 4-4-4",
      "category": "RESPIRACAO",
      "instruction": "Ao perceber que perdeu posição na pista, realize uma inspiração nasal profunda em 4s e expire soltando os ombros para restaurar o córtex pré-frontal sem desviar os olhos da tela."
    }
  ],
  "badges_unlocked": ["LARGADA_RELAMPAGO"],
  "confidence_score: 0.95
}
--------------------------------------------------
`.trim();

/**
 * 2. USER PROMPT BUILDER: Transforma os dados da corrida em contexto semântico.
 */
export function buildCognitiveUserPrompt(payload: ExtractedRacePayload): string {
  const { playerSummary, opponentSummary, extractedFeatures } = payload;
  const metrics = playerSummary.metrics;

  let opponentContext = "Corrida individual (sem oponente direto registrado).";
  if (opponentSummary) {
    const oppMetrics = opponentSummary.metrics;
    opponentContext = `
OPONENTE (Slot ${opponentSummary.slot}):
- Duração total: ${oppMetrics.durationSeconds?.toFixed(1) ?? "N/A"}s
- Atenção Média: ${oppMetrics.avgAttention?.toFixed(1) ?? "N/A"}%
- Zona de Foco: ${oppMetrics.focusZonePct?.toFixed(0) ?? "N/A"}%
- Pico de Foco: ${oppMetrics.peakAttention?.toFixed(0) ?? "N/A"}%
`.trim();
  }

  const slicesText = extractedFeatures.attentionSlices
    .map(
      (s) =>
        `- ${s.phase}: Foco Médio = ${s.avgAttention.toFixed(1)}% | Calma/Meditação Média = ${s.avgMeditation.toFixed(1)}%`
    )
    .join("\n");

  const eventsText =
    extractedFeatures.chokeDetected && extractedFeatures.chokeTimestampSecond !== null
      ? `ALERTA DE ANOMALIA: Queda acentuada de atenção (Choke) detectada por volta dos ${extractedFeatures.chokeTimestampSecond}s de prova.`
      : "ESTABILIDADE: Nenhum colapso cognitivo abrupto detectado.";

  return `
DADOS DA TELEMETRIA PARA ANÁLISE:

PILOTO ANALISADO (Slot ${playerSummary.slot}):
- Resultado Final: ${extractedFeatures.result} ${
    extractedFeatures.timeDeltaSeconds !== null
      ? `(Diferença: ${extractedFeatures.timeDeltaSeconds > 0 ? "+" : ""}${extractedFeatures.timeDeltaSeconds}s)`
      : ""
  }
- Duração da Prova: ${metrics.durationSeconds?.toFixed(1) ?? "N/A"}s
- Amostras de EEG coletadas: ${metrics.sampleCount}
- Foco Médio (Attention): ${metrics.avgAttention?.toFixed(1) ?? "N/A"}%
- Pico de Foco Máximo: ${metrics.peakAttention?.toFixed(0) ?? "N/A"}%
- Tempo na Zona de Foco (%): ${metrics.focusZonePct?.toFixed(0) ?? "N/A"}%
- Calma Média (Meditation): ${metrics.avgMeditation?.toFixed(1) ?? "N/A"}%
- Desvio Padrão de Estabilidade: ${extractedFeatures.stabilityStdDev}

${opponentContext}

DESEMPENHO POR FASES DA CORRIDA:
${slicesText}

OBSERVAÇÕES DE EVENTOS:
${eventsText}

TAREFA:
Analise as correlações neurocognitivas acima e retorne o JSON estritamente conforme o schema e as diretrizes do Few-Shot.
`.trim();
}