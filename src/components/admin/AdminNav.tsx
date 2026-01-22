"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function itemClass(active: boolean) {
  return `inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition border ${
    active
      ? "bg-indigo-600 text-white border-indigo-600"
      : "bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
  }`;
}

 export default function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/admin" className={itemClass(isActive("/admin"))}>
        Dashboard
      </Link>
      <Link href="/admin/system" className={itemClass(isActive("/admin/system"))}>
        System
      </Link>
      <Link href="/admin/settings" className={itemClass(isActive("/admin/settings"))}>
        Einstellungen
      </Link>
      <Link href="/admin/tags" className={itemClass(isActive("/admin/tags"))}>
        Tanzstile
      </Link>
      <Link href="/admin/users" className={itemClass(isActive("/admin/users"))}>
        Benutzer
      </Link>
      <Link href="/admin/feedback" className={itemClass(isActive("/admin/feedback"))}>
        Feedback
      </Link>
      <Link href="/admin/diagnostics" className={itemClass(isActive("/admin/diagnostics"))}>
        Diagnose
      </Link>
      <Link href="/admin/backups" className={itemClass(isActive("/admin/backups"))}>
        Backups
      </Link>
    </div>
  );
}
