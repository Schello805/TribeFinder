"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import GroupFilter from "@/components/groups/GroupFilter";
import GroupListAnimated from "@/components/groups/GroupListAnimated";
import { GroupListSkeleton } from "@/components/ui/SkeletonLoader";
import Link from "next/link";

export default function GroupsPage() {
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<any[]>([]);
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

        const json = await res.json();
        const nextGroups = Array.isArray(json) ? json : (json?.data ?? []);
        setGroups(Array.isArray(nextGroups) ? nextGroups : []);
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tanzgruppen finden</h1>
        <Link
          href="/groups/create"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
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
