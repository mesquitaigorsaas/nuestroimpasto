export const CATEGORIES = [
  { slug: "pizza", name: "Pizza" },
  { slug: "fermentacao", name: "Fermentação" },
  { slug: "massas", name: "Massas" },
  { slug: "panificacao", name: "Panificação" },
  { slug: "farinhas", name: "Farinhas" },
  { slug: "fornos", name: "Fornos" },
  { slug: "tecnicas", name: "Técnicas" },
  { slug: "bastidores", name: "Bastidores" },
  { slug: "outros", name: "Outros" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function categoryName(slug: string | null | undefined) {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? "Outros";
}

export const MEMBER_TYPES = {
  viewer: "Membro",
  student: "Estudante verificado",
  professional: "Profissional verificado",
  related: "Área relacionada verificada",
} as const;

export type MemberType = keyof typeof MEMBER_TYPES;

/** Tipos de membro que podem criar canal e publicar. */
export const PUBLISHER_TYPES = ["professional", "student", "related"] as const;

export function isPublisherType(t: string | null | undefined) {
  return (PUBLISHER_TYPES as readonly string[]).includes(t ?? "");
}

/**
 * Status de verificação do usuário.
 * Equivalência com a especificação: none=UNVERIFIED, pending=PENDING_REVIEW, under_review=UNDER_REVIEW,
 * needs_info=MORE_INFORMATION_REQUIRED, verified=VERIFIED, rejected=REJECTED, review=REVIEW_REQUIRED.
 * SUSPENDED é o status da conta (users.status), independente da verificação.
 */
export const VERIFICATION_STATUS = {
  none: "Não verificado",
  pending: "Aguardando análise",
  under_review: "Em análise pela equipe",
  needs_info: "Precisa de mais informações",
  verified: "Verificado",
  rejected: "Recusado",
  review: "Revisão necessária",
} as const;

export type VerificationStatus = keyof typeof VERIFICATION_STATUS;

export const VERIFICATION_TYPES = {
  professional: "Pizzaiolo / profissional",
  student: "Estudante",
  related: "Profissional de área relacionada",
} as const;

export type VerificationType = keyof typeof VERIFICATION_TYPES;

export const AI_STATUS = {
  high_confidence: "Alta confiança",
  medium_confidence: "Média confiança",
  low_confidence: "Baixa confiança",
  inconsistent: "Inconsistente — revisão",
} as const;

export type AiStatus = keyof typeof AI_STATUS;

export const REPORT_REASONS = {
  spam: "Spam",
  fraude: "Fraude",
  assedio: "Assédio",
  ilegal: "Conteúdo ilegal",
  ofensivo: "Conteúdo ofensivo",
  conta_falsa: "Conta falsa",
  manipulacao: "Manipulação",
  fora_do_tema: "Não relacionado à proposta da plataforma",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

/** Campos técnicos opcionais que o criador pode informar em cada vídeo. */
export const TECH_FIELDS = [
  { key: "hidratacao", label: "Hidratação", placeholder: "Ex.: 68%" },
  { key: "farinha", label: "Farinha", placeholder: "Ex.: Tipo 00, W 300" },
  { key: "fermentacao", label: "Fermentação", placeholder: "Ex.: Biga 48h + 24h em bloco" },
  { key: "temperatura", label: "Temperatura", placeholder: "Ex.: 450 °C" },
  { key: "metodo", label: "Método", placeholder: "Ex.: Direto, poolish, levain" },
  { key: "forno", label: "Forno", placeholder: "Ex.: Lenha, elétrico, a gás" },
  { key: "tempo", label: "Tempo", placeholder: "Ex.: 90 segundos" },
  { key: "ingredientes", label: "Ingredientes", placeholder: "Ex.: Farinha, água, sal, fermento" },
  { key: "observacoes", label: "Observações", placeholder: "Qualquer detalhe que ajude" },
] as const;

export type TechInfo = Partial<Record<(typeof TECH_FIELDS)[number]["key"], string>>;

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB por vídeo (limite do plano grátis do Supabase Storage)
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Campos do formulário de verificação por tipo de candidato.
 * O campo "evidence" indica o grupo de evidência (usado pelos provedores em lib/verification).
 * Nenhum documento é obrigatório de início: a análise pede mais informações só quando necessário.
 */
export type VerificationField = {
  key: string;
  label: string;
  required?: boolean;
  long?: boolean;
  placeholder?: string;
  evidence: "identity" | "location" | "professional" | "business" | "academic" | "online" | "other";
};

const COMMON_ONLINE: VerificationField[] = [
  { key: "instagram", label: "Seu perfil do Instagram", placeholder: "@seuperfil", evidence: "online" },
  { key: "website", label: "Site profissional", placeholder: "www.suapizzaria.com.br", evidence: "online" },
  { key: "outros_perfis", label: "Outros perfis profissionais", placeholder: "LinkedIn, TikTok, YouTube…", evidence: "online" },
];

export const VERIFICATION_FIELDS: Record<VerificationType, VerificationField[]> = {
  professional: [
    { key: "nome", label: "Nome profissional", required: true, evidence: "identity" },
    { key: "cidade", label: "Cidade / estado / país", required: true, placeholder: "Belo Horizonte, MG, Brasil", evidence: "location" },
    { key: "profissao", label: "Profissão", required: true, placeholder: "Pizzaiolo, padeiro, chef de massas…", evidence: "professional" },
    { key: "especialidade", label: "Especialidade", placeholder: "Napolitana, levain, massas frescas…", evidence: "professional" },
    { key: "empresa", label: "Pizzaria / empresa onde atua", required: true, evidence: "business" },
    { key: "cargo", label: "Cargo", placeholder: "Pizzaiolo chefe, proprietário, forneiro…", evidence: "business" },
    { key: "experiencia", label: "Tempo de experiência", required: true, placeholder: "Ex.: 6 anos", evidence: "professional" },
    ...COMMON_ONLINE,
    { key: "portfolio", label: "Portfólio", placeholder: "Link para fotos, cardápio, matérias…", evidence: "online" },
    { key: "adicionais", label: "Informações adicionais", long: true, evidence: "other" },
  ],
  student: [
    { key: "nome", label: "Nome completo", required: true, evidence: "identity" },
    { key: "instituicao", label: "Instituição de ensino", required: true, evidence: "academic" },
    { key: "curso", label: "Nome do curso", required: true, placeholder: "Gastronomia, Técnico em Panificação…", evidence: "academic" },
    { key: "area", label: "Área", placeholder: "Gastronomia, panificação, tecnologia de alimentos…", evidence: "academic" },
    { key: "periodo", label: "Período / módulo", evidence: "academic" },
    { key: "cidade", label: "Cidade", required: true, evidence: "location" },
    { key: "matricula", label: "Matrícula ou identificação estudantil", evidence: "academic" },
    ...COMMON_ONLINE,
    { key: "adicionais", label: "Informações adicionais", long: true, evidence: "other" },
  ],
  related: [
    { key: "nome", label: "Nome profissional", required: true, evidence: "identity" },
    { key: "cidade", label: "Cidade / estado / país", required: true, evidence: "location" },
    { key: "profissao", label: "Área de atuação", required: true, placeholder: "Moinho, fornos, equipamentos, consultoria, ingredientes…", evidence: "professional" },
    { key: "empresa", label: "Empresa", required: true, evidence: "business" },
    { key: "cargo", label: "Cargo", evidence: "business" },
    { key: "relacao", label: "Qual a relação do seu trabalho com pizza, massas ou panificação?", required: true, long: true, evidence: "professional" },
    { key: "experiencia", label: "Tempo de experiência", evidence: "professional" },
    ...COMMON_ONLINE,
    { key: "adicionais", label: "Informações adicionais", long: true, evidence: "other" },
  ],
};

/** @ que ninguém pode usar (rotas do site e nome da marca). */
export const RESERVED_HANDLES = new Set(["admin", "studio", "me", "watch", "feed", "api", "media", "login", "signup", "nuestro", "impasto", "suporte"]);
