import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import AdminDesignBrandingBanner from "@/components/admin/AdminDesignBrandingBanner";
import AdminEmbedMode from "@/components/admin/AdminEmbedMode";

export const dynamic = "force-dynamic";

export default async function AdminDesignPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const sp = (await searchParams) || {};
  const embedRaw = sp.embed;
  const embed = Array.isArray(embedRaw) ? embedRaw[0] : embedRaw;
  const isEmbed = embed === "1";

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[90vw] py-8 px-4 space-y-6">
      <AdminEmbedMode />
      {!isEmbed ? (
        <>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Design</h1>
          <AdminNav />
        </>
      ) : null}

      <AdminDesignBrandingBanner />
    </div>
  );
}
