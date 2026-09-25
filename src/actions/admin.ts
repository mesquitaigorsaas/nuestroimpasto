"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { get, run, transaction } from "@/lib/db";
import { logAdminAction, notify } from "@/lib/mutations";
import { setSetting, SETTINGS } from "@/lib/settings";
import { claimVerification, decideVerification, reanalyzeVerification, type AdminDecision } from "@/lib/verification";

type R = { ok: boolean; error?: string };

export async function decideVerificationAction(requestId: string, decision: AdminDecision, reason: string): Promise<R> {
  const admin = await requireAdmin();
  try {
    await decideVerification(requestId, admin.id, decision, reason);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function reanalyzeVerificationAction(requestId: string): Promise<R> {
  const admin = await requireAdmin();
  try {
    await reanalyzeVerification(requestId, admin.id);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function claimVerificationAction(requestId: string): Promise<R> {
  const admin = await requireAdmin();
  await claimVerification(requestId, admin.id);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setAutoApproveAction(enabled: boolean): Promise<R> {
  const admin = await requireAdmin();
  await setSetting(SETTINGS.verificationAutoApprove, enabled ? "true" : "false");
  await logAdminAction(admin.id, enabled ? "auto_approve_on" : "auto_approve_off", "settings", "verification.auto_approve");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function revokeVerificationAction(userId: string, note: string): Promise<R> {
  const admin = await requireAdmin();
  if (!note.trim()) return { ok: false, error: "Explique o motivo." };
  await run("UPDATE users SET verification_status = 'review', member_type = 'viewer' WHERE id = ?", userId);
  await notify({ userId, type: "verification", text: "Sua verificação precisa ser revisada. Envie uma nova solicitação." });
  await logAdminAction(admin.id, "verification_revoke", "user", userId, note.trim());
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setUserStatusAction(userId: string, status: "active" | "suspended" | "banned", note: string): Promise<R> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "Você não pode alterar a própria conta." };
  if (status !== "active" && !note.trim()) return { ok: false, error: "Explique o motivo." };
  await transaction(async () => {
    await run("UPDATE users SET status = ? WHERE id = ?", status, userId);
    if (status === "banned") await run("DELETE FROM sessions WHERE user_id = ?", userId);
    if (status !== "banned")
      await notify({
        userId,
        type: "admin",
        text: status === "suspended" ? `Sua conta foi suspensa: ${note.trim()}` : "Sua conta foi reativada.",
      });
    await logAdminAction(admin.id, `user_${status}`, "user", userId, note.trim());
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setUserRoleAction(userId: string, role: "user" | "admin"): Promise<R> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "Você não pode alterar o próprio papel." };
  await run("UPDATE users SET role = ? WHERE id = ?", role, userId);
  await logAdminAction(admin.id, `role_${role}`, "user", userId);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function moderateVideoAction(videoId: string, action: "hide" | "restore", note: string): Promise<R> {
  const admin = await requireAdmin();
  const v = await get<{ user_id: string; title: string }>("SELECT user_id, title FROM videos WHERE id = ?", videoId);
  if (!v) return { ok: false, error: "Vídeo não encontrado." };
  await run("UPDATE videos SET status = ? WHERE id = ?", action === "hide" ? "hidden" : "published", videoId);
  await notify({
    userId: v.user_id,
    type: "admin",
    videoId,
    text: action === "hide" ? `Seu vídeo “${v.title}” foi ocultado pela moderação. ${note}` : `Seu vídeo “${v.title}” foi restaurado.`,
  });
  await logAdminAction(admin.id, `video_${action}`, "video", videoId, note.trim());
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function moderateCommentAction(commentId: string, action: "hide" | "restore", note: string): Promise<R> {
  const admin = await requireAdmin();
  await run("UPDATE comments SET status = ? WHERE id = ?", action === "hide" ? "hidden" : "visible", commentId);
  await logAdminAction(admin.id, `comment_${action}`, "comment", commentId, note.trim());
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resolveReportAction(reportId: string, outcome: "resolved" | "dismissed", note: string): Promise<R> {
  const admin = await requireAdmin();
  await run(
    "UPDATE reports SET status = ?, resolution = ?, resolved_by = ?, resolved_at = now_iso() WHERE id = ?",
    outcome,
    note.trim(),
    admin.id,
    reportId,
  );
  await logAdminAction(admin.id, `report_${outcome}`, "report", reportId, note.trim());
  revalidatePath("/admin", "layout");
  return { ok: true };
}
