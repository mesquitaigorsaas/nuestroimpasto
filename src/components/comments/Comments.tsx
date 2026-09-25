"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { addCommentAction, deleteCommentAction, loadRepliesAction } from "@/actions/comments";
import { toggleCommentLikeAction } from "@/actions/social";
import { compactNumber, linkify, timeAgo } from "@/lib/format";
import type { CommentData } from "@/lib/types";
import { Avatar } from "../Avatar";
import { Icon, VerifiedBadge } from "../icons";
import { ReportDialog } from "../social/ReportDialog";

type Viewer = { id: string; name: string; avatar_key: string | null; role: string } | null;

type Props = {
  videoId: string;
  videoOwnerId: string;
  total: number;
  initial: CommentData[];
  viewer: Viewer;
  sort: "top" | "new";
};

export function Comments({ videoId, videoOwnerId, total, initial, viewer, sort }: Props) {
  const router = useRouter();
  const [comments, setComments] = useState(initial);
  const [count, setCount] = useState(total);

  return (
    <section className="mt-6" id="comentarios">
      <div className="mb-5 flex items-center gap-6">
        <h2 className="text-xl font-bold">
          {compactNumber(count)} {count === 1 ? "comentário" : "comentários"}
        </h2>
        <div className="flex gap-1 text-sm">
          {(["top", "new"] as const).map((s) => (
            <button
              key={s}
              onClick={() => router.replace(`/watch/${videoId}${s === "new" ? "?c=new" : ""}#comentarios`, { scroll: false })}
              className={`chip h-7 ${sort === s ? "chip-on" : "chip-off"}`}
            >
              {s === "top" ? "Principais" : "Mais recentes"}
            </button>
          ))}
        </div>
      </div>

      <Composer
        videoId={videoId}
        viewer={viewer}
        parentId={null}
        placeholder="Adicione um comentário, conte sua experiência ou tire uma dúvida…"
        onPosted={(c) => {
          setComments((list) => [c, ...list]);
          setCount((n) => n + 1);
        }}
      />

      <div className="mt-6 flex flex-col gap-6">
        {comments.map((c) => (
          <Thread
            key={c.id}
            comment={c}
            videoId={videoId}
            videoOwnerId={videoOwnerId}
            viewer={viewer}
            onReply={() => setCount((n) => n + 1)}
            onDeleted={(removed) => {
              setComments((list) => list.filter((x) => x.id !== c.id));
              setCount((n) => Math.max(0, n - removed));
            }}
          />
        ))}
        {comments.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">Ninguém comentou ainda. Comece a conversa.</p>
        )}
      </div>
    </section>
  );
}

