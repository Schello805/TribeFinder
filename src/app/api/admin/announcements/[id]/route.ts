import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";

type AnnouncementDelegate = {
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
};

function getAnnouncementDelegate(): AnnouncementDelegate | null {
  const delegate = (prisma as unknown as { announcement?: AnnouncementDelegate }).announcement;
  return delegate ?? null;
}

function parseString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function parseBool(v: unknown) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function parseDate(v: unknown): Date | null {
  const s = parseString(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseBullets(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter((x) => x.length > 0)
      .slice(0, 20);
  }
  if (typeof v === "string") {
    return v
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
      .slice(0, 20);
  }
  return [];
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  try {
    const delegate = getAnnouncementDelegate();
    if (!delegate) {
      return jsonServerError(
        "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
        new Error("Missing prisma.announcement delegate")
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const title = parseString(body?.title);
    const bullets = parseBullets(body?.bullets);
    const showFrom = parseDate(body?.showFrom);
    const showUntil = parseDate(body?.showUntil);
    const isActive = body?.isActive === undefined ? true : parseBool(body.isActive);

    if (!title) return jsonBadRequest("Titel fehlt");
    if (bullets.length === 0) return jsonBadRequest("Bitte mindestens einen Bulletpoint angeben");
    if (!showFrom) return jsonBadRequest("Startdatum ungültig");
    if (showUntil && showUntil.getTime() < showFrom.getTime()) {
      return jsonBadRequest("Enddatum muss nach dem Startdatum liegen");
    }

    const updated = await delegate.update({
      where: { id },
      data: {
        title,
        bullets,
        showFrom,
        showUntil,
        isActive,
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    return jsonServerError("Fehler beim Speichern", error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  try {
    const delegate = getAnnouncementDelegate();
    if (!delegate) {
      return jsonServerError(
        "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
        new Error("Missing prisma.announcement delegate")
      );
    }

    await delegate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonServerError("Fehler beim Löschen", error);
  }
}
