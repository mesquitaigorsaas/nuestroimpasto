"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { revokeVerificationAction, setUserRoleAction, setUserStatusAction } from "@/actions/admin";
import { Icon } from "@/components/icons";

type Props = { user: { id: string; status: string; role: string; verified: boolean } };

export function UserActions({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setOpen(false);
    start(async () => {
      const r = await fn();
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  }
  const ask = (m: string) => prompt(m)?.trim();

  return (
    <div className="relative inline-block text-left">
      <button className="icon-btn size-8" disabled={pending} onClick={() => setOpen(!open)} aria-label="Ações">
        <Icon name="more" size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-line bg-white py-1.5 text-sm shadow-xl">
            {user.status !== "active" && (
              <button className="block w-full px-4 py-2 text-left hover:bg-cream-2" onClick={() => run(() => setUserStatusAction(user.id, "active", ""))}>
                Reativar conta
              </button>
            )}
            {user.status === "active" && (
              <button
                className="block w-full px-4 py-2 text-left hover:bg-cream-2"
                onClick={() => {
                  const n = ask("Motivo da suspensão (enviado ao usuário):");
                  if (n) run(() => setUserStatusAction(user.id, "suspended", n));
                }}
              >
                Suspender
              </button>
            )}
            {user.status !== "banned" && (
              <button
                className="block w-full px-4 py-2 text-left text-tomato hover:bg-cream-2"
                onClick={() => {
                  const n = ask("Motivo do banimento (interno). A pessoa perde o acesso:");
                  if (n) run(() => setUserStatusAction(user.id, "banned", n));
                }}
              >
                Banir
              </button>
            )}
            {user.verified && (
              <button
                className="block w-full px-4 py-2 text-left hover:bg-cream-2"
                onClick={() => {
                  const n = ask("Motivo para exigir nova verificação:");
                  if (n) run(() => revokeVerificationAction(user.id, n));
                }}
              >
                Exigir nova verificação
              </button>
            )}
            <button
              className="block w-full px-4 py-2 text-left hover:bg-cream-2"
              onClick={() => confirm(user.role === "admin" ? "Remover acesso de administrador?" : "Tornar administrador?") && run(() => setUserRoleAction(user.id, user.role === "admin" ? "user" : "admin"))}
            >
              {user.role === "admin" ? "Remover admin" : "Tornar admin"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
