import { VERIFICATION_FIELDS, VERIFICATION_TYPES } from "../constants";
import type { EvidenceItem, EvidenceProvider, VerificationInput } from "./types";

/**
 * Provedores de evidência. A verificação não depende de nenhuma fonte específica:
 * cada provedor contribui com itens e novas fontes podem ser registradas em PROVIDERS.
 *
 * Regra: nenhum provedor faz scraping, crawling ou acessa dados de terceiros fora de APIs oficiais.
 */

function fieldLabel(input: VerificationInput, key: string) {
  return VERIFICATION_FIELDS[input.type].find((f) => f.key === key)?.label ?? key;
}

function fromFields(input: VerificationInput, groups: string[], source: EvidenceItem["source"]): EvidenceItem[] {
  return VERIFICATION_FIELDS[input.type]
    .filter((f) => groups.includes(f.evidence) && input.fields[f.key])
    .map((f) => ({
      id: `ev_${f.key}`,
      source,
      label: fieldLabel(input, f.key),
      value: input.fields[f.key],
      confirmed: false,
    }));
}

/** Dados de identidade, localização e atuação declarados no formulário. */
export const UserProvidedEvidence: EvidenceProvider = {
  id: "user_provided",
  label: "Dados declarados",
  collect(input) {
    return [
      { id: "ev_tipo", source: "user_provided", label: "Tipo de candidato", value: VERIFICATION_TYPES[input.type], confirmed: false },
      ...fromFields(input, ["identity", "location", "professional", "other"], "user_provided"),
    ];
  },
};

/** Vínculo com estabelecimento (pizzaria, padaria, empresa). */
export const BusinessEvidence: EvidenceProvider = {
  id: "business",
  label: "Vínculo profissional",
  collect: (input) => (input.type === "student" ? [] : fromFields(input, ["business"], "business")),
};

/** Vínculo acadêmico. */
export const StudentEvidence: EvidenceProvider = {
  id: "student",
  label: "Vínculo acadêmico",
  collect: (input) => (input.type === "student" ? fromFields(input, ["academic"], "student") : []),
};

/**
 * Site profissional: registrado como evidência declarada. Não fazemos download nem varredura
 * do site. (Futuro: confirmação de propriedade do domínio por meta tag ou registro DNS.)
 */
export const WebsiteProvider: EvidenceProvider = {
  id: "website",
  label: "Site profissional",
  collect(input) {
    const items: EvidenceItem[] = [];
    if (input.fields.website) items.push({ id: "ev_website", source: "website", label: "Site profissional", value: input.fields.website, confirmed: false });
    if (input.fields.portfolio) items.push({ id: "ev_portfolio", source: "website", label: "Portfólio", value: input.fields.portfolio, confirmed: false });
    if (input.fields.outros_perfis)
      items.push({ id: "ev_outros_perfis", source: "website", label: "Outros perfis profissionais", value: input.fields.outros_perfis, confirmed: false });
    return items;
  },
};

/**
 * Cliente da integração OFICIAL do Instagram (a implementar quando houver app Meta aprovado).
 *
 * Caminho previsto: API oficial da Meta para Instagram com login do próprio usuário (OAuth).
 * Hoje ela atende contas profissionais (Business/Creator), exige app Meta com as permissões
 * aprovadas e consentimento explícito do usuário. A implementação deve:
 *   - iniciar o OAuth (connectUrl) e tratar o retorno em uma rota própria;
 *   - buscar SOMENTE campos oficialmente disponíveis e necessários (ex.: nome de usuário, tipo de conta);
 *   - guardar apenas o resultado necessário, com data do consentimento, e permitir revogação.
 * Enquanto `instagramOfficialClient` for null, o botão "Conectar Instagram" não aparece e o perfil
 * é tratado como informação DECLARADA. Nunca coletamos dados do Instagram por scraping.
 */
export interface InstagramOfficialClient {
  connectUrl(state: string): string;
  fetchVerifiedProfile(code: string): Promise<{ username: string; accountType: string }>;
}

export const instagramOfficialClient: InstagramOfficialClient | null = null;

export const InstagramProvider: EvidenceProvider & { isOfficialIntegrationConfigured(): boolean } = {
  id: "instagram",
  label: "Instagram",
  isOfficialIntegrationConfigured() {
    return instagramOfficialClient !== null;
  },
  collect(input) {
    const handle = input.fields.instagram?.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "");
    if (!handle) return [];
    return [
      {
        id: "ev_instagram",
        source: "instagram",
        label: "Perfil do Instagram (informado pelo candidato, não conectado)",
        value: `@${handle}`,
        confirmed: false,
      },
    ];
  },
};

/** Comprovante: registramos apenas que existe. O conteúdo é conferido por humanos no painel. */
export const DocumentEvidence: EvidenceProvider = {
  id: "document",
  label: "Comprovante",
  collect: (input) =>
    input.documentKey
      ? [{ id: "ev_documento", source: "document", label: "Comprovante anexado (conferência humana)", value: "Arquivo enviado", confirmed: false }]
      : [],
};

/** Dados da conta, úteis para checar consistência (ex.: nome da conta x nome declarado). */
export const AccountEvidence: EvidenceProvider = {
  id: "account",
  label: "Conta na plataforma",
  collect: (input) => [
    { id: "ev_conta_nome", source: "account", label: "Nome da conta", value: input.account.name, confirmed: false },
    { id: "ev_conta_criada", source: "account", label: "Conta criada em", value: input.account.created_at.slice(0, 10), confirmed: true },
  ],
};

export const PROVIDERS: EvidenceProvider[] = [
  UserProvidedEvidence,
  BusinessEvidence,
  StudentEvidence,
  InstagramProvider,
  WebsiteProvider,
  DocumentEvidence,
  AccountEvidence,
];

export function collectEvidence(input: VerificationInput): EvidenceItem[] {
  return PROVIDERS.flatMap((p) => p.collect(input));
}
