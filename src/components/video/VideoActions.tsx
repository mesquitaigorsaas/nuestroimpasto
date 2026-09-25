"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleLikeAction, toggleSaveAction } from "@/actions/social";
import { compactNumber } from "@/lib/format";
import { Icon } from "../icons";
import { Modal } from "../Modal";
import { ReportDialog } from "../social/ReportDialog";

type Props = {
  videoId: string;
  title: string;
  likes: number;
  liked: boolean;
  saved: boolean;
  loggedIn: boolean;
  canRespond: boolean;
  isOwner: boolean;
};

export function VideoActions({ videoId, title, likes, liked: initialLiked, saved: initialSaved, loggedIn, canRespond, isOwner }: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(likes);
  const [saved, setSaved] = useState(initialSaved);
  const [share, setShare] = useState(false);
  const [report, setReport] = useState(false);
  const [menu, setMenu] = useState(false);
  const [, start] = useTransition();

  function requireLogin() {
    router.push(`/login?next=${encodeURIComponent(`/watch/${videoId}`)}`);
  }

  function like() {
    if (!loggedIn) return requireLogin();
    setLiked(!liked);
    setCount((c) => c + (liked ? -1 : 1));
    start(async () => {
      const r = await toggleLikeAction(videoId);
      if (r.ok) {
        setLiked(r.active);
        if (r.count !== undefined) setCount(r.count);
      } else {
        setLiked(initialLiked);
        setCount(likes);
        if (r.error) alert(r.error);
      }
    });
  }

  function save() {
    if (!loggedIn) return requireLogin();
    setSaved(!saved);
    start(async () => {
      const r = await toggleSaveAction(videoId);
      if (r.ok) setSaved(r.active);
    });
  }

  async function doShare() {
    const url = `${window.location.origin}/watch/${videoId}`;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelado */
      }
    }
    setShare(true);
  }

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <button onClick={like} className={`btn ${liked ? "btn-green" : "btn-soft"}`} aria-pressed={liked}>
        <Icon name="like" size={20} filled={liked} strokeWidth={liked ? 1.2 : 1.8} />
        {count > 0 ? compactNumber(count) : "Curtir"}
      </button>
      <button onClick={doShare} className="btn btn-soft">
        <Icon name="share" size={20} /> Compartilhar
      </button>
      {canRespond && (
        <Link href={`/studio/upload?reply=${videoId}`} className="btn btn-soft">
          <Icon name="videoReply" size={20} /> Responder com vídeo
        </Link>
      )}
      <button onClick={save} className={`btn ${saved ? "btn-green" : "btn-soft"}`} aria-pressed={saved}>
        <Icon name="bookmark" size={20} filled={saved} /> {saved ? "Salvo" : "Salvar"}
      </button>
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} className="btn btn-soft w-9 px-0" aria-label="Mais ações">
          <Icon name="more" size={20} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-line bg-white py-2 shadow-xl">
              {isOwner ? (
                <Link href={`/studio/videos/${videoId}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream-2">
                  <Icon name="edit" size={18} /> Editar vídeo
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setMenu(false);
                    if (!loggedIn) return requireLogin();
                    setReport(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-cream-2"
                >
                  <Icon name="flag" size={18} /> Denunciar
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <ShareModal open={share} onClose={() => setShare(false)} videoId={videoId} title={title} />
      <ReportDialog open={report} onClose={() => setReport(false)} targetType="video" targetId={videoId} />
    </div>
  );
}

function ShareModal({ open, onClose, videoId, title }: { open: boolean; onClose: () => void; videoId: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/watch/${videoId}` : "";
  const text = encodeURIComponent(`${title} — ${url}`);
  const targets = [
    { name: "WhatsApp", href: `https://wa.me/?text=${text}`, color: "#25D366" },
    { name: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, color: "#229ED9" },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, color: "#1877F2" },
    { name: "X", href: `https://x.com/intent/post?text=${text}`, color: "#111" },
    { name: "E-mail", href: `mailto:?subject=${encodeURIComponent(title)}&body=${text}`, color: "#6B7278" },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Compartilhar">
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {targets.map((t) => (
          <a key={t.name} href={t.href} target="_blank" rel="noopener noreferrer" className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-xs">
            <span className="flex size-14 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: t.color }}>
              {t.name[0]}
            </span>
            {t.name}
          </a>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-cream p-1.5 pl-3">
        <span className="min-w-0 flex-1 truncate text-sm">{url}</span>
        <button
          className="btn btn-primary"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </Modal>
  );
}
