"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Uma miniatura conta como vista quando fica ao menos metade na tela por 1 segundo. */
const VISIBLE_MS = 1000;

function send(payload: object) {
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  if (!navigator.sendBeacon?.("/api/impressions", blob)) {
    fetch("/api/impressions", { method: "POST", body: blob, keepalive: true }).catch(() => {});
  }
}

/**
 * Observa os cards marcados com data-impression e registra impressões e cliques.
 * Cada vídeo conta no máximo uma impressão por página visitada.
 */
export function ImpressionTracker() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const counted = new Set<string>();
    const pending = new Set<string>();
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();

    const flush = () => {
      if (!pending.size) return;
      send({ shown: [...pending] });
      pending.clear();
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.impression;
          if (!id || counted.has(id)) continue;
          if (e.isIntersecting) {
            timers.set(
              e.target,
              setTimeout(() => {
                counted.add(id);
                pending.add(id);
                io.unobserve(e.target);
              }, VISIBLE_MS),
            );
          } else {
            clearTimeout(timers.get(e.target));
            timers.delete(e.target);
          }
        }
      },
      { threshold: 0.5 },
    );

    const observeAll = () => document.querySelectorAll("[data-impression]").forEach((el) => io.observe(el));
    observeAll();
    const mo = new MutationObserver(observeAll); // cards carregados depois (ex.: rolagem, abas)
    mo.observe(document.body, { childList: true, subtree: true });

    const onClick = (ev: MouseEvent) => {
      const card = (ev.target as Element).closest?.("[data-impression]") as HTMLElement | null;
      const link = (ev.target as Element).closest?.("a[href^='/watch/']");
      if (card?.dataset.impression && link) send({ click: card.dataset.impression });
    };
    document.addEventListener("click", onClick, true);

    const interval = setInterval(flush, 5000);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);

    return () => {
      flush();
      clearInterval(interval);
      timers.forEach(clearTimeout);
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [pathname, search]);

  return null;
}
