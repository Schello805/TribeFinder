import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const rawBase = (process.env.SITE_URL || process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
  const fallbackProtocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const fallbackBase = `${fallbackProtocol}://localhost:3000`;
  const baseUrl = (rawBase || fallbackBase).replace(/^http:\/\//i, process.env.NODE_ENV === "development" ? "http://" : "https://");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/auth",
          "/dashboard",
          "/direct-messages",
          "/messages",
          "/settings",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
