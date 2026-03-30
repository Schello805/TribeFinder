import { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

type MarketplaceListingSitemapRow = {
  id: string;
  updatedAt: Date;
  expiresAt: Date;
};

function getMarketplaceListingDelegate(p: typeof prisma) {
  return (p as unknown as { marketplaceListing?: unknown }).marketplaceListing as
    | undefined
    | {
        findMany: (args: unknown) => Promise<MarketplaceListingSitemapRow[]>;
      };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rawBase = (process.env.SITE_URL || process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
  const fallbackProtocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const fallbackBase = `${fallbackProtocol}://localhost:3000`;
  const baseUrl = (rawBase || fallbackBase).replace(/^http:\/\//i, process.env.NODE_ENV === "development" ? "http://" : "https://");

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/marketing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/groups`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/taenzerinnen`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/marketplace`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/links`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/hilfe`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/impressum`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/datenschutz`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    // Dynamic group pages
    const groups = await prisma.group.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    const groupPages: MetadataRoute.Sitemap = groups.map((group) => ({
      url: `${baseUrl}/groups/${group.id}`,
      lastModified: group.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    // Dynamic event pages
    const events = await prisma.event.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 100, // Limit to recent events
    });

    const eventPages: MetadataRoute.Sitemap = events.map((event) => ({
      url: `${baseUrl}/events/${event.id}`,
      lastModified: event.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const marketplaceDelegate = getMarketplaceListingDelegate(prisma);
    const marketplaceListings = marketplaceDelegate
      ? await marketplaceDelegate.findMany({
          where: {
            expiresAt: { gt: new Date() },
          },
          select: { id: true, updatedAt: true, expiresAt: true },
          orderBy: { updatedAt: "desc" },
          take: 2000,
        })
      : [];

    const marketplacePages: MetadataRoute.Sitemap = marketplaceListings.map((l) => ({
      url: `${baseUrl}/marketplace/${l.id}`,
      lastModified: l.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [...staticPages, ...groupPages, ...eventPages, ...marketplacePages];
  } catch {
    return staticPages;
  }
}
