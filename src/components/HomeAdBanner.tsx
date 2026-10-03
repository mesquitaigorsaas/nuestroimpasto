import { mediaUrl } from "@/lib/format";
import type { HomeAd } from "@/lib/settings";

/**
 * Faixa de publicidade da página inicial.
 * Computador: 1063 × 139. Celular: imagem própria em 32:10 (se houver); senão a de computador, fininha.
 * Anúncio ativo → imagem com link do anunciante. Sem anúncio → "Anuncie aqui" (se houver contato) ou nada.
 */
export function HomeAdBanner({ ad, preview = false }: { ad: HomeAd; preview?: boolean }) {
  const url = mediaUrl(ad.image);
  const mobileUrl = mediaUrl(ad.imageMobile);

  if (ad.active && url) {
    // Sem link do anunciante, o clique leva ao contato de quem quer anunciar (útil para a arte "Seja nosso patrocinador").
    const href = ad.link || ad.contact;
    const img = (
      <picture>
        {mobileUrl && <source media="(max-width: 639px)" srcSet={mobileUrl} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={ad.alt}
          className={`w-full rounded-xl object-cover ${mobileUrl ? "aspect-[32/10] sm:aspect-[1063/139]" : "aspect-[1063/139]"}`}
        />
      </picture>
    );
    return (
      <div className="mb-6">
        <div className="relative">
          {href ? (
            <a href={href} target="_blank" rel={ad.link ? "sponsored noopener" : "noopener"} className="block">
              {img}
            </a>
          ) : (
            img
          )}
          <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white uppercase">
            Publicidade
          </span>
        </div>
        {/* Contato para anunciantes sempre visível, com ou sem patrocinador ativo. */}
        {ad.contact && (
          <p className="mt-1.5 text-right text-xs text-muted">
            Quer aparecer aqui?{" "}
            <a href={ad.contact} target="_blank" rel="noopener" className="font-semibold text-gold hover:underline">
              Então clique.
            </a>
          </p>
        )}
      </div>
    );
  }

  if (ad.contact) {
    return (
      <a
        href={ad.contact}
        target="_blank"
        rel="noopener"
        className="mb-6 flex aspect-[32/10] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-cream-2 px-4 text-center transition hover:border-tomato/50 sm:aspect-[1063/139]"
      >
        <span className="text-base font-bold sm:text-lg">Anuncie aqui no Nuestro Impasto</span>
        <span className="mt-1 text-xs text-muted sm:text-sm">Sua marca na página inicial de quem faz massa · fale com a gente</span>
      </a>
    );
  }

  return preview ? <p className="text-sm text-muted">Nada aparece: não há anúncio ativo nem contato para “Anuncie aqui”.</p> : null;
}
