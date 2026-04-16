import type { Metadata } from "next";
import { headers } from "next/headers";
import GroupsPageClient, { type GroupListItem } from "@/app/groups/GroupsPageClient";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasAnyIndexableListFilters(sp: Record<string, string | string[] | undefined>) {
  const filterKeys = [
    "query",
    "danceStyleId",
    "tag",
    "performances",
    "seeking",
    "size",
    "sort",
    "page",
    "lat",
    "lng",
    "radius",
    "address",
    "country",
    "limit",
  ];
  return filterKeys.some((k) => {
    const v = sp[k];
    if (Array.isArray(v)) return v.some((x) => typeof x === "string" && x.trim().length > 0);
    return typeof v === "string" && v.trim().length > 0;
  });
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = (await searchParams) ?? {};
  const hasFilters = hasAnyIndexableListFilters(sp);
  return {
    title: "Tanzgruppen finden | TribeFinder",
    description: "Finde Tanzgruppen in deiner Nähe – filtere nach Tanzstil, Standort und mehr.",
    // Index only the unfiltered list to avoid duplicate content via URL params.
    robots: { index: !hasFilters, follow: true },
    alternates: {
      canonical: "/groups",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const initialQueryString = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v ? [[k, v]] : [])) as Array<
      [string, string]
    >
  ).toString();

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "http";
  const baseUrl = host ? `${proto}://${host}` : process.env.NEXTAUTH_URL || "";
  const cookie = h.get("cookie") || "";

  const initialTopGroups = (await (async () => {
    try {
      if (!baseUrl) return [];
      const params = new URLSearchParams();
      params.append("sort", "popular");
      params.append("limit", "3");
      const res = await fetch(`${baseUrl}/api/groups?${params.toString()}`, { cache: "no-store", headers: { cookie } });
      const json: unknown = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : isRecord(json) && Array.isArray(json.data) ? json.data : [];
      return (arr as unknown[]).slice(0, 3) as GroupListItem[];
    } catch {
      return [];
    }
  })()) as GroupListItem[];

  const { initialGroups, initialTotal } = await (async () => {
    try {
      if (!baseUrl) return { initialGroups: [] as GroupListItem[], initialTotal: 0 };
      const res = await fetch(`${baseUrl}/api/groups?${initialQueryString}`, { cache: "no-store", headers: { cookie } });
      if (!res.ok) return { initialGroups: [] as GroupListItem[], initialTotal: 0 };
      const json: unknown = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : isRecord(json) && Array.isArray(json.data) ? json.data : [];
      const initialGroups = arr as GroupListItem[];
      const initialTotal =
        isRecord(json) && isRecord(json.pagination) && typeof json.pagination.total === "number"
          ? (json.pagination.total as number)
          : initialGroups.length;
      return { initialGroups, initialTotal };
    } catch {
      return { initialGroups: [] as GroupListItem[], initialTotal: 0 };
    }
  })();

  return (
    <GroupsPageClient
      initialGroups={initialGroups}
      initialTopGroups={initialTopGroups}
      initialTotal={initialTotal}
      initialQueryString={initialQueryString}
    />
  );
}
