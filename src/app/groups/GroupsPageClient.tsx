'use client';

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import GroupFilter from "@/components/groups/GroupFilter";
import GroupListAnimated from "@/components/groups/GroupListAnimated";
import { GroupListSkeleton } from "@/components/ui/SkeletonLoader";
import Link from "next/link";
import LikeButton from "@/components/groups/LikeButton";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

type GroupTag = { id: string; name: string };
export type GroupListItem = {
  id: string;
  name: string;
  description: string;
  image?: string | null;
  createdAt: string | Date;
  size?: "SOLO" | "SMALL" | "LARGE" | null;
  location?: { address?: string | null } | null;
  tags: GroupTag[];
  likeCount?: number;
  likedByMe?: boolean;
};

function isGroupListItem(v: unknown): v is GroupListItem {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.description === "string" && Array.isArray(o.tags);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export default function GroupsPageClient({
  initialGroups,
  initialTopGroups,
  initialTotal,
  initialQueryString,
}: {
  initialGroups: GroupListItem[];
  initialTopGroups: GroupListItem[];
  initialTotal: number;
  initialQueryString: string;
}) {
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<GroupListItem[]>(initialGroups);
  const [topGroups, setTopGroups] = useState<GroupListItem[]>(initialTopGroups);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState<number>(initialTotal);

  useEffect(() => {
    const loadTop = async () => {
      try {
        const params = new URLSearchParams();
        params.append("sort", "popular");
        params.append("limit", "3");
        const res = await fetch(`/api/groups?${params.toString()}`);
        if (!res.ok) {
          setTopGroups([]);
          return;
        }
        const json: unknown = await res.json().catch(() => null);
        const arr = Array.isArray(json) ? json : isRecord(json) && Array.isArray(json.data) ? json.data : [];
        setTopGroups((arr as unknown[]).filter(isGroupListItem).slice(0, 3));
      } catch {
        setTopGroups([]);
      }
    };

    if (initialTopGroups.length === 0) {
      void loadTop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const current = searchParams.toString();
    if (current === initialQueryString) return;

    const fetchGroups = async () => {
      const address = searchParams.get("address");
      const lat = searchParams.get("lat");
      const lng = searchParams.get("lng");
      const hasPendingGeocode = Boolean(address) && (!lat || !lng);
      if (hasPendingGeocode) {
        setIsLoading(true);
        return;
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        const query = searchParams.get("query");
        const danceStyleId = searchParams.get("danceStyleId");
        const tag = searchParams.get("tag");
        const performances = searchParams.get("performances");
        const seeking = searchParams.get("seeking");
        const size = searchParams.get("size");
        const sort = searchParams.get("sort");
        const page = searchParams.get("page") || "1";
        const lat = searchParams.get("lat");
        const lng = searchParams.get("lng");
        const radius = searchParams.get("radius") || "50";

        if (query) params.append("query", query);
        if (danceStyleId) params.append("danceStyleId", danceStyleId);
        else if (tag) params.append("tag", tag);
        if (performances) params.append("performances", performances);
        if (seeking) params.append("seeking", seeking);
        if (size) params.append("size", size);
        if (sort) params.append("sort", sort);
        if (lat) params.append("lat", lat);
        if (lng) params.append("lng", lng);
        if (radius) params.append("radius", radius);

        const res = await fetch(`/api/groups?${params.toString()}`);
        if (!res.ok) {
          setGroups([]);
          setTotal(0);
          return;
        }

        const json: unknown = await res.json().catch(() => null);
        const arr = Array.isArray(json) ? json : isRecord(json) && Array.isArray(json.data) ? json.data : [];

        const fetched = (arr as unknown[]).filter(isGroupListItem);
        const shouldMergeTop = page === "1" && sort !== "popular" && topGroups.length > 0;
        if (shouldMergeTop) {
          const seen = new Set<string>();
          const merged: GroupListItem[] = [];
          for (const g of [...topGroups, ...fetched]) {
            if (seen.has(g.id)) continue;
            seen.add(g.id);
            merged.push(g);
          }
          setGroups(merged);
        } else {
          setGroups(fetched);
        }

        if (isRecord(json) && isRecord(json.pagination) && typeof json.pagination.total === "number") {
          setTotal(json.pagination.total);
        } else {
          setTotal((arr as unknown[]).length);
        }
      } catch {
        setGroups([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchGroups();
  }, [searchParams, topGroups, initialQueryString]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center">
          <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Tanzgruppen finden</h1>
          <Link
            href="/groups/create"
            className="inline-flex items-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition"
          >
            + Neue Gruppe erstellen
          </Link>
        </div>
        <div className="mt-1 text-sm text-[var(--muted)]">{isLoading ? "Lade…" : `${total} Gruppen gefunden`}</div>
      </div>

      {topGroups.length > 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <div className="tf-display text-lg font-bold text-[var(--foreground)]">Beliebteste Gruppen</div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                Klick auf das Herz, um deine Lieblingsgruppen zu liken und die Community-Rangliste zu verbessern.
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {topGroups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 hover:bg-[var(--surface-hover)] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {g.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={normalizeUploadedImageUrl(g.image) ?? ""} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <div className="text-[var(--muted)] font-bold">{g.name.charAt(0)}</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="tf-display text-sm font-bold text-[var(--foreground)] truncate">{g.name}</div>
                    <div className="mt-0.5 text-xs text-[var(--muted)] line-clamp-1">{g.description}</div>
                  </div>

                  <LikeButton
                    groupId={g.id}
                    initialCount={typeof g.likeCount === "number" ? g.likeCount : 0}
                    initialLikedByMe={Boolean(g.likedByMe)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition disabled:opacity-50"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <GroupFilter />

      {isLoading ? <GroupListSkeleton count={6} /> : <GroupListAnimated groups={groups} />}
    </div>
  );
}
