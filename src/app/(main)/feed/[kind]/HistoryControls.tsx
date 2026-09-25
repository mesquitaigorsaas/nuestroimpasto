"use client";

import { useTransition } from "react";
import { clearHistoryAction, removeFromHistoryAction } from "@/actions/social";
import { Icon } from "@/components/icons";

export function HistoryControls() {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-soft"
      disabled={pending}
      onClick={() => confirm("Limpar todo o histórico de exibição?") && start(() => clearHistoryAction())}
    >
      <Icon name="trash" size={18} /> Limpar histórico
    </button>
  );
}

export function RemoveFromHistory({ videoId }: { videoId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="icon-btn absolute top-0 right-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      disabled={pending}
      aria-label="Remover do histórico"
      title="Remover do histórico"
      onClick={() => start(() => removeFromHistoryAction(videoId))}
    >
      <Icon name="close" size={20} />
    </button>
  );
}
