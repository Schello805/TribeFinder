import type { Metadata } from "next";
import { headers } from "next/headers";
import DancersPageClient, { type DancerListItem } from "@/app/taenzerinnen/DancersPageClient";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasAnyIndexableListFilters(sp: Record<string, string | string[] | undefined>) {
  const filterKeys = ["query", "hasBio", "hasGroups", "teaches", "workshops", "danceStyleId", "style", "sort", "page", "limit"];
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
    title: "Tänzerinnen finden | TribeFinder",
    description: "Finde Tänzerinnen – filtere nach Bio, Unterricht, Workshops und Tanzstil.",
    // Index only the unfiltered list to avoid duplicate content via URL params.
    robots: { index: !hasFilters, follow: true },
    alternates: {
      canonical: "/taenzerinnen",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function DancersPage({
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

  const { initialDancers, initialTotal } = await (async () => {
    try {
      if (!baseUrl) return { initialDancers: [] as DancerListItem[], initialTotal: 0 };
      const res = await fetch(`${baseUrl}/api/taenzerinnen?${initialQueryString}`, { cache: "no-store", headers: { cookie } });
      if (!res.ok) return { initialDancers: [] as DancerListItem[], initialTotal: 0 };
      const json: unknown = await res.json().catch(() => null);
      const arr = isRecord(json) && Array.isArray(json.data) ? (json.data as unknown[]) : [];
      const initialDancers = arr as DancerListItem[];
      const initialTotal =
        isRecord(json) && isRecord(json.pagination) && typeof json.pagination.total === "number"
          ? (json.pagination.total as number)
          : initialDancers.length;
      return { initialDancers, initialTotal };
    } catch {
      return { initialDancers: [] as DancerListItem[], initialTotal: 0 };
    }
  })();

  return (
    <DancersPageClient initialDancers={initialDancers} initialTotal={initialTotal} initialQueryString={initialQueryString} />
  );
}