function Composer({
  videoId,
  viewer,
  parentId,
  placeholder,
  onPosted,
  onCancel,
  autoFocus,
  initialText = "",
}: {
  videoId: string;
  viewer: Viewer;
  parentId: string | null;
  placeholder: string;
  onPosted: (c: CommentData) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  initialText?: string;
}) {
  const [text, setText] = useState(initialText);
  const [focused, setFocused] = useState(!!autoFocus);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  if (!viewer) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-cream-2 p-3 text-sm">
        <Icon name="message" size={20} className="text-muted" />
        <span className="flex-1">Entre para participar da conversa.</span>
        <Link href={`/login?next=/watch/${videoId}`} className="btn btn-primary h-8">
          Entrar
        </Link>
      </div>
    );
  }

  function submit() {
    if (!text.trim()) return;
    setError("");
    start(async () => {
      const r = await addCommentAction(videoId, text, parentId);
      if (!r.ok) return setError(r.error);
      onPosted(r.data);
      setText("");
      setFocused(false);
      onCancel?.();
    });
  }

  return (
    <div className="flex gap-3">
      <Avatar name={viewer.name} src={viewer.avatar_key} size={parentId ? 28 : 40} />
      <div className="flex-1">
        <textarea
          ref={ref}
          value={text}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
          rows={1}
          maxLength={2000}
          placeholder={placeholder}
          className="w-full resize-none border-b border-line bg-transparent pb-1.5 text-sm outline-none focus:border-ink"
        />
        {error && <p className="text-xs text-tomato">{error}</p>}
        {focused && (
          <div className="mt-2 flex justify-end gap-2">
            <button
              className="btn btn-ghost h-8"
              onClick={() => {
                setText("");
                setFocused(false);
                onCancel?.();
              }}
            >
              Cancelar
            </button>
            <button className="btn btn-primary h-8" disabled={!text.trim() || pending} onClick={submit}>
              {pending ? "Enviando…" : parentId ? "Responder" : "Comentar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Thread({
  comment,
  videoId,
  videoOwnerId,
  viewer,
  onReply,
  onDeleted,
}: {
  comment: CommentData;
  videoId: string;
  videoOwnerId: string;
  viewer: Viewer;
  onReply: () => void;
  onDeleted: (removed: number) => void;
}) {
  const [replies, setReplies] = useState<CommentData[] | null>(null);
  const [open, setOpen] = useState(false);
  const [replyCount, setReplyCount] = useState(comment.replies_count);
  const [replyTo, setReplyTo] = useState<{ handle: string } | null>(null);
  const [loading, start] = useTransition();

  function toggleReplies() {
    if (!open && replies === null) {
      start(async () => {
        setReplies(await loadRepliesAction(comment.id));
        setOpen(true);
      });
    } else setOpen(!open);
  }

  function added(c: CommentData) {
    setReplies((r) => [...(r ?? []), c]);
    setReplyCount((n) => n + 1);
    setOpen(true);
    onReply();
  }

  return (
    <div>
      <CommentItem
        comment={comment}
        videoOwnerId={videoOwnerId}
        viewer={viewer}
        onReplyClick={() => setReplyTo({ handle: comment.author_handle })}
        onDeleted={() => onDeleted(1 + replyCount)}
      />
      <div className="ml-[52px]">
        {replyTo && (
          <div className="mt-3">
            <Composer
              videoId={videoId}
              viewer={viewer}
              parentId={comment.id}
              placeholder="Adicione uma resposta…"
              autoFocus
              initialText={replyTo.handle !== comment.author_handle || viewer?.id !== comment.user_id ? `@${replyTo.handle} ` : ""}
              onPosted={added}
              onCancel={() => setReplyTo(null)}
            />
          </div>
        )}
        {replyCount > 0 && (
          <button onClick={toggleReplies} className="mt-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-basil hover:bg-basil/10">
            <Icon name="chevronDown" size={18} className={open ? "rotate-180" : ""} />
            {loading ? "Carregando…" : `${replyCount} ${replyCount === 1 ? "resposta" : "respostas"}`}
          </button>
        )}
        {open && replies && (
          <div className="mt-3 flex flex-col gap-4">
            {replies.map((r) => (
              <CommentItem
                key={r.id}
                comment={r}
                small
                videoOwnerId={videoOwnerId}
                viewer={viewer}
                onReplyClick={() => setReplyTo({ handle: r.author_handle })}
                onDeleted={() => {
                  setReplies((list) => (list ?? []).filter((x) => x.id !== r.id));
                  setReplyCount((n) => Math.max(0, n - 1));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  small,
  videoOwnerId,
  viewer,
  onReplyClick,
  onDeleted,
}: {
  comment: CommentData;
  small?: boolean;
  videoOwnerId: string;
  viewer: Viewer;
  onReplyClick: () => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(!!comment.liked_by_me);
  const [likes, setLikes] = useState(comment.likes);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [, start] = useTransition();
  const isAuthor = comment.user_id === videoOwnerId;
  const canDelete = viewer && (viewer.id === comment.user_id || viewer.id === videoOwnerId || viewer.role === "admin");

  function like() {
    if (!viewer) return router.push("/login");
    setLiked(!liked);
    setLikes((n) => n + (liked ? -1 : 1));
    start(async () => {
      const r = await toggleCommentLikeAction(comment.id);
      if (r.ok && r.count !== undefined) {
        setLiked(r.active);
        setLikes(r.count);
      }
    });
  }

  return (
    <div className="group flex gap-3">
      <Link href={`/@${comment.author_handle}`} className="shrink-0">
        <Avatar name={comment.author_name} src={comment.author_avatar} size={small ? 28 : 40} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
          <Link
            href={`/@${comment.author_handle}`}
            className={`flex items-center gap-1 font-semibold ${isAuthor ? "rounded-full bg-basil px-2 py-0.5 text-white" : ""}`}
          >
            @{comment.author_handle}
            <VerifiedBadge type={comment.author_member_type} size={12} />
          </Link>
          <span className="text-muted">{timeAgo(comment.created_at)}</span>
          {isAuthor && <span className="text-xs font-medium text-gold-dark">Autor</span>}
        </div>
        <p className="mt-1 text-sm break-words whitespace-pre-line">
          {linkify(comment.body).map((p, i) =>
            p.type === "link" ? (
              <a key={i} href={p.value} target="_blank" rel="noopener noreferrer nofollow" className="text-gold-dark hover:underline">
                {p.value}
              </a>
            ) : (
              <Mentions key={i} text={p.value} />
            ),
          )}
        </p>
        <div className="mt-1 -ml-2 flex items-center gap-1">
          <button onClick={like} className="flex h-8 items-center gap-1.5 rounded-full px-2 text-xs hover:bg-cream-2" aria-pressed={liked} aria-label="Curtir comentário">
            <Icon name="like" size={16} filled={liked} strokeWidth={liked ? 1.2 : 1.8} />
            {likes > 0 && compactNumber(likes)}
          </button>
          <button onClick={() => (viewer ? onReplyClick() : router.push("/login"))} className="h-8 rounded-full px-3 text-xs font-semibold hover:bg-cream-2">
            Responder
          </button>
          <div className="relative opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
            <button onClick={() => setMenu(!menu)} className="icon-btn size-8" aria-label="Mais opções">
              <Icon name="more" size={16} />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute left-0 z-20 mt-1 w-44 rounded-xl border border-line bg-white py-1.5 shadow-xl">
                  {viewer && viewer.id !== comment.user_id && (
                    <button
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-cream-2"
                      onClick={() => {
                        setMenu(false);
                        setReport(true);
                      }}
                    >
                      <Icon name="flag" size={16} /> Denunciar
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-tomato hover:bg-cream-2"
                      onClick={() => {
                        setMenu(false);
                        if (!confirm("Excluir este comentário?")) return;
                        start(async () => {
                          const r = await deleteCommentAction(comment.id);
                          if (r.ok) onDeleted();
                          else alert(r.error);
                        });
                      }}
                    >
                      <Icon name="trash" size={16} /> Excluir
                    </button>
                  )}
                  {!viewer && <p className="px-3.5 py-2 text-sm text-muted">Entre para interagir</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <ReportDialog open={report} onClose={() => setReport(false)} targetType="comment" targetId={comment.id} />
    </div>
  );
}

function Mentions({ text }: { text: string }) {
  const parts = text.split(/(@[a-z0-9._]{3,30})/gi);
  return (
    <>
      {parts.map((p, i) =>
        /^@[a-z0-9._]{3,30}$/i.test(p) ? (
          <Link key={i} href={`/${p}`} className="font-medium text-gold-dark hover:underline">
            {p}
          </Link>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
