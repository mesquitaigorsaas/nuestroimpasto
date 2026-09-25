"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { moderateCommentAction, moderateVideoAction, resolveReportAction, setUserStatusAction } from "@/actions/admin";

type Props = { report: { id: string; target_type: "video" | "comment" | "user"; target_id: string; target_status: string | null } };

export function ReportActions({ report }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, resolution: string, outcome: "resolved" | "dismissed" = "resolved") {
    start(async () => {
      const r = await fn();
      if (!r.ok) return alert(r.error);
      await resolveReportAction(report.id, outcome, resolution);
      router.refresh();
    });
  }

  const ask = (msg: string) => prompt(msg)?.trim();

  return (
    <div className="flex shrink-0 flex-wrap gap-2 lg:w-72 lg:justify-end">
      {report.target_type === "video" && (
        <button
          className="btn btn-danger h-8"
          disabled={pending}
          onClick={() => {
            const note = ask("Motivo (será enviado ao autor):");
            if (note) act(() => moderateVideoAction(report.target_id, "hide", note), `Vídeo ocultado: ${note}`);
          }}
        >
          Ocultar vídeo
        </button>
      )}
      {report.target_type === "comment" && (
        <button
          className="btn btn-danger h-8"
          disabled={pending}
          onClick={() => {
            const note = ask("Motivo (interno):") ?? "";
            act(() => moderateCommentAction(report.target_id, "hide", note), `Comentário ocultado. ${note}`);
          }}
        >
          Ocultar comentário
        </button>
      )}
      {report.target_type === "user" && (
        <button
          className="btn btn-danger h-8"
          disabled={pending}
          onClick={() => {
            const note = ask("Motivo da suspensão (será enviado ao usuário):");
            if (note) act(() => setUserStatusAction(report.target_id, "suspended", note), `Usuário suspenso: ${note}`);
          }}
        >
          Suspender usuário
        </button>
      )}
      <button
        className="btn btn-soft h-8"
        disabled={pending}
        onClick={() => {
          const note = ask("Por que descartar? (interno)") ?? "Sem violação.";
          act(async () => ({ ok: true }), note, "dismissed");
        }}
      >
        Descartar
      </button>
    </div>
  );
}
