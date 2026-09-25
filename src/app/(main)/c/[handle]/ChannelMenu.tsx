"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { ReportDialog } from "@/components/social/ReportDialog";

export function ChannelMenu({ channelId, loggedIn }: { channelId: string; loggedIn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(false);
  return (
    <div className="relative">
      <button className="btn btn-soft w-9 px-0" onClick={() => setOpen(!open)} aria-label="Mais opções">
        <Icon name="more" size={20} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-2 w-52 rounded-xl border border-line bg-white py-1.5 shadow-xl">
            <button
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-cream-2"
              onClick={async () => {
                setOpen(false);
                await navigator.clipboard.writeText(window.location.href);
                alert("Link do canal copiado.");
              }}
            >
              <Icon name="link" size={18} /> Copiar link do canal
            </button>
            <button
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-cream-2"
              onClick={() => {
                setOpen(false);
                if (!loggedIn) return router.push("/login");
                setReport(true);
              }}
            >
              <Icon name="flag" size={18} /> Denunciar usuário
            </button>
          </div>
        </>
      )}
      <ReportDialog open={report} onClose={() => setReport(false)} targetType="user" targetId={channelId} />
    </div>
  );
}
