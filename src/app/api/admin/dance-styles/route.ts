import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonUnauthorized } from "@/lib/apiResponse";
import { z } from "zod";

async function ensureDanceStylesSeeded() {
  try {
    const existing = await prisma.danceStyle.count();
    if (existing > 0) return;

    const names = [
      "Orientalischer Tanz",
      "Bauchtanz",
      "Oriental Fusion",
      "Tribal Fusion",
      "ATS / FCBD Style",
      "ITS",
      "Wüstenrosen ATS",
      "Tribal",
      "Folklore (Orient)",
      "Drum Solo",
      "Fusion",
      "Fantasy",
    ];

    await prisma.$transaction(
      names.map((name) =>
        prisma.danceStyle.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );
  } catch {
    return;
  }
}

const createSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    category: z.string().trim().min(2).max(200).nullable().optional(),
    formerName: z.string().trim().min(2).max(200).nullable().optional(),
    websiteUrl: z.string().trim().url().nullable().optional(),
    videoUrl: z.string().trim().url().nullable().optional(),
    description: z.string().trim().min(2).max(5000).nullable().optional(),
  })
  .strict();

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  try {
    await ensureDanceStylesSeeded();
    const danceStyleDelegate = (prisma as unknown as { danceStyle?: unknown }).danceStyle as
      | undefined
      | {
          findMany: (args: unknown) => Promise<
            Array<{
              id: string;
              name: string;
              category: string | null;
              formerName: string | null;
              websiteUrl: string | null;
              videoUrl: string | null;
              description: string | null;
              _count: { groups: number; users: number };
            }>
          >;
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

    const styles = await danceStyleDelegate.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        formerName: true,
        websiteUrl: true,
        videoUrl: true,
        description: true,
        _count: {
          select: {
            groups: true,
            users: true,
          },
        },
      },
    });

    return NextResponse.json(styles);
  } catch (error) {
    console.error("/api/admin/dance-styles GET failed", error);

    const err = error as { code?: string; message?: string };
    const code = err?.code || (error as { code?: string } | null)?.code;
    const message =
      typeof err?.message === "string"
        ? err.message
        : error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message
          : "";

    const looksLikeMigrationMissing =
      code === "P2021" ||
      code === "P2022" ||
      message.includes("P2021") ||
      message.includes("P2022") ||
      message.toLowerCase().includes("column") ||
      message.toLowerCase().includes("does not exist") ||
      message.includes("websiteUrl") ||
      message.includes("description");

    if (looksLikeMigrationMissing) {
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

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonBadRequest("Validierungsfehler", { errors: parsed.error.flatten() });
  }

  try {
    const danceStyleDelegate = (prisma as unknown as { danceStyle?: unknown }).danceStyle as
      | undefined
      | {
          upsert: (args: unknown) => Promise<{
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

    const created = await danceStyleDelegate.upsert({
      where: { name: parsed.data.name },
      update: {
        category: parsed.data.category ?? undefined,
        formerName: parsed.data.formerName ?? undefined,
        websiteUrl: parsed.data.websiteUrl ?? undefined,
        videoUrl: parsed.data.videoUrl ?? undefined,
        description: parsed.data.description ?? undefined,
      },
      create: {
        name: parsed.data.name,
        category: parsed.data.category ?? null,
        formerName: parsed.data.formerName ?? null,
        websiteUrl: parsed.data.websiteUrl ?? null,
        videoUrl: parsed.data.videoUrl ?? null,
        description: parsed.data.description ?? null,
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

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Fehler beim Speichern" }, { status: 500 });
  }
}
