import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import logger from "@/lib/logger";

const DEFAULT_PREFS = {
  emailNotifications: true,
  notifyInboxMessages: true,
  notifyNewGroups: false,
  notifyNewEvents: false,
  notifyRadius: 50,
  notifyLat: null as number | null,
  notifyLng: null as number | null,
};

const schema = z.object({
  emailNotifications: z.boolean().optional(),
  notifyInboxMessages: z.boolean().optional(),
  notifyNewGroups: z.boolean().optional(),
  notifyNewEvents: z.boolean().optional(),
  notifyRadius: z.number().int().min(1).max(500).optional(),
  notifyLat: z.number().optional().nullable(),
  notifyLng: z.number().optional().nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        emailNotifications: true,
        notifyInboxMessages: true,
        notifyNewGroups: true,
        notifyNewEvents: true,
        notifyRadius: true,
        notifyLat: true,
        notifyLng: true,
      } as any,
    });

    if (!user) {
      return NextResponse.json(DEFAULT_PREFS);
    }

    return NextResponse.json({
      ...DEFAULT_PREFS,
      ...user,
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    logger.error({ error, userId: session.user.id }, "GET /api/user/notifications failed");

    // Wenn die DB noch nicht migriert ist (z.B. frischer Server/Update), vermeiden wir harte 500s im UI.
    if (err?.code === "P2022") {
      return NextResponse.json(DEFAULT_PREFS, { status: 200 });
    }

    return NextResponse.json(
      { message: "Fehler beim Laden der Benachrichtigungs-Einstellungen" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validierungsfehler", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.emailNotifications !== undefined ? { emailNotifications: data.emailNotifications } : {}),
        ...(data.notifyInboxMessages !== undefined ? { notifyInboxMessages: data.notifyInboxMessages } : {}),
        ...(data.notifyNewGroups !== undefined ? { notifyNewGroups: data.notifyNewGroups } : {}),
        ...(data.notifyNewEvents !== undefined ? { notifyNewEvents: data.notifyNewEvents } : {}),
        ...(data.notifyRadius !== undefined ? { notifyRadius: data.notifyRadius } : {}),
        ...(data.notifyLat !== undefined ? { notifyLat: data.notifyLat } : {}),
        ...(data.notifyLng !== undefined ? { notifyLng: data.notifyLng } : {}),
      },
      select: {
        emailNotifications: true,
        notifyInboxMessages: true,
        notifyNewGroups: true,
        notifyNewEvents: true,
        notifyRadius: true,
        notifyLat: true,
        notifyLng: true,
      } as any,
    });

    return NextResponse.json({
      ...DEFAULT_PREFS,
      ...updated,
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    logger.error({ error, userId: session.user.id }, "PUT /api/user/notifications failed");

    if (err?.code === "P2022") {
      return NextResponse.json(
        {
          message:
            "Server-Datenbank ist noch nicht auf dem neuesten Stand (Migration fehlt). Bitte Server-Update/Migration ausführen und erneut versuchen.",
        },
        { status: 503 }
      );
    }

    if (err?.code === "P2025") {
      return NextResponse.json(
        {
          message:
            "Benutzer nicht in der Datenbank gefunden. Bitte einmal abmelden und wieder anmelden (oder DATABASE_URL prüfen).",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Fehler beim Speichern der Benachrichtigungs-Einstellungen" },
      { status: 500 }
    );
  }
}
