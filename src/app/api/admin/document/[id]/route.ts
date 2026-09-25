import { getCurrentUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { logAdminAction } from "@/lib/mutations";
import { MIME, storage } from "@/lib/storage";

/** Documento de verificação: só administradores, com registro de acesso. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return new Response("Não autorizado", { status: 403 });
  const { id } = await params;
  const req = get<{ document_key: string | null; user_id: string }>("SELECT document_key, user_id FROM verification_requests WHERE id = ?", id);
  if (!req?.document_key || !storage.stat(req.document_key)) return new Response("Documento indisponível", { status: 404 });
  logAdminAction(user.id, "document_view", "user", req.user_id);
  const ext = req.document_key.split(".").pop() ?? "";
  return new Response(storage.stream(req.document_key), {
    headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "private, no-store" },
  });
}
