import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'digitalhub.fifa.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // No cachear páginas HTML (excluye assets estáticos con hash en URL)
        source: '/((?!_next/static|_next/image|favicon).*)',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ]
  },
};

export default nextConfig;
