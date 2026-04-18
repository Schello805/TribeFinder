import { MetadataRoute } from "next";
import { getPublicBaseUrl } from "@/lib/publicBaseUrl";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getPublicBaseUrl();

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
