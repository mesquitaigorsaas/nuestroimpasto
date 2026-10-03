/**
 * Upload do navegador: pede ao servidor uma URL assinada (/api/upload) e envia o arquivo
 * direto para o Supabase Storage, com progresso (XHR permite acompanhar o envio).
 */
export function uploadFile(
  body: Blob,
  type: "video" | "thumb" | "avatar" | "banner" | "ad" | "document",
  ext: string,
  onProgress?: (pct: number) => void,
): { promise: Promise<string>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  let aborted = false;
  const promise = (async () => {
    const res = await fetch(`/api/upload?type=${type}&ext=${encodeURIComponent(ext)}&size=${body.size}`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { key?: string; uploadUrl?: string; contentType?: string; error?: string };
    if (!res.ok || !data.key || !data.uploadUrl) throw new Error(data.error ?? "Falha no envio.");
    if (aborted) throw new Error("Envio cancelado.");

    await new Promise<void>((resolve, reject) => {
      xhr.open("PUT", data.uploadUrl!);
      xhr.setRequestHeader("Content-Type", data.contentType ?? "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve();
        const tooLarge = xhr.status === 413 || /size|large/i.test(xhr.responseText);
        reject(new Error(tooLarge ? "Arquivo grande demais." : "Falha no envio."));
      };
      xhr.onerror = () => reject(new Error("Falha de conexão durante o envio."));
      xhr.onabort = () => reject(new Error("Envio cancelado."));
      xhr.send(body);
    });
    return data.key;
  })();
  return {
    promise,
    abort: () => {
      aborted = true;
      xhr.abort();
    },
  };
}

export function extOf(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return file.type.split("/").pop() ?? "bin";
}

/**
 * Redimensiona uma imagem no navegador e devolve JPEG (reduz o peso de fotos de celular).
 * JPEG não tem transparência: PNG sem fundo ganha fundo branco (senão o transparente vira preto).
 */
export async function resizeImage(file: File, maxW: number, maxH: number, quality = 0.86): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao processar imagem"))), "image/jpeg", quality));
}
