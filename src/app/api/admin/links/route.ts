import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonUnauthorized } from "@/lib/apiResponse";
import { z } from "zod";

type ExternalLinkAdminRow = {
  id: string;
  url: string;
  title: string;
  category: string | null;
  postalCode: string | null;
  city: string | null;
  status: string;
  submittedBy: { id: string; email: string; name: string | null };
  approvedBy: { id: string; email: string; name: string | null } | null;
  lastCheckedAt: Date | null;
  lastStatusCode: number | null;
  consecutiveFailures: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function getExternalLinkDelegate(p: typeof prisma) {
  return (p as unknown as { externalLink?: unknown }).externalLink as
    | undefined
    | {
        findMany: (args: unknown) => Promise<ExternalLinkAdminRow[]>;
        update: (args: unknown) => Promise<unknown>;
      };
}

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const delegate = getExternalLinkDelegate(prisma);
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

  const items = await delegate.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      url: true,
      title: true,
      category: true,
      postalCode: true,
      city: true,
      status: true,
      submittedBy: { select: { id: true, email: true, name: true } },
      approvedBy: { select: { id: true, email: true, name: true } },
      lastCheckedAt: true,
      lastStatusCode: true,
      consecutiveFailures: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 500,
  });

  return NextResponse.json(
    items.map((x: ExternalLinkAdminRow) => ({
      ...x,
      lastCheckedAt: x.lastCheckedAt ? x.lastCheckedAt.toISOString() : null,
      archivedAt: x.archivedAt ? x.archivedAt.toISOString() : null,
      createdAt: x.createdAt.toISOString(),
      updatedAt: x.updatedAt.toISOString(),
    }))
  );
}

const patchSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "ARCHIVE", "UNARCHIVE"]),
  id: z.string().min(1),
});

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const delegate = getExternalLinkDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();

  if (parsed.data.action === "APPROVE") {
    await delegate.update({
      where: { id: parsed.data.id },
      data: { status: "APPROVED", approvedById: session.user.id, archivedAt: null, consecutiveFailures: 0 },
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "REJECT") {
    await delegate.update({
      where: { id: parsed.data.id },
      data: { status: "REJECTED", approvedById: session.user.id },
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "ARCHIVE") {
    await delegate.update({
      where: { id: parsed.data.id },
      data: { status: "OFFLINE", archivedAt: now },
    });
    return NextResponse.json({ ok: true });
  }

  await delegate.update({
    where: { id: parsed.data.id },
    data: { status: "APPROVED", archivedAt: null, consecutiveFailures: 0 },
  });
  return NextResponse.json({ ok: true });
}
