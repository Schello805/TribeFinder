import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const DEFAULT_PREFS = {
  emailNotifications: true,
  notifyNewGroups: false,
  notifyNewEvents: false,
  notifyRadius: 50,
  notifyLat: null as number | null,
  notifyLng: null as number | null,
};

const schema = z.object({
  emailNotifications: z.boolean().optional(),
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
        notifyNewGroups: true,
        notifyNewEvents: true,
        notifyRadius: true,
        notifyLat: true,
        notifyLng: true,
      },
    });

    if (!user) {
      return NextResponse.json(DEFAULT_PREFS);
    }

    return NextResponse.json({
      ...DEFAULT_PREFS,
      ...user,
    });
  } catch {
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
        ...(data.notifyNewGroups !== undefined ? { notifyNewGroups: data.notifyNewGroups } : {}),
        ...(data.notifyNewEvents !== undefined ? { notifyNewEvents: data.notifyNewEvents } : {}),
        ...(data.notifyRadius !== undefined ? { notifyRadius: data.notifyRadius } : {}),
        ...(data.notifyLat !== undefined ? { notifyLat: data.notifyLat } : {}),
        ...(data.notifyLng !== undefined ? { notifyLng: data.notifyLng } : {}),
      },
      select: {
        emailNotifications: true,
        notifyNewGroups: true,
        notifyNewEvents: true,
        notifyRadius: true,
        notifyLat: true,
        notifyLng: true,
      },
    });

    return NextResponse.json({
      ...DEFAULT_PREFS,
      ...updated,
    });
  } catch {
    return NextResponse.json(
      { message: "Fehler beim Speichern der Benachrichtigungs-Einstellungen" },
      { status: 500 }
    );
  }
}
