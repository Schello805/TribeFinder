import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development" || process.env.DISABLE_PWA === "1",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    middlewareClientMaxBodySize: "600mb",
  },
} as unknown as NextConfig;

export default withPWA(nextConfig);
