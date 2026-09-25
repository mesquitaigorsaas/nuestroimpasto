import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { TechInfo } from "@/lib/constants";
import { parseJson } from "@/lib/format";
import { getVideo } from "@/lib/queries";
import { Icon } from "@/components/icons";
import { PageContainer, PageTitle } from "@/components/ui";
import { EditVideoForm } from "./EditVideoForm";

export const metadata = { title: "Editar vídeo" };

export default async function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/studio/videos/${id}`);
  const video = await getVideo(id);
  if (!video || video.status === "removed" || (video.user_id !== user.id && user.role !== "admin")) notFound();

  return (
    <PageContainer className="max-w-5xl">
      <Link href="/studio" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <Icon name="arrowLeft" size={16} /> Estúdio
      </Link>
      <PageTitle icon="edit" title="Detalhes do vídeo" />
      <EditVideoForm
        video={{
          id: video.id,
          title: video.title,
          description: video.description,
          category: video.category,
          tags: video.tags,
          visibility: video.visibility,
          thumb_key: video.thumb_key,
          duration: video.duration,
          tech: parseJson<TechInfo>(video.tech, {}),
        }}
      />
    </PageContainer>
  );
}
