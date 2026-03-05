import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import logger from "@/lib/logger";

const createSchema = z.object({
  url: z.string().url().max(500),
  title: z.string().min(2).max(120),
  category: z.string().min(2).max(40).optional(),
  postalCode: z.string().regex(/^\d{5}$/).optional(),
  city: z.string().min(2).max(80).optional(),
});

type ExternalLinkRow = {
  id: string;
  url: string;
  title: string;
  category: string | null;
  postalCode: string | null;
  city: string | null;
  status: string;
  lastCheckedAt: Date | null;
  lastStatusCode: number | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function getExternalLinkDelegate(p: typeof prisma) {
  return (p as unknown as { externalLink?: unknown }).externalLink as
    | undefined
    | {
        findMany: (args: unknown) => Promise<ExternalLinkRow[]>;
        create: (args: unknown) => Promise<{ id: string }>;
      };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("includeArchived") === "1";

  const delegate = getExternalLinkDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const where: {
    status: string;
    archivedAt?: null;
  } = {
    status: "APPROVED",
  };

  if (!includeArchived) {
    where.archivedAt = null;
  }

  const items = await delegate.findMany({
    where,
    orderBy: [{ title: "asc" }],
    select: {
      id: true,
      url: true,
      title: true,
      category: true,
      postalCode: true,
      city: true,
      status: true,
      lastCheckedAt: true,
      lastStatusCode: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 500,
  });

  return NextResponse.json(
    items.map((x: ExternalLinkRow) => ({
      ...x,
      lastCheckedAt: x.lastCheckedAt ? x.lastCheckedAt.toISOString() : null,
      archivedAt: x.archivedAt ? x.archivedAt.toISOString() : null,
      createdAt: x.createdAt.toISOString(),
      updatedAt: x.updatedAt.toISOString(),
    }))
  );
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

    const delegate = getExternalLinkDelegate(prisma);
    if (!delegate) {
      return NextResponse.json(
        { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
    }

    const created = await delegate.create({
      data: {
        url: parsed.data.url.trim(),
        title: parsed.data.title.trim(),
        category: parsed.data.category ? parsed.data.category.trim() : null,
        postalCode: parsed.data.postalCode ? parsed.data.postalCode.trim() : null,
        city: parsed.data.city ? parsed.data.city.trim() : null,
        status: "PENDING",
        submittedById: session.user.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2002") {
      return NextResponse.json({ message: "Dieser Link existiert bereits." }, { status: 409 });
    }
    logger.error({ error }, "POST /api/links failed");
    return NextResponse.json({ message: "Konnte nicht gespeichert werden" }, { status: 500 });
  }
}
