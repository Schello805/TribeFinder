import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { z } from "zod";
import { jsonBadRequest, jsonUnauthorized } from "@/lib/apiResponse";
import { recordAdminAudit } from "@/lib/adminAudit";
import { emailHeading, emailHighlight, emailTemplate, emailText, sendEmail } from "@/lib/email";

type RouteParams = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  isBlocked: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  blockReason: z.string().trim().min(1).max(1000).optional(),
});

async function ensureNotLastUnblockedAdmin(targetUserId: string) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { role: true, isBlocked: true },
  });
  if (!target) return;
  if (target.role !== "ADMIN") return;

  // We only need to protect when the target is currently an unblocked admin.
  if (target.isBlocked) return;

  const otherUnblockedAdmins = await prisma.user.count({
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

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonBadRequest("Validierungsfehler", { errors: parsed.error.flatten() });
  }

  if (id === session.user.id) {
    const onlyEmailVerified =
      parsed.data.emailVerified !== undefined &&
      parsed.data.role === undefined &&
      parsed.data.isBlocked === undefined;
    if (!onlyEmailVerified) {
      return jsonBadRequest("Du kannst dich nicht selbst ändern");
    }
  }

  try {
    if (parsed.data.role === "USER") {
      await ensureNotLastUnblockedAdmin(id);
    }
    if (parsed.data.isBlocked === true) {
      await ensureNotLastUnblockedAdmin(id);
    }

    if (parsed.data.isBlocked === true && !parsed.data.blockReason) {
      return jsonBadRequest("Bitte einen Grund für die Sperre angeben");
    }

    const targetBefore =
      parsed.data.isBlocked !== undefined
        ? await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, isBlocked: true } })
        : null;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(parsed.data.isBlocked !== undefined ? { isBlocked: parsed.data.isBlocked } : {}),
        ...(parsed.data.emailVerified !== undefined
          ? {
              emailVerified: parsed.data.emailVerified ? new Date() : null,
              ...(parsed.data.emailVerified
                ? {
                    verificationToken: null,
                    verificationTokenExpiry: null,
                  }
                : {}),
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
    });

    let emailed = false;
    if (parsed.data.isBlocked === true && targetBefore && !targetBefore.isBlocked) {
      try {
        const reason = parsed.data.blockReason || "";
        const content = `
          ${emailHeading("Dein Account wurde gesperrt")}
          ${emailText("Ein Administrator hat deinen TribeFinder Account gesperrt.")}
          ${emailHighlight(`<strong>Grund:</strong><br/>${reason.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}`)}
          ${emailText("Wenn du denkst, dass das ein Fehler ist, antworte bitte auf diese E-Mail oder kontaktiere den Support.")}
        `;
        const html = await emailTemplate(content, "Dein Account wurde gesperrt");
        const result = await sendEmail(updated.email, "Account gesperrt - TribeFinder", html);
        emailed = Boolean(result?.success);
      } catch {
        emailed = false;
      }
    }

    await recordAdminAudit({
      action: "USER_UPDATE",
      actorAdminId: session.user.id,
      targetUserId: updated.id,
      metadata: {
        role: parsed.data.role,
        isBlocked: parsed.data.isBlocked,
        emailVerified: parsed.data.emailVerified,
        ...(parsed.data.isBlocked === true
          ? {
              blockReason: parsed.data.blockReason,
              emailed,
            }
          : {}),
      },
    });

    return NextResponse.json({
      ...updated,
      emailVerified: updated.emailVerified ? updated.emailVerified.toISOString() : null,
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

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    await prisma.user.delete({ where: { id } });

    await recordAdminAudit({
      action: "USER_DELETE",
      actorAdminId: session.user.id,
      targetUserId: id,
      metadata: { email: target?.email ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fehler";
    return jsonBadRequest(msg);
  }
}
