"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { claimVerificationAction, decideVerificationAction, reanalyzeVerificationAction } from "@/actions/admin";
import { Icon } from "@/components/icons";

type Decision = "approve" | "needs_info" | "reject" | "review_required";

const OPTIONS: { v: Decision; label: string; cls: string; hint: string }[] = [
  { v: "approve", label: "Aprovar", cls: "btn-green", hint: "Motivo registrado no histórico (ex.: vínculo confirmado pelo comprovante)." },
  { v: "needs_info", label: "Solicitar mais informações", cls: "btn-soft", hint: "Esta mensagem será mostrada ao candidato." },
  { v: "reject", label: "Rejeitar", cls: "btn-danger", hint: "Esta mensagem será mostrada ao candidato. Seja claro e respeitoso." },
  { v: "review_required", label: "Colocar em revisão", cls: "btn-outline", hint: "Nota interna (ex.: aguardar segunda opinião)." },
];

export function DecisionPanel({
  requestId,
  status,
  recommended,
  missing,
}: {
  requestId: string;
  status: string;
  recommended: string | null;
  missing: string[];
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const finalized = status === "approved" || status === "rejected";

  function choose(d: Decision) {
    setDecision(d);
    setError("");
    if (d === "needs_info" && !reason && missing.length) setReason(`Para concluir a verificação, precisamos de:\n• ${missing.join("\n• ")}`);
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    start(async () => {
      const r = await fn();
      if (!r.ok) return setError(r.error ?? "Falhou.");
      setDecision(null);
      setReason("");
      router.refresh();
    });
  }

  return (
    <section className="card p-5">
      <h3 className="mb-1 font-bold">Decisão</h3>
      {recommended && (
        <p className="mb-4 text-xs text-muted">
          A recomendação da IA é só um apoio. Você pode tomar outra decisão; o motivo fica registrado.
        </p>
      )}
      {finalized && <p className="mb-3 rounded-xl bg-cream p-3 text-sm">Esta solicitação já foi decidida. Você ainda pode reabrir colocando-a em revisão.</p>}

      {status === "pending_review" && (
        <button className="btn btn-outline mb-3 w-full" disabled={pending} onClick={() => run(() => claimVerificationAction(requestId))}>
          <Icon name="user" size={18} /> Assumir análise
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.filter((o) => !finalized || o.v === "review_required").map((o) => (
          <button key={o.v} className={`btn ${o.cls} h-auto min-h-9 py-2 whitespace-normal ${decision === o.v ? "ring-2 ring-ink ring-offset-2" : ""}`} onClick={() => choose(o.v)}>
            {o.label}
          </button>
        ))}
      </div>

      {decision && (
        <div className="mt-4">
          <label className="label" htmlFor="reason">
            Motivo *
          </label>
          <textarea id="reason" className="input min-h-28" value={reason} onChange={(e) => setReason(e.target.value)} />
          <p className="mt-1 text-xs text-muted">{OPTIONS.find((o) => o.v === decision)?.hint}</p>
          {error && <p className="mt-2 text-sm text-tomato">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button className="btn btn-ghost" onClick={() => setDecision(null)}>
              Cancelar
            </button>
            <button className="btn btn-primary flex-1" disabled={pending || !reason.trim()} onClick={() => run(() => decideVerificationAction(requestId, decision, reason))}>
              {pending ? "Salvando…" : "Confirmar decisão"}
            </button>
          </div>
        </div>
      )}

      <button className="btn btn-ghost mt-4 w-full text-sm" disabled={pending} onClick={() => run(() => reanalyzeVerificationAction(requestId))}>
        <Icon name="sparkles" size={16} /> {pending ? "Processando…" : "Refazer análise automática"}
      </button>
    </section>
  );
}
