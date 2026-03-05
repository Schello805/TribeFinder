import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type CategoryRow = { id: string; name: string; showOnMap: boolean };

function getCategoryDelegate(p: typeof prisma) {
  return (p as unknown as { externalLinkCategory?: unknown }).externalLinkCategory as
    | undefined
    | {
        findMany: (args: unknown) => Promise<CategoryRow[]>;
      };
}

export async function GET(req: Request) {
  const delegate = getCategoryDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const onlyOnMap = searchParams.get("onlyOnMap") === "1";

  try {
    const items = await delegate.findMany({
      where: onlyOnMap ? { showOnMap: true } : undefined,
      orderBy: { name: "asc" },
      select: { id: true, name: true, showOnMap: true },
      take: 500,
    });

    return NextResponse.json(items);
  } catch (error) {
    const err = error as { code?: string; name?: string; message?: string };
    if (err?.code === "P2021" || err?.code === "P2022") {
      return NextResponse.json(
        {
          message:
            "Datenbank ist noch nicht aktualisiert (Migration fehlt). Bitte lokal `npm run db:migrate:dev` und `npm run db:generate` ausführen.",
        },
        { status: 503 }
      );
    }

    const msg = String(err?.message || "");
    // Happens when schema changed but prisma client wasn't regenerated yet.
    if (
      err?.name === "PrismaClientValidationError" &&
      (msg.includes("showOnMap") || msg.includes("Unknown field") || msg.includes("Unknown argument"))
    ) {
      return NextResponse.json(
        {
          message:
            "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Dev-Server neu starten.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Fehler beim Laden" }, { status: 500 });
  }
}
