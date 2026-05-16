import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mysten/dapp-kit", "@memwalpp/shared", "@memwalpp/ui"],
  reactStrictMode: true,
  poweredByHeader: false,
  // Vercel runs `next build` natively; do not use `output: "standalone"` unless self-hosting Docker.
};

export default nextConfig;
