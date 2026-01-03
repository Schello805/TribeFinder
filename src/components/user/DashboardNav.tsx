"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function itemClass(active: boolean) {
  return `inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition border ${
    active
      ? "bg-indigo-600 text-white border-indigo-600"
      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
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
