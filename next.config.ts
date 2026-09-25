import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Canais com URL no estilo YouTube: /@handle → /c/handle
  async rewrites() {
    return [
      { source: "/@:handle", destination: "/c/:handle" },
      { source: "/@:handle/:tab", destination: "/c/:handle/:tab" },
    ];
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    // Disco local com pouco espaço: não guardar o cache do Turbopack entre reinícios do `next dev`.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
