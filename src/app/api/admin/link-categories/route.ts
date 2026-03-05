import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonUnauthorized } from "@/lib/apiResponse";
import { z } from "zod";

type CategoryRow = { id: string; name: string; showOnMap: boolean };

function getCategoryDelegate(p: typeof prisma) {
  return (p as unknown as { externalLinkCategory?: unknown }).externalLinkCategory as
    | undefined
    | {
        findMany: (args: unknown) => Promise<CategoryRow[]>;
        upsert: (args: unknown) => Promise<CategoryRow>;
      };
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(40),
});

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const delegate = getCategoryDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const items = await delegate.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, showOnMap: true },
    take: 500,
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const delegate = getCategoryDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonBadRequest("Validierungsfehler", { errors: parsed.error.flatten() });
  }

  try {
    const created = await delegate.upsert({
      where: { name: parsed.data.name },
      update: {},
      create: { name: parsed.data.name },
      select: { id: true, name: true, showOnMap: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Fehler beim Speichern" }, { status: 500 });
  }
}
