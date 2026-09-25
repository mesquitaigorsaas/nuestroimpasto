"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { updateProfileAction } from "@/actions/profile";
import { Avatar } from "@/components/Avatar";
import { Field, FormError, FormSuccess, SubmitButton, TextArea } from "@/components/forms";
import { Icon } from "@/components/icons";
import { mediaUrl } from "@/lib/format";
import { resizeImage, uploadFile } from "@/lib/upload-client";

type U = {
  name: string;
  bio: string;
  specialty: string;
  location: string;
  website: string;
  instagram: string;
  avatar_key: string | null;
  banner_key: string | null;
  handle: string;
};

export function ProfileForm({ user }: { user: U }) {
  const [state, action] = useActionState(updateProfileAction, {});
  const [avatar, setAvatar] = useState<{ key: string; url: string } | null>(null);
  const [banner, setBanner] = useState<{ key: string; url: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fe = state.fieldErrors ?? {};

  async function upload(f: File | undefined, kind: "avatar" | "banner") {
    if (!f) return;
    setBusy(kind);
    try {
      const blob = kind === "avatar" ? await resizeImage(f, 400, 400) : await resizeImage(f, 2048, 1152);
      const key = await uploadFile(blob, kind, "jpg").promise;
      const v = { key, url: URL.createObjectURL(blob) };
      if (kind === "avatar") setAvatar(v);
      else setBanner(v);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const bannerUrl = banner?.url ?? mediaUrl(user.banner_key);

  return (
    <form action={action} className="card flex flex-col gap-5 p-5 sm:p-6">
      <input type="hidden" name="avatar_key" value={avatar?.key ?? ""} />
      <input type="hidden" name="banner_key" value={banner?.key ?? ""} />
      <FormSuccess message={state.message} />
      <FormError message={state.error} />

      <div>
        <span className="label">Capa do canal</span>
        <label className="relative block cursor-pointer overflow-hidden rounded-2xl">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerUrl} alt="" className="aspect-[6/1] w-full object-cover" />
          ) : (
            <div className="relative aspect-[6/1] w-full bg-gradient-to-r from-ink to-ink-2">
              <div className="tricolore absolute right-0 bottom-0 left-0 h-1.5" />
            </div>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-ink/30 text-sm font-medium text-white opacity-0 transition hover:opacity-100">
            <Icon name="camera" className="mr-2" /> {busy === "banner" ? "Enviando…" : "Trocar capa"}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], "banner")} />
        </label>
        <p className="mt-1 text-xs text-muted">Recomendado: 2048 × 340 px ou maior.</p>
      </div>

      <div className="flex items-center gap-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar.url} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <Avatar name={user.name} src={user.avatar_key} size={80} />
        )}
        <label className="btn btn-soft cursor-pointer">
          <Icon name="camera" size={18} /> {busy === "avatar" ? "Enviando…" : "Trocar foto"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], "avatar")} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" name="name" defaultValue={user.name} maxLength={60} error={fe.name} />
        <Field label="Especialidade" name="specialty" defaultValue={user.specialty} maxLength={80} placeholder="Ex.: Pizza napolitana, levain, fornos…" />
        <Field label="Localização" name="location" defaultValue={user.location} maxLength={80} placeholder="Cidade, estado" hint="Mostre só o nível de detalhe que quiser." />
        <Field label="Instagram" name="instagram" defaultValue={user.instagram} maxLength={60} placeholder="seu.perfil" />
        <div className="sm:col-span-2">
          <Field label="Site profissional" name="website" defaultValue={user.website} maxLength={200} placeholder="www.suapizzaria.com.br" error={fe.website} />
        </div>
      </div>
      <TextArea label="Bio" name="bio" defaultValue={user.bio} maxLength={1000} rows={5} placeholder="Há quanto tempo você trabalha com massa? O que te apaixona? O que vai mostrar aqui?" />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Link href={`/@${user.handle}`} className="btn btn-ghost">
          <Icon name="eye" size={18} /> Ver canal
        </Link>
        <SubmitButton className="btn-green" pendingText="Salvando…" disabled={!!busy}>
          Salvar
        </SubmitButton>
      </div>
    </form>
  );
}
