import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import AdminAnnouncementsManager from "@/components/admin/AdminAnnouncementsManager";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[90vw] py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ankündigungen</h1>

      <AdminNav />

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">What&apos;s new (Modal)</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Hier kannst du die „What’s new“-Hinweise verwalten (nur eingeloggte Benutzer). Das Design ist fix; du steuerst Inhalt und Zeitraum.
          </p>
        </div>
        <div className="p-6">
          <AdminAnnouncementsManager />
        </div>
      </div>
    </div>
  );
}
