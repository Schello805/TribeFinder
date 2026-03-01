import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type AnnouncementDelegate = {
  findFirst: (args: unknown) => Promise<unknown>;
};

function getAnnouncementDelegate(): AnnouncementDelegate | null {
  const delegate = (prisma as unknown as { announcement?: AnnouncementDelegate }).announcement;
  return delegate ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ item: null }, { status: 200 });
  }

  const userId = session.user.id;
  const now = new Date();

  try {
    const delegate = getAnnouncementDelegate();
    if (!delegate) {
      return NextResponse.json(
        {
          item: null,
          message:
            "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
        },
        { status: 200 }
      );
    }

    const item = (await delegate.findFirst({
      where: {
        isActive: true,
        showFrom: { lte: now },
        OR: [{ showUntil: null }, { showUntil: { gte: now } }],
        dismissals: { none: { userId } },
      },
      orderBy: { showFrom: "desc" },
    })) as unknown;

    return NextResponse.json({ item }, { status: 200 });
  } catch {
    return NextResponse.json({ item: null }, { status: 200 });
  }
}
