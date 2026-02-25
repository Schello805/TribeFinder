import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonUnauthorized } from "@/lib/apiResponse";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    category: z.string().trim().min(2).max(200).nullable().optional(),
    formerName: z.string().trim().min(2).max(200).nullable().optional(),
    websiteUrl: z.string().trim().url().nullable().optional(),
    videoUrl: z.string().trim().url().nullable().optional(),
    description: z.string().trim().min(2).max(5000).nullable().optional(),
  })
  .strict();

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonBadRequest("Validierungsfehler", { errors: parsed.error.flatten() });
  }

  try {
    const danceStyleDelegate = (prisma as unknown as { danceStyle?: unknown }).danceStyle as
      | undefined
      | {
          update: (args: unknown) => Promise<{
            id: string;
            name: string;
            category: string | null;
            formerName: string | null;
            websiteUrl: string | null;
            videoUrl: string | null;
            description: string | null;
            _count: { groups: number; users: number };
          }>;
        };

    if (!danceStyleDelegate) {
      return NextResponse.json(
        {
          message:
            "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
        },
        { status: 500 }
      );
    }

    const updated = await danceStyleDelegate.update({
      where: { id },
      data: {
        name: typeof parsed.data.name === "string" ? parsed.data.name : undefined,
        category: parsed.data.category === undefined ? undefined : parsed.data.category,
        formerName: parsed.data.formerName === undefined ? undefined : parsed.data.formerName,
        websiteUrl: parsed.data.websiteUrl === undefined ? undefined : parsed.data.websiteUrl,
        videoUrl: parsed.data.videoUrl === undefined ? undefined : parsed.data.videoUrl,
        description: parsed.data.description === undefined ? undefined : parsed.data.description,
      },
      select: {
        id: true,
        name: true,
        category: true,
        formerName: true,
        websiteUrl: true,
        videoUrl: true,
        description: true,
        _count: { select: { groups: true, users: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const err = error as { code?: string };
    if (err?.code === "P2002") {
      return NextResponse.json({ message: "Name existiert bereits" }, { status: 409 });
    }
    return NextResponse.json({ message: "Fehler beim Speichern" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  try {
    const danceStyleDelegate = (prisma as unknown as { danceStyle?: unknown }).danceStyle as
      | undefined
      | {
          delete: (args: unknown) => Promise<unknown>;
        };

    if (!danceStyleDelegate) {
      return NextResponse.json(
        {
          message:
            "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
        },
        { status: 500 }
      );
    }

    await danceStyleDelegate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Fehler beim Löschen" }, { status: 500 });
  }
}
