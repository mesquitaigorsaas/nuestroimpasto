"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { updateVideoAction } from "@/actions/videos";
import { FormError, FormSuccess, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/icons";
import { VideoDetailsFields } from "@/components/studio/VideoDetailsFields";
import { Thumbnail } from "@/components/video/VideoCard";
import type { TechInfo } from "@/lib/constants";
import { resizeImage, uploadFile } from "@/lib/upload-client";
import { DeleteVideoButton } from "../../DeleteVideoButton";

type Props = {
  video: { id: string; title: string; description: string; category: string; tags: string; visibility: string; thumb_key: string | null; duration: number; tech: TechInfo };
};

export function EditVideoForm({ video }: Props) {
  const [state, action] = useActionState(updateVideoAction, {});
  const [thumbKey, setThumbKey] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onThumb(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      const blob = await resizeImage(f, 1280, 720);
      setPreview(URL.createObjectURL(blob));
      setThumbKey(await uploadFile(blob, "thumb", "jpg").promise);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <input type="hidden" name="id" value={video.id} />
      <input type="hidden" name="thumb_key" value={thumbKey} />
      <div className="card flex flex-col gap-4 p-5 sm:p-6">
        <FormSuccess message={state.message} />
        <FormError message={state.error} />
        <VideoDetailsFields defaults={video} errors={state.fieldErrors} />
      </div>
      <aside className="flex flex-col gap-4">
        <div className="card overflow-hidden p-4">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="aspect-video w-full rounded-lg object-cover" />
          ) : (
            <Thumbnail video={{ ...video, title: video.title }} className="rounded-lg" />
          )}
          <label className="btn btn-soft mt-3 w-full cursor-pointer">
            <Icon name="camera" size={18} /> {busy ? "Enviando…" : "Trocar miniatura"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onThumb(e.target.files?.[0])} />
          </label>
          <Link href={`/watch/${video.id}`} className="btn btn-ghost mt-2 w-full">
            <Icon name="eye" size={18} /> Ver vídeo
          </Link>
        </div>
        <SubmitButton className="btn-green w-full" pendingText="Salvando…" disabled={busy}>
          Salvar alterações
        </SubmitButton>
        <DeleteVideoButton videoId={video.id} redirectTo="/studio" label="Excluir vídeo" />
      </aside>
    </form>
  );
}
