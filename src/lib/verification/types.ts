import type { AiStatus, VerificationType } from "../constants";

/** Origem de cada evidência. Novas fontes (associações, instituições, outras redes) entram aqui. */
export type EvidenceSource =
  | "user_provided" // declarado pelo candidato no formulário
  | "instagram" // perfil do Instagram (declarado ou via API oficial)
  | "website" // site profissional declarado
  | "business" // vínculo com estabelecimento declarado
  | "student" // vínculo acadêmico declarado
  | "document" // comprovante enviado (conteúdo não é lido pela IA no MVP)
  | "account"; // dados da própria conta na plataforma

export type EvidenceItem = {
  /** Identificador estável dentro da solicitação (ex.: "ev_empresa"). A IA só pode citar esses ids. */
  id: string;
  source: EvidenceSource;
  label: string;
  value: string;
  /**
   * true somente quando o dado veio de uma fonte que o confirma (API oficial autenticada pelo
   * próprio usuário, documento conferido por humano). Dados apenas declarados são false.
   */
  confirmed: boolean;
};

export type VerificationInput = {
  userId: string;
  type: VerificationType;
  fields: Record<string, string>;
  documentKey: string | null;
  account: { name: string; handle: string; email: string; created_at: string };
};

export type FraudSignal = {
  code: "duplicate_instagram" | "duplicate_website" | "repeated_attempts" | "name_mismatch" | "recent_rejection" | "suspended_account";
  description: string;
  severity: "low" | "medium" | "high";
};

export type AnalysisSignal = {
  type: string;
  description: string;
  strength: "strong" | "medium" | "weak";
  evidence_ids: string[];
};

export type AnalysisResult = {
  status: AiStatus;
  confidence: number;
  summary: string;
  signals: AnalysisSignal[];
  inconsistencies: { description: string; evidence_ids: string[] }[];
  missing_information: string[];
  recommended_action: "approve_or_fast_review" | "human_review" | "request_more_information" | "mandatory_review";
};

export type AnalyzerOutput = { result: AnalysisResult; model: string };

export interface EvidenceProvider {
  readonly id: EvidenceSource;
  readonly label: string;
  collect(input: VerificationInput): EvidenceItem[];
}
