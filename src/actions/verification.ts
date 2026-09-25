"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { VERIFICATION_FIELDS, VERIFICATION_TYPES, type VerificationType } from "@/lib/constants";
import { storage } from "@/lib/storage";
import type { ActionState } from "@/lib/types";
import { submitVerification } from "@/lib/verification";

export type VerificationActionState = ActionState & { status?: string; autoApproved?: boolean };

export async function requestVerificationAction(_: VerificationActionState, form: FormData): Promise<VerificationActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Entre na sua conta." };
  if (user.status !== "active") return { error: "Sua conta está suspensa." };
  if (["pending", "under_review"].includes(user.verification_status)) return { error: "Você já tem uma solicitação em análise." };
  if (user.verification_status === "verified") return { error: "Sua conta já está verificada." };

  const rawType = String(form.get("type") ?? "");
  if (!(rawType in VERIFICATION_TYPES)) return { error: "Escolha o tipo de perfil." };
  const type = rawType as VerificationType;

  const fields: Record<string, string> = {};
  const fieldErrors: Record<string, string> = {};
  for (const f of VERIFICATION_FIELDS[type]) {
    const v = String(form.get(f.key) ?? "").trim().slice(0, f.long ? 1500 : 300);
    if (f.required && !v) fieldErrors[f.key] = "Campo obrigatório.";
    if (v) fields[f.key] = v;
  }
  if (fields.website && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(fields.website)) fieldErrors.website = "Endereço inválido.";
  if (fields.instagram && !/^@?[\w.]{1,30}$|instagram\.com\/[\w.]{1,30}/i.test(fields.instagram)) fieldErrors.instagram = "Informe só o @ do perfil.";

  const documentKey = String(form.get("document_key") ?? "") || null;
  if (documentKey && (!documentKey.startsWith("private/") || !(await storage.exists(documentKey)))) fieldErrors.document = "Arquivo inválido. Envie novamente.";
  if (form.get("consent") !== "on") fieldErrors.consent = "É preciso autorizar o uso dos dados para a verificação.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, error: "Revise os campos destacados." };

  try {
    const outcome = await submitVerification(user, type, fields, documentKey);
    revalidatePath("/", "layout");
    return { ok: true, message: outcome.message, status: outcome.status, autoApproved: outcome.autoApproved };
  } catch (err) {
    console.error("[verificação] falha no envio", err);
    return { error: "Não foi possível enviar agora. Tente novamente em instantes." };
  }
}
