import { all, get } from "../db";
import type { FraudSignal, VerificationInput } from "./types";

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function cleanHandle(v: string) {
  return v.trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
}

function cleanSite(v: string) {
  return v.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

/**
 * Sinais determinísticos de risco. Servem para ENCAMINHAR à revisão humana —
 * nunca para bloquear ou reprovar automaticamente.
 */
export async function detectFraudSignals(input: VerificationInput, currentRequestId?: string): Promise<FraudSignal[]> {
  const signals: FraudSignal[] = [];
  const others = await all<{ user_id: string; data: string; status: string; created_at: string }>(
    "SELECT user_id, data, status, created_at FROM verification_requests WHERE user_id <> ? AND status <> 'rejected'",
    input.userId,
  );

  const ig = input.fields.instagram ? cleanHandle(input.fields.instagram) : "";
  const site = input.fields.website ? cleanSite(input.fields.website) : "";
  for (const o of others) {
    let d: Record<string, string> = {};
    try {
      d = JSON.parse(o.data);
    } catch {
      /* ignora */
    }
    if (ig && d.instagram && cleanHandle(d.instagram) === ig) {
      signals.push({ code: "duplicate_instagram", severity: "high", description: `O Instagram @${ig} já foi informado por outra conta.` });
      break;
    }
  }
  if (site) {
    for (const o of others) {
      let d: Record<string, string> = {};
      try {
        d = JSON.parse(o.data);
      } catch {
        /* ignora */
      }
      // Sites de empresa podem ser compartilhados por colegas: severidade baixa.
      if (d.website && cleanSite(d.website) === site) {
        signals.push({ code: "duplicate_website", severity: "low", description: `O site ${site} também foi informado por outra conta (pode ser colega da mesma empresa).` });
        break;
      }
    }
  }

  const attempts =
    (await get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM verification_requests WHERE user_id = ? AND created_at > datetime('now','-30 days') AND id <> ?",
      input.userId,
      currentRequestId ?? "",
    ))?.n ?? 0;
  if (attempts >= 3) signals.push({ code: "repeated_attempts", severity: "medium", description: `${attempts + 1} solicitações nos últimos 30 dias.` });

  const recentRejection = await get(
    "SELECT 1 FROM verification_requests WHERE user_id = ? AND status = 'rejected' AND reviewed_at > datetime('now','-7 days')",
    input.userId,
  );
  if (recentRejection) signals.push({ code: "recent_rejection", severity: "medium", description: "Houve uma solicitação recusada nos últimos 7 dias." });

  const declared = normalize(input.fields.nome ?? "");
  const account = normalize(input.account.name);
  if (declared.length && account.length && !declared.some((t) => account.includes(t))) {
    signals.push({
      code: "name_mismatch",
      severity: "low",
      description: `Nome declarado (“${input.fields.nome}”) não tem relação com o nome da conta (“${input.account.name}”). Pode ser nome artístico.`,
    });
  }

  const status = (await get<{ status: string }>("SELECT status FROM users WHERE id = ?", input.userId))?.status;
  if (status === "suspended") signals.push({ code: "suspended_account", severity: "high", description: "A conta está suspensa." });

  return signals;
}
