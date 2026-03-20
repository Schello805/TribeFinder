import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Row = { country: string };

function getEventDelegate(p: typeof prisma) {
  return (p as unknown as { event?: unknown }).event as
    | undefined
    | {
        findMany: (args: unknown) => Promise<Row[]>;
      };
}

export async function GET() {
  const delegate = getEventDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  try {
    const queryRaw = (prisma as unknown as { $queryRaw?: unknown }).$queryRaw;
    const rawRows =
      typeof queryRaw === "function"
        ? await (queryRaw as <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>)<
            Array<{ country: string | null }>
          >`
            SELECT DISTINCT "country"
            FROM "Event"
            WHERE "country" IS NOT NULL AND "country" <> ''
            ORDER BY "country" ASC
            LIMIT 5000
          `
        : null;

    const rows = Array.isArray(rawRows)
      ? rawRows.map((r) => ({ country: typeof r?.country === "string" ? r.country : "" }))
      : await delegate.findMany({
          distinct: ["country"],
          select: { country: true },
          take: 5000,
        } as unknown);

    const countries = Array.from(
      new Set(
        (rows || [])
          .map((x) => (typeof x.country === "string" ? x.country.trim() : ""))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "de"));

    return NextResponse.json({ countries });
  } catch (e) {
    const errorDetails =
      e instanceof Error
        ? { name: e.name, message: e.message, stack: e.stack }
        : { value: e };

    return NextResponse.json(
      {
        message: "Fehler beim Laden der Länder",
        ...(process.env.NODE_ENV !== "production" ? { details: errorDetails } : {}),
      },
      { status: 500 }
    );
  }
}
