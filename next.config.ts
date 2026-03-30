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
    proxyClientMaxBodySize: "600mb",
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const matomo = "https://analytics.schellenberger.biz";
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      `img-src 'self' data: blob: https: ${matomo}`,
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https: ${matomo}`,
      isDev ? `connect-src 'self' https: http: ws: blob: ${matomo}` : `connect-src 'self' https: blob: ${matomo}`,
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");

    const cspReportOnly = `${csp}; report-uri /api/csp-report`;

    const headers = [
      { key: "Content-Security-Policy", value: csp },
      { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
      ...(isDev
        ? []
        : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]),
    ];

    return [
      {
        source: "/(.*)",
        headers,
      },
    ];
  },
} as unknown as NextConfig;

export default withPWA(nextConfig);
