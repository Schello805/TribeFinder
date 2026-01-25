import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inhalte</h1>

      <AdminNav />

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Tags & Tanzstile</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Verwaltung von Kategorien/Tags (Tanzstile) inkl. Import und Aufräumen.
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href="/admin/tags"
              className="inline-flex items-center justify-center px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Tags & Tanzstile verwalten
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
