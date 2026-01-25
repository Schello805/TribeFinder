import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import AdminDesignBrandingBanner from "@/components/admin/AdminDesignBrandingBanner";

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

      <AdminDesignBrandingBanner />
    </div>
  );
}
