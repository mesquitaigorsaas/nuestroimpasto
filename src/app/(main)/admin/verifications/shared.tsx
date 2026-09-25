import { AI_STATUS } from "@/lib/constants";
import { StatusPill } from "@/components/ui";

export const REQUEST_STATUS: Record<string, { label: string; tone: "gray" | "gold" | "green" | "red" | "ink" }> = {
  pending_review: { label: "Aguardando análise", tone: "gold" },
  under_review: { label: "Em análise", tone: "ink" },
  needs_info: { label: "Precisa de informações", tone: "gold" },
  approved: { label: "Aprovado", tone: "green" },
  rejected: { label: "Rejeitado", tone: "red" },
  review_required: { label: "Revisão necessária", tone: "red" },
};

export const SOURCE_LABEL: Record<string, string> = {
  user_provided: "Declarado",
  instagram: "Instagram",
  website: "Site/perfis",
  business: "Empresa",
  student: "Acadêmico",
  document: "Comprovante",
  account: "Conta",
};

export const EVENT_LABEL: Record<string, string> = {
  submitted: "Solicitação enviada",
  resubmitted: "Informações complementadas",
  ai_analyzed: "Análise automática",
  auto_approved: "Aprovada automaticamente",
  under_review: "Análise iniciada",
  approved: "Aprovada",
  needs_info: "Pedido de mais informações",
  rejected: "Rejeitada",
  review_required: "Colocada em revisão",
};

export function RequestStatusPill({ status }: { status: string }) {
  const s = REQUEST_STATUS[status] ?? { label: status, tone: "gray" as const };
  return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
}

export function AiBadge({ status, confidence }: { status: string; confidence: number | null }) {
  const tone =
    status === "high_confidence" ? "bg-basil/10 text-basil" : status === "medium_confidence" ? "bg-gold-soft text-gold-dark" : status === "low_confidence" ? "bg-cream-2 text-ink-2" : "bg-tomato/10 text-tomato";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {AI_STATUS[status as keyof typeof AI_STATUS] ?? status}
      {confidence !== null && <b>{Math.round(confidence * 100)}%</b>}
    </span>
  );
}
