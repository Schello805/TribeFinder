import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  linkId: z.string().trim().min(1).max(200),
  url: z.string().trim().url().max(500),
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(40).nullable().optional(),
  postalCode: z.string().trim().regex(/^\d{5}$/).nullable().optional(),
  city: z.string().trim().min(2).max(80).nullable().optional(),
});

function getSuggestionDelegate(p: typeof prisma) {
  return (p as unknown as { externalLinkSuggestion?: unknown }).externalLinkSuggestion as
    | undefined
    | {
        create: (args: unknown) => Promise<{ id: string; status: string; createdAt: Date }>;
      };
}

function getLinkDelegate(p: typeof prisma) {
  return (p as unknown as { externalLink?: unknown }).externalLink as
    | undefined
    | {
        findUnique: (args: unknown) => Promise<{ id: string; status: string } | null>;
      };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const user = await prisma.user
    .findUnique({ where: { id: session.user.id }, select: { emailVerified: true } })
    .catch(() => null);
  if (!user?.emailVerified) {
    return NextResponse.json({ message: "Bitte bestätige zuerst deine E-Mail-Adresse." }, { status: 403 });
  }

  const suggestionDelegate = getSuggestionDelegate(prisma);
  const linkDelegate = getLinkDelegate(prisma);

  if (!suggestionDelegate || !linkDelegate) {
    return NextResponse.json(
      {
        message:
          "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
      },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  const link = await linkDelegate.findUnique({ where: { id: parsed.data.linkId }, select: { id: true, status: true } });
  if (!link) return NextResponse.json({ message: "Link nicht gefunden" }, { status: 404 });
  if (link.status !== "APPROVED") {
    return NextResponse.json({ message: "Änderungen können nur für freigegebene Links vorgeschlagen werden." }, { status: 400 });
  }

  const created = await suggestionDelegate.create({
    data: {
      linkId: parsed.data.linkId,
      url: parsed.data.url,
      title: parsed.data.title,
      category: parsed.data.category ?? null,
      postalCode: parsed.data.postalCode ?? null,
      city: parsed.data.city ?? null,
      createdById: session.user.id,
      status: "PENDING",
    },
    select: { id: true, status: true, createdAt: true },
  });

  return NextResponse.json(
    {
      ...created,
      createdAt: created.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
