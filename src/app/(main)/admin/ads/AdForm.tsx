"use client";

import { useActionState, useState } from "react";
import { saveHomeAdAction } from "@/actions/admin";
import { Field, FormError, FormSuccess } from "@/components/forms";
import { Icon } from "@/components/icons";
import { resizeImage, uploadFile } from "@/lib/upload-client";
import type { HomeAd } from "@/lib/settings";

/** Formulário da faixa de publicidade da página inicial (1063 × 139). */
export function AdForm({ ad, imageUrl, mobileUrl }: { ad: HomeAd; imageUrl: string | null; mobileUrl: string | null }) {
  const [state, action] = useActionState(saveHomeAdAction, {});
  const [image, setImage] = useState<{ key: string; url: string } | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mobile, setMobile] = useState<{ key: string; url: string } | null>(null);
  const [mobileRemoved, setMobileRemoved] = useState(false);
  const [busyMobile, setBusyMobile] = useState(false);
  const mobilePreview = mobile?.url ?? (mobileRemoved ? null : mobileUrl);

  async function uploadMobile(f: File | undefined) {
    if (!f) return;
    setBusyMobile(true);
    try {
      const blob = await resizeImage(f, 1280, 400, 0.9);
      const key = await uploadFile(blob, "ad", "jpg").promise;
      setMobile({ key, url: URL.createObjectURL(blob) });
      setMobileRemoved(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyMobile(false);
    }
  }
  const fe = state.fieldErrors ?? {};
  const preview = image?.url ?? (removed ? null : imageUrl);

  async function upload(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      // 2× o tamanho da faixa, para ficar nítido em telas de alta resolução.
      const blob = await resizeImage(f, 2126, 278 * 2, 0.9);
      const key = await uploadFile(blob, "ad", "jpg").promise;
      setImage({ key, url: URL.createObjectURL(blob) });
      setRemoved(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={action} className="card flex flex-col gap-5 p-5 sm:p-6">
      <input type="hidden" name="image_key" value={image?.key ?? ""} />
      <input type="hidden" name="remove_image" value={removed ? "1" : ""} />
      <input type="hidden" name="image_mobile_key" value={mobile?.key ?? ""} />
      <input type="hidden" name="remove_image_mobile" value={mobileRemoved ? "1" : ""} />
      <FormSuccess message={state.message} />
      <FormError message={state.error} />

      <div>
        <span className="label">Imagem do anúncio — computador</span>
        <label className="relative block cursor-pointer overflow-hidden rounded-xl border border-line bg-cream-2">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="aspect-[1063/139] w-full object-cover" />
          ) : (
            <div className="flex aspect-[1063/139] w-full items-center justify-center text-sm text-muted">Nenhuma imagem</div>
          )}
          <span className="btn absolute top-2 right-2 bg-white/90 text-ink shadow-sm hover:bg-white">
            <Icon name="camera" size={18} /> {busy ? "Enviando…" : preview ? "Trocar imagem" : "Enviar imagem"}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>Tamanho da faixa: 1063 × 139 px. Para ficar nítido, envie 2126 × 278 px (o dobro). Imagens de outro formato são cortadas no centro.</span>
          {preview && (
            <button
              type="button"
              className="text-tomato hover:underline"
              onClick={() => {
                setImage(null);
                setRemoved(true);
              }}
            >
              Remover imagem
            </button>
          )}
        </div>
        {fe.image && <p className="mt-1 text-xs text-tomato">{fe.image}</p>}
      </div>

      <div>
        <span className="label">Imagem do anúncio — celular (opcional)</span>
        <label className="relative block max-w-sm cursor-pointer overflow-hidden rounded-xl border border-line bg-cream-2">
          {mobilePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mobilePreview} alt="" className="aspect-[32/10] w-full object-cover" />
          ) : (
            <div className="flex aspect-[32/10] w-full items-center justify-center px-4 text-center text-sm text-muted">Sem imagem de celular: usa a de computador, bem fininha</div>
          )}
          <span className="btn absolute top-2 right-2 bg-white/90 text-ink shadow-sm hover:bg-white">
            <Icon name="camera" size={18} /> {busyMobile ? "Enviando…" : mobilePreview ? "Trocar" : "Enviar"}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadMobile(e.target.files?.[0])} />
        </label>
        <div className="mt-1 flex max-w-sm flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>No celular a faixa de computador fica com só ~45 px de altura. Envie 1280 × 400 px para ficar legível.</span>
          {mobilePreview && (
            <button
              type="button"
              className="text-tomato hover:underline"
              onClick={() => {
                setMobile(null);
                setMobileRemoved(true);
              }}
            >
              Remover
            </button>
          )}
        </div>
        {fe.imageMobile && <p className="mt-1 text-xs text-tomato">{fe.imageMobile}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Link do anunciante"
          name="link"
          defaultValue={ad.link}
          maxLength={300}
          placeholder="www.patrocinador.com.br ou wa.me/5531…"
          hint="Para onde vai quem clicar no anúncio. Vazio = usa o contato abaixo."
          error={fe.link}
        />
        <Field
          label="Nome do anunciante"
          name="alt"
          defaultValue={ad.alt}
          maxLength={120}
          placeholder="Ex.: Moinho Farinha Boa"
          hint="Lido por leitores de tela e mostrado se a imagem não carregar."
        />
        <div className="sm:col-span-2">
          <Field
            label="Contato para quem quer anunciar"
            name="contact"
            defaultValue={ad.contact}
            maxLength={300}
            placeholder="wa.me/5531999999999 ou mailto:contato@nuestroimpasto.com"
            hint="Aparece sempre como “Anuncie aqui” (abaixo do anúncio, ou no lugar dele quando não houver). Também é o destino do clique no anúncio sem link próprio."
            error={fe.contact}
          />
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={ad.active} className="size-4 accent-tomato" />
        <span>
          <b>Anúncio ativo</b> — mostrar a imagem na página inicial
        </span>
      </label>

      <div className="flex justify-end border-t border-line pt-4">
        <button className="btn btn-primary h-10 px-6" disabled={busy || busyMobile}>
          Salvar
        </button>
      </div>
    </form>
  );
}
