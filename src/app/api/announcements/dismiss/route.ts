import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type AnnouncementDismissalDelegate = {
  upsert: (args: unknown) => Promise<unknown>;
};

function getAnnouncementDismissalDelegate(): AnnouncementDismissalDelegate | null {
  const delegate = (prisma as unknown as { announcementDismissal?: AnnouncementDismissalDelegate }).announcementDismissal;
  return delegate ?? null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { announcementId?: unknown } | null;
  const announcementId = typeof body?.announcementId === "string" ? body.announcementId.trim() : "";
  if (!announcementId) {
    return NextResponse.json({ message: "announcementId fehlt" }, { status: 400 });
  }

  try {
    const delegate = getAnnouncementDismissalDelegate();
    if (!delegate) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
        },
        { status: 500 }
      );
    }

    await delegate.upsert({
      where: {
        announcementId_userId: {
          announcementId,
          userId: session.user.id,
        },
      },
      update: {
        dismissedAt: new Date(),
      },
      create: {
        announcementId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
