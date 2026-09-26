"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { markNotificationsReadAction } from "@/actions/social";

/** Abriu a página = viu as notificações: marca como lidas e zera o contador do sino. */
export function MarkRead() {
  useEffect(() => {
    void markNotificationsReadAction();
  }, []);
  return null;
}

/**
 * Linha da notificação. Guarda o estado "nova" da primeira renderização, para o
 * destaque continuar durante esta visita depois que o servidor marca como lida.
 */
export function NotificationLink({ href, unread, children }: { href: string; unread: boolean; children: React.ReactNode }) {
  const [fresh] = useState(unread);
  return (
    <Link href={href} className={`flex items-start gap-3 p-4 hover:bg-cream ${fresh ? "bg-basil/5" : ""}`}>
      <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: fresh ? "#D91328" : "transparent" }} />
      {children}
    </Link>
  );
}
