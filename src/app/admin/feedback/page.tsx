import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";
import AdminFeedbackList from "@/components/admin/AdminFeedbackList";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
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
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
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
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feedback</h1>

      <AdminNav />

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {loadError}
        </div>
      )}

      <AdminFeedbackList initialItems={initialItems} />
    </div>
  );
}
