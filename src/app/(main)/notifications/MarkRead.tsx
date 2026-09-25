"use client";

import { useTransition } from "react";
import { markNotificationsReadAction } from "@/actions/social";
import { Icon } from "@/components/icons";

export function MarkRead() {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-soft" disabled={pending} onClick={() => start(() => markNotificationsReadAction())}>
      <Icon name="check" size={18} /> Marcar todas como lidas
    </button>
  );
}
