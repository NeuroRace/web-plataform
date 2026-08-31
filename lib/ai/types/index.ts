export * from "../schemas/cognitive-report.schema";
export type { ExtractedRacePayload } from "../feature-extractor";

/**
 * Interface que representa o feedback salvo no banco / consumido na UI
 */
export interface SavedCognitiveFeedback {
  id?: string;
  race_player_id: string;
  report: import("../schemas/cognitive-report.schema").CognitiveReportOutput;
  created_at: string;
  model_used: string;
}