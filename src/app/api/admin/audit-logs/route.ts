import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.enum(["desc", "asc"]).optional().default("desc"),
  sortField: z.enum(["createdAt", "action", "actorEmail", "targetEmail"]).optional(),
  sortDir: z.enum(["desc", "asc"]).optional(),

  actionsOnly: z.coerce.boolean().optional().default(false),

  action: z.string().trim().min(1).optional(),
  actorEmail: z.string().trim().min(1).optional(),
  targetEmail: z.string().trim().min(1).optional(),
  backup: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
});

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return jsonBadRequest("Validierungsfehler", { errors: parsed.error.flatten() });
  }

  const { page, pageSize, sort, sortField, sortDir, actionsOnly, action, actorEmail, targetEmail, backup, q } = parsed.data;

  if (actionsOnly) {
    try {
      const rows = await prisma.adminAuditLog.findMany({
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" },
        take: 200,
      });

      return NextResponse.json({
        actions: (rows as Array<{ action: string }>).map((r) => r.action),
      });
    } catch (error) {
      return jsonServerError("Audit-Log Aktionen konnten nicht geladen werden", error);
    }
  }

  const effectiveSortField = sortField ?? "createdAt";
  const effectiveSortDir = sortDir ?? sort;

  const orderBy =
    effectiveSortField === "createdAt" || effectiveSortField === "action"
      ? ({ [effectiveSortField]: effectiveSortDir } as Record<string, unknown>)
      : effectiveSortField === "actorEmail"
        ? ({ actorAdmin: { email: effectiveSortDir } } as Record<string, unknown>)
        : ({ targetUser: { email: effectiveSortDir } } as Record<string, unknown>);

  const where: Record<string, unknown> = {
    ...(action ? { action } : {}),
    ...(backup ? { targetBackupFilename: { contains: backup, mode: "insensitive" } } : {}),
    ...(actorEmail ? { actorAdmin: { email: { contains: actorEmail, mode: "insensitive" } } } : {}),
    ...(targetEmail ? { targetUser: { email: { contains: targetEmail, mode: "insensitive" } } } : {}),
  };

  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { targetBackupFilename: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [total, items] = await Promise.all([
      prisma.adminAuditLog.count({ where: where as never }),
      prisma.adminAuditLog.findMany({
        where: where as never,
        orderBy: orderBy as never,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          action: true,
          targetBackupFilename: true,
          metadata: true,
          createdAt: true,
          actorAdmin: { select: { id: true, name: true, email: true } },
          targetUser: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({
      page,
      pageSize,
      total,
      items: items.map((i: (typeof items)[number]) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021" || error.code === "P2022") {
        const msg =
          "Audit-Logs konnten nicht geladen werden: Datenbank-Schema ist nicht aktuell (AdminAuditLog fehlt). Bitte lokal `npx prisma db push` ausführen.";
        return jsonServerError(msg, error);
      }
    }
    return jsonServerError("Audit-Logs konnten nicht geladen werden", error);
  }
}
