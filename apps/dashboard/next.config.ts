import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mysten/dapp-kit", "@memwalpp/shared", "@memwalpp/ui"],
  reactStrictMode: true,
  poweredByHeader: false,
  // Vercel runs `next build` natively; do not use `output: "standalone"` unless self-hosting Docker.
  webpack: (config) => {
    // @memwalpp/shared uses TS ESM `.js` import specifiers; map to `.ts` for Next/webpack.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
