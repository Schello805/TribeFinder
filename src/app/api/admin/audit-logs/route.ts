import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.enum(["desc", "asc"]).optional().default("desc"),

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

  const { page, pageSize, sort, action, actorEmail, targetEmail, backup, q } = parsed.data;

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
        orderBy: { createdAt: sort },
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
    return jsonServerError("Audit-Logs konnten nicht geladen werden", error);
  }
}
