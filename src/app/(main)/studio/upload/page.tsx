import Link from "next/link";
import { canPublish, requireUser } from "@/lib/auth";
import { getVideo } from "@/lib/queries";
import { Icon } from "@/components/icons";
import { PageContainer, PageTitle } from "@/components/ui";
import { UploadFlow } from "@/components/studio/UploadFlow";

export const metadata = { title: "Publicar vídeo" };

export default async function UploadPage({ searchParams }: { searchParams: Promise<{ reply?: string }> }) {
  const user = await requireUser("/studio/upload");
  const { reply } = await searchParams;
  const parentVideo = reply ? await getVideo(reply) : undefined;
  const parent = parentVideo && parentVideo.status === "published" ? { id: parentVideo.id, title: parentVideo.title, channel_name: parentVideo.channel_name } : null;

  if (!canPublish(user)) {
    return (
      <PageContainer className="max-w-2xl">
        <div className="card mt-6 p-8 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-basil/10 text-basil">
            <Icon name="shield" size={30} />
          </span>
          <h1 className="mt-4 text-2xl font-bold">Publicar é para membros verificados</h1>
          <p className="mt-2 text-ink-2">
            Qualquer pessoa pode assistir e conversar. Para criar um canal e publicar, é preciso ser <b>estudante</b> ou <b>profissional</b> verificado.
          </p>
          {user.verification_status === "pending" ? (
            <p className="mt-5 rounded-xl bg-gold-soft px-4 py-3 text-sm text-gold-dark">Sua solicitação já está em análise. Avisaremos nas notificações.</p>
          ) : (
            <Link href="/verification" className="btn btn-green mt-6 h-11 px-6">
              Solicitar verificação
            </Link>
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-6xl">
      <PageTitle icon="upload" title={parent ? "Responder com vídeo" : "Publicar vídeo"} />
      <UploadFlow parent={parent} />
    </PageContainer>
  );
}
