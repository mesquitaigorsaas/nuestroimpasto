"use client";

import { useState, useTransition } from "react";
import { setAutoApproveAction } from "@/actions/admin";

export function AutoApproveToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [pending, start] = useTransition();
  return (
    <div className="card flex items-start gap-3 p-4 text-sm">
      <button
        role="switch"
        aria-checked={on}
        disabled={pending}
        onClick={() => {
          const next = !on;
          if (next && !confirm("Ativar a aprovação automática para casos de alta confiança sem sinais de risco?")) return;
          setOn(next);
          start(async () => {
            const r = await setAutoApproveAction(next);
            if (!r.ok) setOn(!next);
          });
        }}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-basil" : "bg-cream-3"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
      <div>
        <p className="font-semibold">Aprovação automática {on ? "ativada" : "desativada"}</p>
        <p className="mt-0.5 text-xs text-muted">
          {on
            ? "Solicitações de alta confiança e sem sinais de risco são aprovadas na hora. As demais seguem para a fila."
            : "Todas as solicitações passam por uma pessoa da equipe. Casos de alta confiança aparecem como revisão rápida."}
        </p>
      </div>
    </div>
  );
}
