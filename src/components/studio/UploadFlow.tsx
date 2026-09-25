"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { createVideoAction } from "@/actions/videos";
import { MAX_VIDEO_BYTES } from "@/lib/constants";
import { formatDuration } from "@/lib/format";
import { extOf, resizeImage, uploadFile } from "@/lib/upload-client";
import { FormError, SubmitButton } from "../forms";
import { Icon } from "../icons";
import { VideoDetailsFields } from "./VideoDetailsFields";

type Parent = { id: string; title: string; channel_name: string } | null;

type Frame = { url: string; blob: Blob };

/** Captura quadros do vídeo no navegador para sugerir miniaturas (sem precisar de servidor de vídeo). */
async function captureFrames(file: File): Promise<{ duration: number; frames: Frame[] }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res();
    video.onerror = () => rej(new Error("Não foi possível ler este vídeo no navegador."));
  });
  const duration = isFinite(video.duration) ? video.duration : 0;
  const frames: Frame[] = [];
  const canvas = document.createElement("canvas");
  const w = Math.min(1280, video.videoWidth || 1280);
  const h = Math.round(w * ((video.videoHeight || 720) / (video.videoWidth || 1280)));
  canvas.width = w;
  canvas.height = h;
  for (const pos of [0.15, 0.5, 0.8]) {
    await new Promise<void>((res) => {
      video.onseeked = () => res();
      video.currentTime = Math.max(0.1, duration * pos);
    });
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (blob) frames.push({ blob, url: URL.createObjectURL(blob) });
  }
  URL.revokeObjectURL(url);
  return { duration, frames };
}

