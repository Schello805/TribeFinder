import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import AdminDanceStyleSuggestionsManager from "@/components/admin/AdminDanceStyleSuggestionsManager";

export const dynamic = "force-dynamic";

export default async function AdminDanceStyleSuggestionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[90vw] py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tanzstil-Vorschläge</h1>

      <AdminNav />

      <AdminDanceStyleSuggestionsManager />
    </div>
  );
}
