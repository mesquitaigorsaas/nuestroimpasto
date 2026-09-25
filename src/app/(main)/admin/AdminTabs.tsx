"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminTabs({ pendingVerifications, openReports }: { pendingVerifications: number; openReports: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin", label: "Visão geral" },
    { href: "/admin/verifications", label: "Verificações", badge: pendingVerifications },
    { href: "/admin/reports", label: "Denúncias", badge: openReports },
    { href: "/admin/users", label: "Usuários" },
    { href: "/admin/videos", label: "Vídeos" },
    { href: "/admin/log", label: "Histórico de ações" },
  ];
  return (
    <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium ${active ? "text-ink" : "text-muted hover:text-ink"}`}>
            {t.label}
            {!!t.badge && <span className="rounded-full bg-tomato px-1.5 text-[11px] font-semibold text-white">{t.badge}</span>}
            {active && <span className="tricolore absolute right-2 bottom-0 left-2 h-[3px] rounded-full" />}
          </Link>
        );
      })}
    </nav>
  );
}
