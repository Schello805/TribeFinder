import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type CategoryRow = { id: string; name: string };

function getCategoryDelegate(p: typeof prisma) {
  return (p as unknown as { externalLinkCategory?: unknown }).externalLinkCategory as
    | undefined
    | {
        findMany: (args: unknown) => Promise<CategoryRow[]>;
      };
}

export async function GET() {
  const delegate = getCategoryDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  try {
    const items = await delegate.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 500,
    });

    return NextResponse.json(items);
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
