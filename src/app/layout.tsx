import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Nuestro Impasto", template: "%s · Nuestro Impasto" },
  description:
    "La comunidad de los que hacen masa — a rede social de vídeo de pizzaiolos, padeiros e profissionais de massas.",
};

export const viewport: Viewport = { themeColor: "#F9F6EE" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} antialiased`}>
      {/* extensões do navegador (ex.: ColorZilla) injetam atributos no body */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
