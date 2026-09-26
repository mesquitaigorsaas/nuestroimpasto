"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";

/**
 * Barra discreta "Voltar · Início" no topo das páginas (desktop e mobile).
 * "Voltar" volta pelo histórico quando a pessoa já navegou dentro do site;
 * se ela chegou por um link externo, leva para a página inicial.
 */
export function BackBar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const first = useRef(pathname);
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    if (pathname !== first.current) setNavigated(true);
  }, [pathname]);

  if (pathname === "/") return null;

  function goBack() {
    if (navigated || (document.referrer && new URL(document.referrer).origin === location.origin)) router.back();
    else router.push("/");
  }

  return (
    <nav aria-label="Navegação" className={`flex items-center gap-1 text-sm text-muted ${className}`}>
      <button type="button" onClick={goBack} className="-ml-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-1 hover:bg-ink/5 hover:text-ink">
        <Icon name="chevronLeft" size={18} /> Voltar
      </button>
      <span aria-hidden="true">·</span>
      <Link href="/" className="inline-flex items-center gap-1 rounded-full px-1.5 py-1 hover:bg-ink/5 hover:text-ink">
        <Icon name="home" size={15} /> Início
      </Link>
    </nav>
  );
}
