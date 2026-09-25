import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { DATA_DIR, newId } from "./db";

/**
 * Abstração de armazenamento. No MVP grava em disco local (pasta data/uploads).
 * Para produção, implementar a mesma interface com Cloudflare R2 / Stream, Mux ou Supabase Storage.
 */
export interface StorageProvider {
  save(kind: StorageKind, body: ReadableStream<Uint8Array> | Buffer, ext: string, maxBytes: number): Promise<string>;
  stat(key: string): { size: number } | null;
  stream(key: string, range?: { start: number; end: number }): ReadableStream<Uint8Array>;
  remove(key: string): void;
}

export type StorageKind = "videos" | "thumbs" | "avatars" | "banners" | "private";

const ROOT = path.join(DATA_DIR, "uploads");

function resolveKey(key: string) {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(path.resolve(ROOT) + path.sep)) throw new Error("Chave inválida");
  return full;
}

export class FileTooLargeError extends Error {}

class LocalStorage implements StorageProvider {
  async save(kind: StorageKind, body: ReadableStream<Uint8Array> | Buffer, ext: string, maxBytes: number) {
    const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 5) || "bin";
    const key = `${kind}/${newId(12)}.${safeExt}`;
    const full = resolveKey(key);
    fs.mkdirSync(path.dirname(full), { recursive: true });

    if (Buffer.isBuffer(body)) {
      if (body.length > maxBytes) throw new FileTooLargeError();
      fs.writeFileSync(full, body);
      return key;
    }

    let written = 0;
    const source = Readable.fromWeb(body as import("node:stream/web").ReadableStream<Uint8Array>);
    source.on("data", (chunk: Buffer) => {
      written += chunk.length;
      if (written > maxBytes) source.destroy(new FileTooLargeError());
    });
    try {
      await pipeline(source, fs.createWriteStream(full));
    } catch (err) {
      fs.rmSync(full, { force: true });
      throw err;
    }
    return key;
  }

  stat(key: string) {
    try {
      const s = fs.statSync(resolveKey(key));
      return s.isFile() ? { size: s.size } : null;
    } catch {
      return null;
    }
  }

  stream(key: string, range?: { start: number; end: number }) {
    const node = fs.createReadStream(resolveKey(key), range);
    return Readable.toWeb(node) as ReadableStream<Uint8Array>;
  }

  remove(key: string) {
    try {
      fs.rmSync(resolveKey(key), { force: true });
    } catch {
      /* já removido */
    }
  }
}

export const storage: StorageProvider = new LocalStorage();

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