export function UploadFlow({ parent }: { parent: Parent }) {
  const [state, action] = useActionState(createVideoAction, {});
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [videoKey, setVideoKey] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [custom, setCustom] = useState<Frame | null>(null);
  const [selected, setSelected] = useState(0); // índice do quadro; -1 = personalizada
  const [thumbKey, setThumbKey] = useState("");
  const [thumbBusy, setThumbBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const abortRef = useRef<() => void>(() => {});
  const fe = state.fieldErrors ?? {};

  // Envia a miniatura escolhida sempre que a escolha muda.
  const chosen = selected === -1 ? custom : frames[selected];
  useEffect(() => {
    if (!chosen) return;
    let cancelled = false;
    setThumbBusy(true);
    setThumbKey("");
    uploadFile(chosen.blob, "thumb", "jpg")
      .promise.then((k) => !cancelled && setThumbKey(k))
      .catch(() => !cancelled && setError("Falha ao enviar a miniatura."))
      .finally(() => !cancelled && setThumbBusy(false));
    return () => {
      cancelled = true;
    };
  }, [chosen]);

  async function pick(f: File | undefined) {
    if (!f) return;
    setError("");
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v)$/i.test(f.name)) return setError("Escolha um arquivo de vídeo (MP4, MOV ou WebM).");
    if (f.size > MAX_VIDEO_BYTES) return setError("O vídeo pode ter até 1 GB nesta versão.");
    setFile(f);
    setProgress(0);
    const up = uploadFile(f, "video", extOf(f), setProgress);
    abortRef.current = up.abort;
    up.promise.then(setVideoKey).catch((e: Error) => setError(e.message));
    try {
      const r = await captureFrames(f);
      setDuration(r.duration);
      setFrames(r.frames);
    } catch {
      /* formatos como .mov (HEVC) nem sempre abrem no navegador: sem sugestão de miniatura */
    }
  }

  async function pickCustom(f: File | undefined) {
    if (!f) return;
    const blob = await resizeImage(f, 1280, 720);
    setCustom({ blob, url: URL.createObjectURL(blob) });
    setSelected(-1);
  }

  if (!file) {
    return (
      <div className="card p-5 sm:p-8">
        {parent && <ReplyBanner parent={parent} />}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed px-6 py-16 text-center transition ${
            dragging ? "border-basil bg-basil/5" : "border-line hover:border-basil"
          }`}
        >
          <span className="flex size-24 items-center justify-center rounded-full bg-cream-2">
            <Icon name="upload" size={42} className="text-basil" />
          </span>
          <p className="mt-5 text-lg font-semibold">Arraste o vídeo aqui ou toque para escolher</p>
          <p className="mt-1 text-sm text-muted">MP4, MOV ou WebM · até 1 GB · horizontal ou vertical</p>
          <span className="btn btn-red mt-6 h-11 px-6">Selecionar arquivo</span>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {error && <p className="mt-3 text-center text-sm text-tomato">{error}</p>}
        <p className="mt-6 text-center text-xs text-muted">
          Publique o que você faz: a massa do dia, o forno, um teste, uma dúvida. Não precisa ser uma aula.
        </p>
      </div>
    );
  }

  const uploading = !videoKey && !error;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <input type="hidden" name="video_key" value={videoKey} />
      <input type="hidden" name="thumb_key" value={thumbKey} />
      <input type="hidden" name="duration" value={Math.round(duration)} />
      {parent && <input type="hidden" name="parent_id" value={parent.id} />}

      <div className="card flex flex-col gap-5 p-5 sm:p-6">
        {parent && <ReplyBanner parent={parent} />}
        <FormError message={state.error || error || fe.video || fe.thumb || fe.parent} />
        <VideoDetailsFields defaults={{ title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 100) }} errors={fe} />

        <div>
          <span className="label">Miniatura</span>
          <p className="mb-3 text-xs text-muted">Escolha um quadro do vídeo ou envie uma imagem.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {frames.map((f, i) => (
              <button
                type="button"
                key={f.url}
                onClick={() => setSelected(i)}
                className={`overflow-hidden rounded-xl border-2 ${selected === i ? "border-basil" : "border-transparent opacity-80 hover:opacity-100"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={`Quadro ${i + 1}`} className="aspect-video w-full object-cover" />
              </button>
            ))}
            <label
              className={`flex aspect-video cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed text-xs text-muted ${
                selected === -1 ? "border-basil" : "border-line hover:border-basil"
              }`}
            >
              {custom ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={custom.url} alt="Miniatura personalizada" className="size-full object-cover" />
              ) : (
                <>
                  <Icon name="camera" size={20} /> Enviar imagem
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pickCustom(e.target.files?.[0])} />
            </label>
          </div>
          {thumbBusy && <p className="mt-2 text-xs text-muted">Enviando miniatura…</p>}
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="card overflow-hidden lg:sticky lg:top-20">
          <div className="relative aspect-video bg-ink">
            {chosen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={chosen.url} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-cream/60">
                <Icon name="film" size={40} />
              </div>
            )}
            {duration > 0 && (
              <span className="absolute right-2 bottom-2 rounded bg-ink/85 px-1.5 text-xs text-white">{formatDuration(duration)}</span>
            )}
          </div>
          <div className="p-4 text-sm">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream-2">
              <div className="tricolore h-full transition-all" style={{ width: `${videoKey ? 100 : progress}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {error ? <span className="text-tomato">{error}</span> : videoKey ? "Envio concluído ✓" : `Enviando… ${progress}%`}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <SubmitButton className="btn-green w-full" pendingText="Publicando…" disabled={!videoKey || thumbBusy}>
                {uploading ? "Aguardando envio…" : "Publicar"}
              </SubmitButton>
              <button
                type="button"
                className="btn btn-ghost w-full"
                onClick={() => {
                  abortRef.current();
                  window.location.reload();
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </aside>
    </form>
  );
}

function ReplyBanner({ parent }: { parent: NonNullable<Parent> }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-basil/30 bg-basil/5 p-3 text-sm">
      <Icon name="videoReply" className="shrink-0 text-basil" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-basil">Resposta em vídeo para</p>
        <Link href={`/watch/${parent.id}`} className="line-clamp-1 font-semibold hover:underline">
          {parent.title}
        </Link>
        <p className="text-xs text-muted">{parent.channel_name}</p>
      </div>
    </div>
  );
}
