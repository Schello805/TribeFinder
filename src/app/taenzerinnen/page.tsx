"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import DancerFilter from "@/components/taenzerinnen/DancerFilter";
import DancerListAnimated from "@/components/taenzerinnen/DancerListAnimated";
import { GroupListSkeleton } from "@/components/ui/SkeletonLoader";

type Membership = { group: { id: string; name: string } };
type DancerListItem = {
  id: string;
  name: string | null;
  dancerName: string | null;
  image: string | null;
  bio: string | null;
  updatedAt: string | Date;
  memberships: Membership[];
};

function isDancerListItem(v: unknown): v is DancerListItem {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && (typeof o.dancerName === "string" || o.dancerName === null);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export default function DancersPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [dancers, setDancers] = useState<DancerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    const fetchDancers = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/taenzerinnen?${searchParams.toString()}`);
        if (!res.ok) {
          setDancers([]);
          setTotal(0);
          return;
        }

        const json: unknown = await res.json().catch(() => null);
        const arr = isRecord(json) && Array.isArray(json.data) ? json.data : [];
        setDancers((arr as unknown[]).filter(isDancerListItem));

        if (isRecord(json) && isRecord(json.pagination) && typeof json.pagination.total === "number") {
          setTotal(json.pagination.total);
        } else {
          setTotal((arr as unknown[]).length);
        }
      } catch (error) {
        console.error("Error fetching dancers:", error);
        setDancers([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDancers();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center">
          <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Tänzerinnen finden</h1>
          <Link
            href={session?.user?.id ? "/dashboard/profile" : "/auth/signin"}
            className="inline-flex items-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition"
          >
            {session?.user?.id ? "In Tänzerinnenliste sichtbar werden" : "Anmelden"}
          </Link>
        </div>
        <div className="mt-1 text-sm text-[var(--muted)]">
          {isLoading ? "Lade…" : `${total} Tänzerinnen gefunden`}
        </div>
      </div>

      <DancerFilter />

      {isLoading ? <GroupListSkeleton count={6} /> : <DancerListAnimated dancers={dancers} />}
    </div>
  );
}
