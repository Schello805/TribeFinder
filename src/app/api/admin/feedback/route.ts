import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";

type FeedbackRow = {
  id: string;
  message: string;
  reporterName: string | null;
  reporterEmail: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  user: { id: string; email: string; name: string | null } | null;
};

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const archived = url.searchParams.get("archived") === "1";

    const feedbacks = await prisma.feedback.findMany({
      where: archived ? { archivedAt: { not: null } } : { archivedAt: null },
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

    return NextResponse.json(
      (feedbacks as FeedbackRow[]).map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        archivedAt: f.archivedAt ? f.archivedAt.toISOString() : null,
      }))
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Feedback konnte nicht geladen werden",
        details:
          process.env.NODE_ENV !== "production"
            ? error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : { value: error }
            : undefined,
      },
      { status: 500 }
    );
  }
}
