import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { z } from "zod";
import { jsonBadRequest, jsonUnauthorized } from "@/lib/apiResponse";

type RouteParams = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  isBlocked: z.boolean().optional(),
});

async function ensureNotLastUnblockedAdmin(targetUserId: string) {
  const target = (await (prisma as any).user.findUnique({
    where: { id: targetUserId },
    select: { role: true, isBlocked: true },
  })) as { role: string; isBlocked: boolean } | null;
  if (!target) return;
  if (target.role !== "ADMIN") return;

  // We only need to protect when the target is currently an unblocked admin.
  if (target.isBlocked) return;

  const otherUnblockedAdmins = await (prisma as any).user.count({
    where: {
      role: "ADMIN",
      isBlocked: false,
      id: { not: targetUserId },
    },
  });

  if (otherUnblockedAdmins <= 0) {
    throw new Error("Der letzte Admin kann nicht entfernt/gesperrt werden");
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;
  if (id === session.user.id) {
    return jsonBadRequest("Du kannst dich nicht selbst ändern");
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonBadRequest("Validierungsfehler", { errors: parsed.error.flatten() });
  }

  try {
    if (parsed.data.role === "USER") {
      await ensureNotLastUnblockedAdmin(id);
    }
    if (parsed.data.isBlocked === true) {
      await ensureNotLastUnblockedAdmin(id);
    }

    const updated = (await (prisma as any).user.update({
      where: { id },
      data: {
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(parsed.data.isBlocked !== undefined ? { isBlocked: parsed.data.isBlocked } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
    })) as {
      id: string;
      name: string | null;
      email: string;
      role: string;
      isBlocked: boolean;
      createdAt: Date;
    };

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fehler";
    return jsonBadRequest(msg);
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;
  if (id === session.user.id) {
    return jsonBadRequest("Du kannst dich nicht selbst löschen");
  }

  try {
    await ensureNotLastUnblockedAdmin(id);
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fehler";
    return jsonBadRequest(msg);
  }
}
