import type { NextRequest } from "next/server";
import { MIME, storage } from "@/lib/storage";

/** Serve arquivos públicos com suporte a Range (necessário para o player avançar/voltar no vídeo). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params;
  const key = parts.join("/");
  if (key.startsWith("private/") || parts.some((p) => p === ".." || p === "")) return new Response("Não encontrado", { status: 404 });

  const info = storage.stat(key);
  if (!info) return new Response("Não encontrado", { status: 404 });

  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const type = MIME[ext] ?? "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m?.[1] ? parseInt(m[1], 10) : 0;
    let end = m?.[2] ? parseInt(m[2], 10) : info.size - 1;
    if (!m?.[1] && m?.[2]) {
      // sufixo: últimos N bytes
      start = Math.max(0, info.size - parseInt(m[2], 10));
      end = info.size - 1;
    }
    end = Math.min(end, info.size - 1, start + 4 * 1024 * 1024 - 1); // blocos de até 4 MB
    if (start >= info.size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    }
    return new Response(storage.stream(key, { start, end }), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": String(end - start + 1) },
    });
  }

  return new Response(storage.stream(key), { headers: { ...headers, "Content-Length": String(info.size) } });
}
