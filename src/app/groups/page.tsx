"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import GroupFilter from "@/components/groups/GroupFilter";
import GroupListAnimated from "@/components/groups/GroupListAnimated";
import { GroupListSkeleton } from "@/components/ui/SkeletonLoader";
import Link from "next/link";

type GroupTag = { id: string; name: string };
type GroupListItem = {
  id: string;
  name: string;
  description: string;
  image?: string | null;
  createdAt: string | Date;
  size?: 'SOLO' | 'SMALL' | 'LARGE' | null;
  location?: { address?: string | null } | null;
  tags: GroupTag[];
};

function isGroupListItem(v: unknown): v is GroupListItem {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.description === "string" && Array.isArray(o.tags);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export default function GroupsPage() {
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchGroups = async () => {
      const address = searchParams.get('address');
      const lat = searchParams.get('lat');
      const lng = searchParams.get('lng');
      const hasPendingGeocode = Boolean(address) && (!lat || !lng);
      if (hasPendingGeocode) {
        setIsLoading(true);
        return;
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        const query = searchParams.get('query');
        const tag = searchParams.get('tag');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const radius = searchParams.get('radius') || '50';
        
        if (query) params.append('query', query);
        if (tag) params.append('tag', tag);
        if (lat) params.append('lat', lat);
        if (lng) params.append('lng', lng);
        if (radius) params.append('radius', radius);
        
        const res = await fetch(`/api/groups?${params.toString()}`);
        if (!res.ok) {
          setGroups([]);
          return;
        }

        const json: unknown = await res.json().catch(() => null);
        const arr = Array.isArray(json)
          ? json
          : (isRecord(json) && Array.isArray(json.data) ? json.data : []);
        setGroups((arr as unknown[]).filter(isGroupListItem));
      } catch (error) {
        console.error('Error fetching groups:', error);
        setGroups([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGroups();
  }, [searchParams]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Tanzgruppen finden</h1>
        <Link
          href="/groups/create"
          className="inline-flex items-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition"
        >
          + Neue Gruppe erstellen
        </Link>
      </div>

      <GroupFilter />

      {isLoading ? (
        <GroupListSkeleton count={6} />
      ) : (
        <GroupListAnimated groups={groups} />
      )}
    </div>
  );
}
