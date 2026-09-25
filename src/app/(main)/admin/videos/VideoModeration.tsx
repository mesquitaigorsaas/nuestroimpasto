"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { moderateVideoAction } from "@/actions/admin";

export function VideoModeration({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return status === "published" ? (
    <button
      className="btn btn-outline h-8 border-tomato/40 text-tomato"
      disabled={pending}
      onClick={() => {
        const note = prompt("Motivo (enviado ao autor):")?.trim();
        if (note) start(async () => { await moderateVideoAction(id, "hide", note); router.refresh(); });
      }}
    >
      Ocultar
    </button>
  ) : (
    <button className="btn btn-soft h-8" disabled={pending} onClick={() => start(async () => { await moderateVideoAction(id, "restore", ""); router.refresh(); })}>
      Restaurar
    </button>
  );
}
