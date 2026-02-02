"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function itemClass(active: boolean) {
  return `tf-display inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition border ${
    active
      ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]"
      : "bg-[var(--surface)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
  }`;
}

export default function DashboardNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/dashboard" className={itemClass(isActive("/dashboard"))}>
        Überblick
      </Link>
      <Link href="/dashboard/profile" className={itemClass(isActive("/dashboard/profile"))}>
        Profil
      </Link>
      <Link href="/dashboard/dance-styles" className={itemClass(isActive("/dashboard/dance-styles"))}>
        Tanzstile
      </Link>
      <Link href="/dashboard/notifications" className={itemClass(isActive("/dashboard/notifications"))}>
        Benachrichtigungen
      </Link>
    </div>
  );
}
