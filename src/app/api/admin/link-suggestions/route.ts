import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonUnauthorized } from "@/lib/apiResponse";

type SuggestionRow = {
  id: string;
  status: string;
  url: string;
  title: string;
  category: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  createdBy: { id: string; email: string; name: string | null };
  decidedByAdmin: { id: string; email: string; name: string | null } | null;
  link: {
    id: string;
    url: string;
    title: string;
    category: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
  };
};

function getSuggestionDelegate(p: typeof prisma) {
  return (p as unknown as { externalLinkSuggestion?: unknown }).externalLinkSuggestion as
    | undefined
    | {
        findMany: (args: unknown) => Promise<SuggestionRow[]>;
      };
}

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const delegate = getSuggestionDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "").trim().toUpperCase();
  const where: { status?: string } = {};
  if (status) where.status = status;

  try {
    const items = await delegate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        url: true,
        title: true,
        category: true,
        postalCode: true,
        city: true,
        country: true,
        createdAt: true,
        decidedAt: true,
        createdBy: { select: { id: true, email: true, name: true } },
        decidedByAdmin: { select: { id: true, email: true, name: true } },
        link: { select: { id: true, url: true, title: true, category: true, postalCode: true, city: true, country: true } },
      },
      take: 500,
    });

    return NextResponse.json(
      items.map((x: SuggestionRow) => ({
        ...x,
        createdAt: x.createdAt.toISOString(),
        decidedAt: x.decidedAt ? x.decidedAt.toISOString() : null,
      }))
    );
  } catch (error) {
    const err = error as { code?: string };
    if (err?.code === "P2021" || err?.code === "P2022") {
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
