"use client";

import { useState, useTransition } from "react";
import { reportAction } from "@/actions/comments";
import { REPORT_REASONS } from "@/lib/constants";
import { Modal } from "../Modal";

type Props = { open: boolean; onClose: () => void; targetType: "video" | "comment" | "user"; targetId: string };

const TITLES = { video: "Denunciar vídeo", comment: "Denunciar comentário", user: "Denunciar usuário" };

export function ReportDialog({ open, onClose, targetType, targetId }: Props) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function close() {
    onClose();
    setTimeout(() => {
      setDone(false);
      setReason("");
      setDetails("");
      setError("");
    }, 200);
  }

  return (
    <Modal open={open} onClose={close} title={TITLES[targetType]}>
      {done ? (
        <div className="py-4 text-center">
          <p className="font-medium">Obrigado. Recebemos sua denúncia.</p>
          <p className="mt-1 text-sm text-muted">A equipe de moderação vai analisar. Denúncias são anônimas para o autor do conteúdo.</p>
          <button className="btn btn-primary mt-5" onClick={close}>
            Fechar
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason) return setError("Escolha um motivo.");
            start(async () => {
              const res = await reportAction(targetType, targetId, reason, details);
              if (res.ok) setDone(true);
              else setError(res.error ?? "Não foi possível enviar.");
            });
          }}
        >
          <p className="mb-3 text-sm text-muted">O que está acontecendo?</p>
          <div className="flex flex-col gap-1">
            {Object.entries(REPORT_REASONS).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-cream">
                <input type="radio" name="reason" value={key} checked={reason === key} onChange={() => setReason(key)} className="accent-ink" />
                {label}
              </label>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Detalhes (opcional)"
            className="input mt-3 min-h-20"
            maxLength={1000}
          />
          {error && <p className="mt-2 text-sm text-tomato">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={pending}>
              {pending ? "Enviando…" : "Denunciar"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
