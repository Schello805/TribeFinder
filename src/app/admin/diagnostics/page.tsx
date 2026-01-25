"use client";

import { useSearchParams } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import AdminEmbedMode from "@/components/admin/AdminEmbedMode";
import AdminDiagnosticsPanel from "@/components/admin/panels/AdminDiagnosticsPanel";

export default function AdminDiagnosticsPage() {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AdminEmbedMode />
      {!isEmbed ? (
        <>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Diagnose</h1>
          <AdminNav />
        </>
      ) : null}

      <AdminDiagnosticsPanel />
    </div>
  );
}
