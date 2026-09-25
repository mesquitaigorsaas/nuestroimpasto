import { VERIFICATION_TYPES, type VerificationType } from "../constants";
import { all, get, newId, run, transaction } from "../db";
import { parseJson } from "../format";
import { logAdminAction, notify } from "../mutations";
import { getSetting, SETTINGS } from "../settings";
import { storage } from "../storage";
import { VerificationAnalysisService } from "./analysis";
import { detectFraudSignals } from "./fraud";
import { collectEvidence } from "./providers";
import type { AnalysisResult, EvidenceItem, FraudSignal, VerificationInput } from "./types";

export type RequestStatus = "pending_review" | "under_review" | "needs_info" | "approved" | "rejected" | "review_required";
export type AdminDecision = "approve" | "needs_info" | "reject" | "review_required";

type EventInput = {
  requestId: string;
  actorId: string | null;
  event: string;
  reason?: string;
  ai?: { status: string; confidence: number; model: string } | null;
  evidenceIds?: string[];
};

export async function recordEvent(e: EventInput) {
  await run(
    `INSERT INTO verification_events (id, request_id, actor_id, event, reason, ai_status, ai_confidence, ai_model, evidence_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    newId(),
    e.requestId,
    e.actorId,
    e.event,
    e.reason ?? "",
    e.ai?.status ?? null,
    e.ai?.confidence ?? null,
    e.ai?.model ?? null,
    JSON.stringify(e.evidenceIds ?? []),
  );
}

const TYPE_TO_MEMBER: Record<VerificationType, string> = { professional: "professional", student: "student", related: "related" };

function userMessageFor(result: AnalysisResult) {
  if (!result.missing_information.length) return "Precisamos de mais informações para confirmar seu vínculo.";
  return `Para concluir a verificação, precisamos de:\n• ${result.missing_information.join("\n• ")}`;
}

/**
 * Política de decisão após a análise.
 *  - Sinais de risco médios/altos ou análise inconsistente → revisão humana obrigatória.
 *  - Alta confiança → aprovação automática (se habilitada pelo admin) ou revisão rápida.
 *  - Média confiança → fila de revisão humana.
 *  - Baixa confiança → pedido de mais informações ao candidato (nunca reprovação automática).
 */
async function decide(result: AnalysisResult, fraud: FraudSignal[]): Promise<{ request: RequestStatus; user: string; auto: boolean }> {
  const risky = fraud.some((f) => f.severity !== "low");
  if (risky || result.status === "inconsistent") return { request: "review_required", user: "under_review", auto: false };
  if (result.status === "high_confidence") {
    const auto = await getSetting(SETTINGS.verificationAutoApprove) === "true";
    return auto ? { request: "approved", user: "verified", auto: true } : { request: "pending_review", user: "pending", auto: false };
  }
  if (result.status === "medium_confidence") return { request: "pending_review", user: "pending", auto: false };
  return { request: "needs_info", user: "needs_info", auto: false };
}

export type SubmitOutcome = { requestId: string; status: RequestStatus; autoApproved: boolean; message: string };

/** Envio (ou reenvio após "precisa de informações") de uma solicitação. */
export async function submitVerification(
  user: { id: string; name: string; handle: string; email: string; created_at: string },
  type: VerificationType,
  fields: Record<string, string>,
  documentKey: string | null,
): Promise<SubmitOutcome> {
  const input: VerificationInput = {
    userId: user.id,
    type,
    fields,
    documentKey,
    account: { name: user.name, handle: user.handle, email: user.email, created_at: user.created_at },
  };

  // Reaproveita a solicitação aberta que pediu mais informações; senão, cria uma nova.
  const open = await get<{ id: string; document_key: string | null }>(
    "SELECT id, document_key FROM verification_requests WHERE user_id = ? AND status = 'needs_info' ORDER BY created_at DESC LIMIT 1",
    user.id,
  );
  const requestId = open?.id ?? newId();
  if (open && !documentKey && open.document_key) input.documentKey = open.document_key;

  const evidence = collectEvidence(input);
  const fraud = await detectFraudSignals(input, requestId);

  await transaction(async () => {
    if (open) {
      if (open.document_key && documentKey && open.document_key !== documentKey) void storage.remove(open.document_key);
      await run(
        `UPDATE verification_requests SET type = ?, data = ?, document_key = ?, evidence = ?, fraud_signals = ?, status = 'pending_review',
           consent_at = now_iso(), updated_at = now_iso() WHERE id = ?`,
        type,
        JSON.stringify(fields),
        input.documentKey,
        JSON.stringify(evidence),
        JSON.stringify(fraud),
        requestId,
      );
      await recordEvent({ requestId, actorId: user.id, event: "resubmitted", reason: "Candidato enviou novas informações." });
    } else {
      await run(
        `INSERT INTO verification_requests (id, user_id, type, data, document_key, evidence, fraud_signals, consent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, now_iso())`,
        requestId,
        user.id,
        type,
        JSON.stringify(fields),
        input.documentKey,
        JSON.stringify(evidence),
        JSON.stringify(fraud),
      );
      await recordEvent({ requestId, actorId: user.id, event: "submitted", reason: `Solicitação como ${VERIFICATION_TYPES[type]}.` });
    }
    await run("UPDATE users SET verification_status = 'pending' WHERE id = ?", user.id);
  });

  return analyzeAndApply(requestId, evidence, fraud, type, user.id);
}

async function analyzeAndApply(
  requestId: string,
  evidence: EvidenceItem[],
  fraud: FraudSignal[],
  type: VerificationType,
  userId: string,
): Promise<SubmitOutcome> {
  const { result, model } = await VerificationAnalysisService.analyze({ type, evidence, fraud });
  const decision = await decide(result, fraud);
  const ai = { status: result.status, confidence: result.confidence, model };
  const citedIds = [...new Set(result.signals.flatMap((s) => s.evidence_ids))];
  const note = decision.request === "needs_info" ? userMessageFor(result) : "";

  await transaction(async () => {
    await run(
      `UPDATE verification_requests SET ai_status = ?, ai_confidence = ?, ai_result = ?, ai_model = ?,
         ai_analyzed_at = now_iso(), status = ?, admin_note = ?,
         reviewed_at = CASE WHEN ? = 'approved' THEN now_iso() ELSE reviewed_at END,
         updated_at = now_iso() WHERE id = ?`,
      result.status,
      result.confidence,
      JSON.stringify(result),
      model,
      decision.request,
      note,
      decision.request,
      requestId,
    );
    await recordEvent({ requestId, actorId: null, event: "ai_analyzed", reason: result.summary, ai, evidenceIds: citedIds });

    if (decision.auto) {
      await run("UPDATE users SET verification_status = 'verified', member_type = ? WHERE id = ?", TYPE_TO_MEMBER[type], userId);
      await recordEvent({ requestId, actorId: null, event: "auto_approved", reason: "Alta confiança, sem sinais de risco; aprovação automática habilitada.", ai, evidenceIds: citedIds });
      await notify({ userId, type: "verification", text: `Sua verificação como ${VERIFICATION_TYPES[type].toLowerCase()} foi aprovada! Você já pode publicar vídeos.` });
    } else {
      await run("UPDATE users SET verification_status = ? WHERE id = ?", decision.user, userId);
      if (decision.request === "needs_info") {
        await recordEvent({ requestId, actorId: null, event: "needs_info", reason: note, ai });
        await notify({ userId, type: "verification", text: "Sua verificação precisa de mais informações. Veja o que falta." });
      }
    }
  });

  const message = decision.auto
    ? "Verificação aprovada! Seu selo já aparece no seu canal e você pode publicar."
    : decision.request === "needs_info"
      ? "Precisamos de mais algumas informações para concluir. Veja abaixo o que falta."
      : "Solicitação recebida e analisada. Agora ela passa pela equipe; você será avisado nas notificações.";
  return { requestId, status: decision.request, autoApproved: decision.auto, message };
}

/**
 * Retoma solicitações que ficaram sem análise (falha no meio do processo, ou dados importados).
 * Processa poucas por vez para não travar a página.
 */
export async function analyzePending(limit = 3) {
  const pending = await all<{ id: string; user_id: string; type: VerificationType; data: string; document_key: string | null }>(
    "SELECT id, user_id, type, data, document_key FROM verification_requests WHERE ai_analyzed_at IS NULL AND status = 'pending_review' ORDER BY created_at LIMIT ?",
    limit,
  );
  for (const req of pending) {
    const user = await get<{ id: string; name: string; handle: string; email: string; created_at: string }>(
      "SELECT id, name, handle, email, created_at FROM users WHERE id = ?",
      req.user_id,
    );
    if (!user) continue;
    const input: VerificationInput = { userId: user.id, type: req.type, fields: parseJson(req.data, {}), documentKey: req.document_key, account: user };
    const evidence = collectEvidence(input);
    const fraud = await detectFraudSignals(input, req.id);
    await run("UPDATE verification_requests SET evidence = ?, fraud_signals = ? WHERE id = ?", JSON.stringify(evidence), JSON.stringify(fraud), req.id);
    await analyzeAndApply(req.id, evidence, fraud, req.type, user.id);
  }
  return pending.length;
}

/** Admin: roda a análise novamente (ex.: depois de mudar a configuração ou ativar a IA). */
export async function reanalyzeVerification(requestId: string, adminId: string) {
  const req = await get<{ user_id: string; type: VerificationType; data: string; document_key: string | null; status: string }>(
    "SELECT user_id, type, data, document_key, status FROM verification_requests WHERE id = ?",
    requestId,
  );
  if (!req) throw new Error("Solicitação não encontrada.");
  const user = (await get<{ id: string; name: string; handle: string; email: string; created_at: string }>(
    "SELECT id, name, handle, email, created_at FROM users WHERE id = ?",
    req.user_id,
  ))!;
  const input: VerificationInput = {
    userId: user.id,
    type: req.type,
    fields: parseJson(req.data, {}),
    documentKey: req.document_key,
    account: user,
  };
  const evidence = collectEvidence(input);
  const fraud = await detectFraudSignals(input, requestId);
  const { result, model } = await VerificationAnalysisService.analyze({ type: req.type, evidence, fraud });
  await run(
    `UPDATE verification_requests SET evidence = ?, fraud_signals = ?, ai_status = ?, ai_confidence = ?, ai_result = ?, ai_model = ?,
       ai_analyzed_at = now_iso(), updated_at = now_iso() WHERE id = ?`,
    JSON.stringify(evidence),
    JSON.stringify(fraud),
    result.status,
    result.confidence,
    JSON.stringify(result),
    model,
    requestId,
  );
  await recordEvent({
    requestId,
    actorId: adminId,
    event: "ai_analyzed",
    reason: `Reanálise solicitada pelo administrador. ${result.summary}`,
    ai: { status: result.status, confidence: result.confidence, model },
    evidenceIds: [...new Set(result.signals.flatMap((s) => s.evidence_ids))],
  });
  await logAdminAction(adminId, "verification_reanalyze", "user", req.user_id);
}

/** Admin: decisão humana final. O administrador pode divergir da recomendação da IA. */
export async function decideVerification(requestId: string, adminId: string, decision: AdminDecision, reason: string) {
  const req = await get<{ user_id: string; type: VerificationType; status: string; document_key: string | null; ai_status: string | null; ai_confidence: number | null; ai_model: string | null; ai_result: string | null }>(
    "SELECT user_id, type, status, document_key, ai_status, ai_confidence, ai_model, ai_result FROM verification_requests WHERE id = ?",
    requestId,
  );
  if (!req) throw new Error("Solicitação não encontrada.");
  if (!reason.trim()) throw new Error("Registre o motivo da decisão.");

  const ai = req.ai_status ? { status: req.ai_status, confidence: req.ai_confidence ?? 0, model: req.ai_model ?? "" } : null;
  const cited = [...new Set(parseJson<AnalysisResult | null>(req.ai_result, null)?.signals.flatMap((s) => s.evidence_ids) ?? [])];
  const map = {
    approve: { req: "approved", user: "verified", text: `Sua verificação como ${VERIFICATION_TYPES[req.type].toLowerCase()} foi aprovada! Você já pode publicar vídeos.` },
    needs_info: { req: "needs_info", user: "needs_info", text: "Sua verificação precisa de mais informações. Veja a mensagem da equipe." },
    reject: { req: "rejected", user: "rejected", text: "Sua solicitação de verificação não foi aprovada. Veja a mensagem da equipe." },
    review_required: { req: "review_required", user: "under_review", text: "" },
  }[decision];

  await transaction(async () => {
    await run(
      `UPDATE verification_requests SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = now_iso(),
         updated_at = now_iso() WHERE id = ?`,
      map.req,
      decision === "review_required" ? "" : reason.trim(),
      adminId,
      requestId,
    );
    if (decision === "approve") await run("UPDATE users SET verification_status = 'verified', member_type = ? WHERE id = ?", TYPE_TO_MEMBER[req.type], req.user_id);
    else await run("UPDATE users SET verification_status = ?, member_type = CASE WHEN ? = 'rejected' THEN 'viewer' ELSE member_type END WHERE id = ?", map.user, map.req, req.user_id);
    await recordEvent({ requestId, actorId: adminId, event: map.req === "review_required" ? "review_required" : map.req, reason: reason.trim(), ai, evidenceIds: cited });
    if (map.text) await notify({ userId: req.user_id, type: "verification", text: map.text });
    await logAdminAction(adminId, `verification_${decision}`, "user", req.user_id, reason.trim());
  });

  // Minimização de dados: o comprovante é apagado após a decisão final.
  if ((decision === "approve" || decision === "reject") && req.document_key) {
    void storage.remove(req.document_key);
    await run("UPDATE verification_requests SET document_key = NULL WHERE id = ?", requestId);
  }
}

/** Admin assume a análise (status "em análise pela equipe"). */
export async function claimVerification(requestId: string, adminId: string) {
  const req = await get<{ user_id: string; status: string }>("SELECT user_id, status FROM verification_requests WHERE id = ?", requestId);
  if (!req || !["pending_review", "review_required"].includes(req.status)) return;
  await run("UPDATE verification_requests SET status = 'under_review', reviewed_by = ?, updated_at = now_iso() WHERE id = ?", adminId, requestId);
  await run("UPDATE users SET verification_status = 'under_review' WHERE id = ?", req.user_id);
  await recordEvent({ requestId, actorId: adminId, event: "under_review", reason: "Administrador iniciou a análise." });
}
