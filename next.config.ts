import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fontes do próprio repo (NEU-176): o nome do arquivo muda quando a fonte muda.
  async headers() {
    return [
      {
        source: "/fonts/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
