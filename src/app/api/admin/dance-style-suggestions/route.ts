import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonUnauthorized } from "@/lib/apiResponse";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  try {
    const suggestionDelegate = (prisma as unknown as { danceStyleSuggestion?: unknown }).danceStyleSuggestion as
      | undefined
      | {
          findMany: (args: unknown) => Promise<
            Array<{
              id: string;
              name: string;
              category: string | null;
              formerName: string | null;
              websiteUrl: string | null;
              videoUrl: string | null;
              description: string | null;
              status: string;
              createdAt: Date;
              decidedAt: Date | null;
              createdBy: { id: string; email: string; name: string | null };
              decidedByAdmin: { id: string; email: string; name: string | null } | null;
              approvedStyle: { id: string; name: string } | null;
              style:
                | {
                    id: string;
                    name: string;
                    category: string | null;
                    formerName: string | null;
                    websiteUrl: string | null;
                    videoUrl: string | null;
                    description: string | null;
                  }
                | null;
            }>
          >;
        };

    if (!suggestionDelegate) {
      return NextResponse.json(
        {
          message:
            "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
        },
        { status: 500 }
      );
    }

    const items = await suggestionDelegate.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        formerName: true,
        websiteUrl: true,
        videoUrl: true,
        description: true,
        status: true,
        createdAt: true,
        decidedAt: true,
        createdBy: { select: { id: true, email: true, name: true } },
        decidedByAdmin: { select: { id: true, email: true, name: true } },
        approvedStyle: { select: { id: true, name: true } },
        style: { select: { id: true, name: true, category: true, formerName: true, websiteUrl: true, videoUrl: true, description: true } },
      },
    });

    return NextResponse.json(
      items.map((x: (typeof items)[number]) => ({
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
            "Datenbank ist noch nicht aktualisiert (Migration fehlt). Bitte lokal `npm run db:migrate:dev` und `npm run db:generate` ausführen.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ message: "Fehler beim Laden" }, { status: 500 });
  }
}
