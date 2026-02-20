import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { createTransferArchive } from "@/lib/serverTransfer";
import { recordAdminAudit } from "@/lib/adminAudit";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const groupIds: unknown[] = Array.isArray(body?.groupIds) ? body.groupIds : [];
  const cleaned: string[] = groupIds
    .filter((v: unknown): v is string => typeof v === "string")
    .map((s: string) => s.trim())
    .filter(Boolean);

  if (cleaned.length === 0) {
    return NextResponse.json({ message: "groupIds fehlt" }, { status: 400 });
  }

  const groups = await prisma.group.findMany({ where: { id: { in: cleaned } }, select: { id: true } });
  const groupIdSet = new Set(groups.map((g) => g.id));
  const missing: string[] = cleaned.filter((id) => !groupIdSet.has(id));

  if (missing.length > 0) {
    const events = await prisma.event.findMany({ where: { id: { in: missing } }, select: { id: true, title: true } });
    const users = await prisma.user.findMany({ where: { id: { in: missing } }, select: { id: true, email: true } });

    const eventIds = events.map((e) => e.id);
    const userIds = users.map((u) => u.id);

    if (missing.length === 1 && eventIds.length === 1) {
      return NextResponse.json(
        {
          message: "Ungültige groupId",
          details:
            "Du hast vermutlich eine Event-ID eingefügt. Der Export erwartet Gruppen-IDs. Bitte die Gruppen-ID des Events exportieren.",
          detected: { type: "EVENT", id: eventIds[0], title: events[0]?.title ?? null },
        },
        { status: 400 }
      );
    }

    if (missing.length === 1 && userIds.length === 1) {
      return NextResponse.json(
        {
          message: "Ungültige groupId",
          details:
            "Du hast vermutlich eine User-ID eingefügt. Der Export erwartet Gruppen-IDs.",
          detected: { type: "USER", id: userIds[0], email: users[0]?.email ?? null },
        },
        { status: 400 }
      );
    }

    const parts: string[] = [];
    if (eventIds.length) parts.push(`Event-IDs: ${eventIds.join(", ")}`);
    if (userIds.length) parts.push(`User-IDs: ${userIds.join(", ")}`);
    const unknown: string[] = missing.filter((id) => !eventIds.includes(id) && !userIds.includes(id));
    if (unknown.length) parts.push(`Unbekannt: ${unknown.join(", ")}`);

    return NextResponse.json(
      {
        message: "Ungültige groupIds",
        details:
          `Mindestens eine ID ist keine Gruppen-ID. Bitte nur Gruppen-IDs angeben. ${parts.join(" | ")}`,
      },
      { status: 400 }
    );
  }

  try {
    const result = await createTransferArchive(cleaned);

    await recordAdminAudit({
      action: "TRANSFER_EXPORT",
      actorAdminId: session.user.id,
      metadata: { groupIds: cleaned, filename: result.filename, size: result.size, createdAt: result.createdAt },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Export fehlgeschlagen", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
