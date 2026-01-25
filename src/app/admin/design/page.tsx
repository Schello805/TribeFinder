import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminDesignPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Design</h1>

      <AdminNav />

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Branding & Banner</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Direktansicht der bestehenden Einstellungen.
          </p>
        </div>
        <div className="p-0">
          <iframe
            src="/admin/settings?embed=1&section=design"
            title="Design Einstellungen"
            className="w-full h-[1200px] bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
