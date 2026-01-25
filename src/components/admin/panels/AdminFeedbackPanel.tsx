import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AdminFeedbackList from "@/components/admin/AdminFeedbackList";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPanel() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  let initialItems: Array<{
    id: string;
    message: string;
    reporterName?: string | null;
    reporterEmail?: string | null;
    pageUrl?: string | null;
    userAgent?: string | null;
    browser?: string | null;
    os?: string | null;
    createdAt: string;
    archivedAt?: string | null;
    user?: { id: string; email: string; name?: string | null } | null;
  }> = [];
  let loadError: string | null = null;

  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        message: true,
        reporterName: true,
        reporterEmail: true,
        pageUrl: true,
        userAgent: true,
        browser: true,
        os: true,
        archivedAt: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    initialItems = feedbacks.map((f: (typeof feedbacks)[number]) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
      archivedAt: f.archivedAt ? f.archivedAt.toISOString() : null,
    }));
  } catch {
    loadError = "Feedback konnte nicht geladen werden. Bitte prüfe die Server-Logs (DB/Migration).";
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 px-4 py-3 text-sm">
          {loadError}
        </div>
      )}

      <AdminFeedbackList initialItems={initialItems} />
    </div>
  );
}
