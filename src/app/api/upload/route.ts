import { NextResponse, type NextRequest } from "next/server";
import { canPublish, getCurrentUser } from "@/lib/auth";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/constants";
import { MIME, storage, type StorageKind } from "@/lib/storage";

const RULES: Record<string, { kind: StorageKind; exts: string[]; max: number; needsPublisher: boolean }> = {
  video: { kind: "videos", exts: ["mp4", "webm", "mov", "m4v"], max: MAX_VIDEO_BYTES, needsPublisher: true },
  thumb: { kind: "thumbs", exts: ["jpg", "jpeg", "png", "webp"], max: MAX_IMAGE_BYTES, needsPublisher: true },
  avatar: { kind: "avatars", exts: ["jpg", "jpeg", "png", "webp"], max: MAX_IMAGE_BYTES, needsPublisher: false },
  banner: { kind: "banners", exts: ["jpg", "jpeg", "png", "webp"], max: MAX_IMAGE_BYTES, needsPublisher: false },
  document: { kind: "private", exts: ["jpg", "jpeg", "png", "webp", "pdf"], max: MAX_IMAGE_BYTES * 2, needsPublisher: false },
};

/**
 * Autoriza um upload e devolve uma URL assinada do Supabase Storage.
 * POST /api/upload?type=video&ext=mp4&size=123  →  { key, uploadUrl, contentType }
 * O navegador envia o arquivo direto para uploadUrl (PUT). O limite de tamanho
 * também é aplicado pelo próprio bucket.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  if (user.status !== "active") return NextResponse.json({ error: "Conta suspensa." }, { status: 403 });

  const type = req.nextUrl.searchParams.get("type") ?? "";
  const ext = (req.nextUrl.searchParams.get("ext") ?? "").toLowerCase();
  const size = Number(req.nextUrl.searchParams.get("size") ?? 0);
  const rule = RULES[type];
  if (!rule) return NextResponse.json({ error: "Tipo de upload inválido." }, { status: 400 });
  if (!rule.exts.includes(ext)) return NextResponse.json({ error: `Formato não suportado (.${ext}).` }, { status: 400 });
  if (rule.needsPublisher && !canPublish(user))
    return NextResponse.json({ error: "Somente membros verificados podem publicar." }, { status: 403 });
  if (!size) return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
  if (size > rule.max) return NextResponse.json({ error: "Arquivo grande demais." }, { status: 413 });

  try {
    const { key, uploadUrl } = await storage.createUpload(rule.kind, ext);
    return NextResponse.json({ key, uploadUrl, contentType: MIME[ext] ?? "application/octet-stream" });
  } catch (err) {
    console.error("upload falhou", err);
    return NextResponse.json({ error: "Falha ao preparar o envio." }, { status: 500 });
  }
}
