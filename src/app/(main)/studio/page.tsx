import Link from "next/link";
import { canPublish, requireUser } from "@/lib/auth";
import { categoryName } from "@/lib/constants";
import { compactNumber, formatDate, followersLabel } from "@/lib/format";
import { studioStats, studioVideos } from "@/lib/queries";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, PageContainer, PageTitle, StatusPill } from "@/components/ui";
import { Thumbnail } from "@/components/video/VideoCard";
import { DeleteVideoButton } from "./DeleteVideoButton";

export const metadata = { title: "Estúdio do criador" };

export default async function StudioPage() {
  const user = await requireUser("/studio");
  const stats = await studioStats(user.id);
  const videos = await studioVideos(user.id);
  const publisher = canPublish(user);

  const cards: { label: string; value: string; icon: IconName; color: string }[] = [
    { label: "Seguidores", value: followersLabel(user.followers_count).split(" ")[0], icon: "following", color: "text-basil bg-basil/10" },
    { label: "Visualizações", value: compactNumber(stats.views), icon: "eye", color: "text-ink bg-cream-2" },
    { label: "Curtidas", value: compactNumber(stats.likes), icon: "like", color: "text-tomato bg-tomato/10" },
    { label: "Comentários", value: compactNumber(stats.comments), icon: "message", color: "text-ink bg-cream-2" },
    { label: "Respostas em vídeo", value: compactNumber(stats.responses), icon: "videoReply", color: "text-basil bg-basil/10" },
  ];

  return (
    <PageContainer className="max-w-6xl">
      <PageTitle
        icon="film"
        title="Estúdio do criador"
        subtitle="Métricas do seu canal e gerenciamento dos seus vídeos."
        actions={
          <div className="flex gap-2">
            <Link href="/studio/settings" className="btn btn-soft">
              <Icon name="settings" size={18} /> Canal
            </Link>
            {publisher && (
              <Link href="/studio/upload" className="btn btn-red">
                <Icon name="upload" size={18} /> Publicar
              </Link>
            )}
          </div>
        }
      />

      {!publisher && (
        <Link href="/verification" className="mb-6 flex items-center gap-3 rounded-2xl border border-basil/30 bg-basil/5 p-4 text-sm">
          <Icon name="shield" className="text-basil" />
          <span className="flex-1">
            Para publicar vídeos, <b>solicite a verificação</b> como estudante ou profissional.
          </span>
          <Icon name="chevronRight" size={18} />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <span className={`flex size-9 items-center justify-center rounded-full ${c.color}`}>
              <Icon name={c.icon} size={18} />
            </span>
            <p className="mt-3 text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted">{c.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">Métricas do seu próprio canal. A plataforma não cria rankings entre profissionais.</p>

      <h2 className="title-tricolore mt-8 mb-4 text-lg font-bold">Seus vídeos · {videos.length}</h2>
      {videos.length === 0 ? (
        <EmptyState
          title="Nenhum vídeo ainda"
          text={publisher ? "Seu primeiro vídeo pode ser simples: mostre o que você fez hoje." : undefined}
          action={publisher ? <Link href="/studio/upload" className="btn btn-green">Publicar vídeo</Link> : undefined}
        />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {videos.map((v) => (
            <div key={v.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4">
              <Link href={`/watch/${v.id}`} className="w-full shrink-0 sm:w-40">
                <Thumbnail video={v} className="rounded-lg" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/watch/${v.id}`} className="line-clamp-2 font-semibold hover:underline">
                  {v.title}
                </Link>
                <p className="mt-1 line-clamp-1 text-xs text-muted">{v.description || "Sem descrição"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {v.status === "hidden" ? (
                    <StatusPill tone="red">Ocultado pela moderação</StatusPill>
                  ) : v.visibility === "unlisted" ? (
                    <StatusPill tone="gray">Não listado</StatusPill>
                  ) : (
                    <StatusPill tone="green">Público</StatusPill>
                  )}
                  {v.parent_id && <StatusPill tone="gold">Resposta em vídeo</StatusPill>}
                  <span className="text-muted">{categoryName(v.category)}</span>
                  <span className="text-muted">· {formatDate(v.created_at)}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-sm text-ink-2 sm:w-64 sm:justify-end">
                <span title="Visualizações" className="flex items-center gap-1"><Icon name="eye" size={16} /> {compactNumber(v.views)}</span>
                <span title="Curtidas" className="flex items-center gap-1"><Icon name="like" size={16} /> {compactNumber(v.likes)}</span>
                <span title="Comentários" className="flex items-center gap-1"><Icon name="message" size={16} /> {compactNumber(v.comments_count)}</span>
                <Link href={`/studio/videos/${v.id}`} className="icon-btn size-9" aria-label="Editar">
                  <Icon name="edit" size={18} />
                </Link>
                <DeleteVideoButton videoId={v.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
