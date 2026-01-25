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

  const isActiveExact = (href: string) => pathname === href;
  const isActivePrefix = (prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/");

  const isOverview = isActiveExact("/admin");
  const isDesign = isActivePrefix("/admin/design") || isActivePrefix("/admin/settings");
  const isContent = isActivePrefix("/admin/content") || isActivePrefix("/admin/tags");
  const isUsers = isActivePrefix("/admin/users");
  const isOps =
    isActivePrefix("/admin/ops") ||
    isActivePrefix("/admin/backups") ||
    isActivePrefix("/admin/diagnostics") ||
    isActivePrefix("/admin/errors") ||
    isActivePrefix("/admin/feedback");
  const isSystem = isActivePrefix("/admin/system");

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/admin" className={itemClass(isOverview)}>
        Übersicht
      </Link>
      <Link href="/admin/design" className={itemClass(isDesign)}>
        Design
      </Link>
      <Link href="/admin/content" className={itemClass(isContent)}>
        Inhalte
      </Link>
      <Link href="/admin/users" className={itemClass(isUsers)}>
        Benutzer
      </Link>
      <Link href="/admin/ops" className={itemClass(isOps)}>
        Betrieb
      </Link>
      <Link href="/admin/system" className={itemClass(isSystem)}>
        System (Erweitert)
      </Link>
    </div>
  );
}
