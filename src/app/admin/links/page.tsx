import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import AdminLinksManager from "@/components/admin/AdminLinksManager";

export const dynamic = "force-dynamic";

export default async function AdminLinksPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[90vw] py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Links</h1>

      <AdminNav />

      <AdminLinksManager />
    </div>
  );
}
