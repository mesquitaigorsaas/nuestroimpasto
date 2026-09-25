import { NextResponse, type NextRequest } from "next/server";
import { canPublish, getCurrentUser } from "@/lib/auth";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/constants";
import { FileTooLargeError, storage, type StorageKind } from "@/lib/storage";

const RULES: Record<string, { kind: StorageKind; exts: string[]; max: number; needsPublisher: boolean }> = {
  video: { kind: "videos", exts: ["mp4", "webm", "mov", "m4v"], max: MAX_VIDEO_BYTES, needsPublisher: true },
  thumb: { kind: "thumbs", exts: ["jpg", "jpeg", "png", "webp"], max: MAX_IMAGE_BYTES, needsPublisher: true },
  avatar: { kind: "avatars", exts: ["jpg", "jpeg", "png", "webp"], max: MAX_IMAGE_BYTES, needsPublisher: false },
  banner: { kind: "banners", exts: ["jpg", "jpeg", "png", "webp"], max: MAX_IMAGE_BYTES, needsPublisher: false },
  document: { kind: "private", exts: ["jpg", "jpeg", "png", "webp", "pdf"], max: MAX_IMAGE_BYTES * 2, needsPublisher: false },
};

/**
 * Upload direto do arquivo no corpo da requisição (streaming, sem carregar tudo na memória).
 * PUT /api/upload?type=video&ext=mp4
 * Em produção, este endpoint passa a devolver uma URL assinada do provedor de vídeo (Stream/Mux/R2).
 */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  if (user.status !== "active") return NextResponse.json({ error: "Conta suspensa." }, { status: 403 });

  const type = req.nextUrl.searchParams.get("type") ?? "";
  const ext = (req.nextUrl.searchParams.get("ext") ?? "").toLowerCase();
  const rule = RULES[type];
  if (!rule) return NextResponse.json({ error: "Tipo de upload inválido." }, { status: 400 });
  if (!rule.exts.includes(ext)) return NextResponse.json({ error: `Formato não suportado (.${ext}).` }, { status: 400 });
  if (rule.needsPublisher && !canPublish(user))
    return NextResponse.json({ error: "Somente membros verificados podem publicar." }, { status: 403 });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > rule.max) return NextResponse.json({ error: "Arquivo grande demais." }, { status: 413 });
  if (!req.body) return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });

  try {
    const key = await storage.save(rule.kind, req.body, ext, rule.max);
    return NextResponse.json({ key });
  } catch (err) {
    if (err instanceof FileTooLargeError) return NextResponse.json({ error: "Arquivo grande demais." }, { status: 413 });
    console.error("upload falhou", err);
    return NextResponse.json({ error: "Falha ao salvar o arquivo." }, { status: 500 });
  }
}
