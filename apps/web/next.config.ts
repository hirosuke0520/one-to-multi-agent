import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@/ai": path.resolve(__dirname, "../../packages/ai/src"),
      "@/adapters": path.resolve(__dirname, "../../packages/adapters/src"),
      "@/core": path.resolve(__dirname, "../../packages/core/src"),
      "@/ui": path.resolve(__dirname, "../../packages/ui/src"),
    };
    return config;
  },
};
