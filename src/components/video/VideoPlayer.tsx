"use client";

import { useEffect, useRef } from "react";
import { recordViewAction } from "@/actions/videos";
import { mediaUrl } from "@/lib/format";

export function VideoPlayer({ id, videoKey, thumbKey }: { id: string; videoKey: string | null; thumbKey: string | null }) {
  const counted = useRef(false);
  const src = mediaUrl(videoKey);
  const poster = mediaUrl(thumbKey) ?? undefined;

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
