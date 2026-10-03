import { mediaUrl } from "@/lib/format";
import { getHomeAd } from "@/lib/settings";
import { AdForm } from "./AdForm";

export const metadata = { title: "Publicidade" };

export default async function AdsAdminPage() {
  const ad = await getHomeAd();
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold">Publicidade na página inicial</h2>
        <p className="mt-1 text-sm text-muted">
          Faixa de 1063 × 139 px logo abaixo dos filtros da página inicial, para patrocinadores. Troque a imagem e o link quando quiser.
        </p>
      </div>
      <AdForm ad={ad} imageUrl={mediaUrl(ad.image)} mobileUrl={mediaUrl(ad.imageMobile)} />
    </div>
  );
}
