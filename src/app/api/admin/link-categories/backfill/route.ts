import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonUnauthorized } from "@/lib/apiResponse";

function getCategoryDelegate(p: typeof prisma) {
  return (p as unknown as { externalLinkCategory?: unknown }).externalLinkCategory as
    | undefined
    | {
        upsert: (args: unknown) => Promise<{ id: string; name: string }>;
      };
}

function getExternalLinkDelegate(p: typeof prisma) {
  return (p as unknown as { externalLink?: unknown }).externalLink as
    | undefined
    | {
        findMany: (args: unknown) => Promise<Array<{ category: string | null }>>;
      };
}

export async function POST() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const categoryDelegate = getCategoryDelegate(prisma);
  const linkDelegate = getExternalLinkDelegate(prisma);

  if (!categoryDelegate || !linkDelegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const rows = await linkDelegate.findMany({
    where: { category: { not: null } },
    select: { category: true },
    take: 5000,
  });

  const names = Array.from(
    new Set(
      rows
        .map((r) => (typeof r.category === "string" ? r.category.trim() : ""))
        .filter((x) => x.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  const created: string[] = [];
  for (const name of names) {
    const c = await categoryDelegate.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true, name: true },
    });
    created.push(c.name);
  }

  return NextResponse.json({ ok: true, count: created.length, categories: created });
}
