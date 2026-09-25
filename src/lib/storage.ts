import { newId } from "./db";

/**
 * Arquivos no Supabase Storage (API REST, só no servidor).
 * - bucket "media" (público): videos/, thumbs/, avatars/, banners/
 * - bucket "private": documentos da verificação (chaves "private/…"), só admins leem.
 * O navegador envia o arquivo direto para o Storage com uma URL assinada — o arquivo
 * não passa pelo nosso servidor (a Vercel limita o corpo das requisições a ~4,5 MB).
 */

export type StorageKind = "videos" | "thumbs" | "avatars" | "banners" | "private";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY não configuradas (veja .env.example).");
  return { url: `${url}/storage/v1`, headers: { apikey: secret, Authorization: `Bearer ${secret}` } };
}

/** "private/abc.pdf" → bucket private, objeto abc.pdf; demais → bucket media, objeto = chave. */
function locate(key: string) {
  if (key.includes("..") || key.startsWith("/")) throw new Error("Chave inválida");
  return key.startsWith("private/")
    ? { bucket: "private", object: key.slice("private/".length) }
    : { bucket: "media", object: key };
}

/** Reserva uma chave nova e devolve a URL assinada para o navegador enviar o arquivo (PUT). */
export async function createUpload(kind: StorageKind, ext: string) {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 5) || "bin";
  const key = `${kind}/${newId(12)}.${safeExt}`;
  const { bucket, object } = locate(key);
  const { url, headers } = config();
  const res = await fetch(`${url}/object/upload/sign/${bucket}/${object}`, { method: "POST", headers });
  if (!res.ok) throw new Error(`Storage: falha ao assinar upload (${res.status})`);
  const data = (await res.json()) as { url: string };
  return { key, uploadUrl: `${url}${data.url}` };
}

/** O arquivo existe no Storage? (valida chaves enviadas pelo navegador antes de salvar no banco) */
export async function exists(key: string) {
  try {
    const { bucket, object } = locate(key);
    const { url, headers } = config();
    const res = await fetch(`${url}/object/info/${bucket}/${object}`, { headers, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function remove(key: string) {
  try {
    const { bucket, object } = locate(key);
    const { url, headers } = config();
    await fetch(`${url}/object/${bucket}`, {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [object] }),
    });
  } catch {
    /* já removido */
  }
}

/** Baixa um arquivo (usado para documentos privados). */
export async function download(key: string) {
  const { bucket, object } = locate(key);
  const { url, headers } = config();
  const res = await fetch(`${url}/object/${bucket}/${object}`, { headers, cache: "no-store" });
  return res.ok && res.body ? res : null;
}

export const storage = { createUpload, exists, remove, download };

export const MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/mp4",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};
