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
};

export default nextConfig;
