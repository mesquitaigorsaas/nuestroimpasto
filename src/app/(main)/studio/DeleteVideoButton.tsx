"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteVideoAction } from "@/actions/videos";
import { Icon } from "@/components/icons";

export function DeleteVideoButton({ videoId, redirectTo, label }: { videoId: string; redirectTo?: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={label ? "btn btn-outline border-tomato/40 text-tomato hover:bg-tomato/5" : "icon-btn size-9 text-tomato"}
      aria-label="Excluir vídeo"
      onClick={() => {
        if (!confirm("Excluir este vídeo definitivamente? Comentários e curtidas também serão removidos.")) return;
        start(async () => {
          const r = await deleteVideoAction(videoId);
          if (r.error) return alert(r.error);
          if (redirectTo) router.push(redirectTo);
          else router.refresh();
        });
      }}
    >
      <Icon name="trash" size={18} />
      {label}
    </button>
  );
}
