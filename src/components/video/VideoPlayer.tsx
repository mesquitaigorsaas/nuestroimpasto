"use client";

import { useEffect, useRef } from "react";
import { recordViewAction } from "@/actions/videos";
import { mediaUrl } from "@/lib/format";

/** Envia o tempo assistido a cada 15 s de reprodução (e ao pausar, terminar ou sair da página). */
const FLUSH_EVERY = 15;

function sendWatch(payload: { id: string; seconds: number; position: number; first: boolean }) {
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  if (!navigator.sendBeacon?.("/api/watch", blob)) {
    fetch("/api/watch", { method: "POST", body: blob, keepalive: true }).catch(() => {});
  }
}

/** Mede só o tempo realmente reproduzido (pular com a barra não conta). */
function useWatchTime(id: string) {
  const ref = useRef<HTMLVideoElement>(null);
  const state = useRef({ last: 0, unsent: 0, first: true });

  function flush() {
    const s = state.current;
    const seconds = Math.round(s.unsent);
    if (seconds < 1) return;
    sendWatch({ id, seconds, position: ref.current?.currentTime ?? 0, first: s.first });
    s.unsent -= seconds;
    s.first = false;
  }

  function onTimeUpdate() {
    const v = ref.current;
    if (!v) return;
    const s = state.current;
    const delta = v.currentTime - s.last;
    s.last = v.currentTime;
    if (delta > 0 && delta < 2 && !v.paused) s.unsent += delta; // saltos maiores são avanço manual
    if (s.unsent >= FLUSH_EVERY) flush();
  }

  function onSeeked() {
    state.current.last = ref.current?.currentTime ?? 0;
  }

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush(); // saiu da página do vídeo
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { ref, onTimeUpdate, onSeeked, onPause: flush, onEnded: flush };
}

export function VideoPlayer({ id, videoKey, thumbKey }: { id: string; videoKey: string | null; thumbKey: string | null }) {
  const counted = useRef(false);
  const src = mediaUrl(videoKey);
  const poster = mediaUrl(thumbKey) ?? undefined;
  const watch = useWatchTime(id);

  function countView() {
    if (counted.current) return;
    counted.current = true;
    const k = `viewed:${id}`;
    try {
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch {
      /* navegação privada */
    }
    recordViewAction(id);
  }

  // Vídeos sem arquivo (dados de demonstração) também contam a visita.
  useEffect(() => {
    if (!src) {
      const t = setTimeout(countView, 2000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div className="relative -mx-4 overflow-hidden bg-black sm:mx-0 sm:rounded-2xl">
      {src ? (
        <video
          key={src}
          ref={watch.ref}
          onTimeUpdate={watch.onTimeUpdate}
          onSeeked={watch.onSeeked}
          onPause={watch.onPause}
          onEnded={watch.onEnded}
          src={src}
          poster={poster}
          controls
          autoPlay
          playsInline
          preload="metadata"
          onPlay={countView}
          className="aspect-video max-h-[75vh] w-full bg-black"
        />
      ) : (
        <div className="relative flex aspect-video w-full items-center justify-center">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="absolute inset-0 size-full object-cover opacity-50" />
          )}
          <div className="relative rounded-2xl bg-ink/80 px-6 py-4 text-center text-cream">
            <p className="font-medium">Vídeo de demonstração</p>
            <p className="mt-1 text-sm opacity-80">Este conteúdo de exemplo não tem arquivo de vídeo. Publique um vídeo real pelo Estúdio.</p>
          </div>
        </div>
      )}
    </div>
  );
}
