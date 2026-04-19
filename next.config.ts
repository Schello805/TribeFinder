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
  images: {
    // We mostly serve local `/uploads/*` user content. Disabling the optimizer avoids
    // occasional client/proxy quirks with `/_next/image` and simplifies deployment.
    unoptimized: true,
  },
  experimental: {
    // Keep this just above the largest accepted upload (admin backups: 500 MB).
    proxyClientMaxBodySize: "520mb",
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const matomo = (process.env.MATOMO_URL || "").trim();
    const matomoOrigin = (() => {
      try {
        return matomo ? new URL(matomo).origin : "";
      } catch {
        return "";
      }
    })();
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      `img-src 'self' data: blob: https: ${matomoOrigin}`.trim(),
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https: ${matomoOrigin}`.trim(),
      isDev
        ? `connect-src 'self' https: http: ws: blob: ${matomoOrigin}`.trim()
        : `connect-src 'self' https: blob: ${matomoOrigin}`.trim(),
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");

    const cspReportOnly = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      // frame-ancestors is ignored in report-only; omit to reduce console noise.
      "form-action 'self'",
      `img-src 'self' data: blob: https: ${matomoOrigin}`.trim(),
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https: ${matomoOrigin}`.trim(),
      isDev
        ? `connect-src 'self' https: http: ws: blob: ${matomoOrigin}`.trim()
        : `connect-src 'self' https: blob: ${matomoOrigin}`.trim(),
      // upgrade-insecure-requests is ignored in report-only; omit to reduce console noise.
      "report-uri /api/csp-report",
    ].join("; ");

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
