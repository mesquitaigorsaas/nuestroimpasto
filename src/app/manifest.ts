import type { MetadataRoute } from "next";

/** Ícones em alta resolução para "Adicionar à tela inicial" (a tela de abertura usa o de 512px). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nuestro Impasto",
    short_name: "Nuestro Impasto",
    description: "La comunidad de los que hacen masa",
    start_url: "/",
    display: "standalone",
    background_color: "#F9F6EE",
    theme_color: "#F9F6EE",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
