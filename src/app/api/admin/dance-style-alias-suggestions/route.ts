import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonUnauthorized } from "@/lib/apiResponse";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  try {
    const delegate = (prisma as unknown as { danceStyleAliasSuggestion?: unknown }).danceStyleAliasSuggestion as
      | undefined
      | {
          findMany: (args: unknown) => Promise<
            Array<{
              id: string;
              aliasName: string;
              sourceUrl: string | null;
              comment: string | null;
              status: string;
              createdAt: Date;
              decidedAt: Date | null;
              style: { id: string; name: string };
              createdBy: { id: string; email: string; name: string | null };
              decidedByAdmin: { id: string; email: string; name: string | null } | null;
            }>
          >;
        };

    if (!delegate) {
      return NextResponse.json(
        {
          message:
            "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
        },
        { status: 500 }
      );
    }

    const items = await delegate.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        aliasName: true,
        sourceUrl: true,
        comment: true,
        status: true,
        createdAt: true,
        decidedAt: true,
        style: { select: { id: true, name: true } },
        createdBy: { select: { id: true, email: true, name: true } },
        decidedByAdmin: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json(
      items.map((x) => ({
        ...x,
        createdAt: x.createdAt.toISOString(),
        decidedAt: x.decidedAt ? x.decidedAt.toISOString() : null,
      }))
    );
  } catch (error) {
    const err = error as { code?: string; message?: string };
    const code = err?.code || (error as { code?: string } | null)?.code;
    if (code === "P2021" || code === "P2022") {
      return NextResponse.json(
        {
          message:
            "Datenbank ist noch nicht aktualisiert (Migration fehlt). Bitte Migrationen ausführen und erneut versuchen.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ message: "Fehler beim Laden" }, { status: 500 });
  }
}
