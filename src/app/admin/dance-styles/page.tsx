import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import AdminDanceStylesManager from "@/components/admin/AdminDanceStylesManager";
import AdminDanceStyleSuggestionsInline from "@/components/admin/AdminDanceStyleSuggestionsInline";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDanceStylesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const total = await prisma.danceStyle.count().catch(() => 0);

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[90vw] py-8 px-4 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tanzstile</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Zentrale Verwaltung der Tanzstile (manuell hinzufügen, bearbeiten, löschen).
          </p>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Gesamt: {total}</div>
        </div>
      </div>

      <AdminNav />

      <AdminDanceStyleSuggestionsInline />

      <AdminDanceStylesManager />
    </div>
  );
}
