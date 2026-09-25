/** Upload do navegador para /api/upload com progresso (XHR permite acompanhar o envio). */
export function uploadFile(
  body: Blob,
  type: "video" | "thumb" | "avatar" | "banner" | "document",
  ext: string,
  onProgress?: (pct: number) => void,
): { promise: Promise<string>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<string>((resolve, reject) => {
    xhr.open("PUT", `/api/upload?type=${type}&ext=${encodeURIComponent(ext)}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: { key?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* resposta não-JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.key) resolve(data.key);
      else reject(new Error(data.error ?? "Falha no envio."));
    };
    xhr.onerror = () => reject(new Error("Falha de conexão durante o envio."));
    xhr.onabort = () => reject(new Error("Envio cancelado."));
    xhr.send(body);
  });
  return { promise, abort: () => xhr.abort() };
}

export function extOf(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return file.type.split("/").pop() ?? "bin";
}

/** Redimensiona uma imagem no navegador e devolve JPEG (reduz o peso de fotos de celular). */
export async function resizeImage(file: File, maxW: number, maxH: number, quality = 0.86): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao processar imagem"))), "image/jpeg", quality));
}
