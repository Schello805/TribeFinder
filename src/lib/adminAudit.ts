import prisma from "@/lib/prisma";

export async function recordAdminAudit(params: {
  action: string;
  actorAdminId?: string | null;
  targetUserId?: string | null;
  targetBackupFilename?: string | null;
  metadata?: unknown;
}) {
  try {
    const data = {
      action: params.action,
      ...(params.actorAdminId ? { actorAdminId: params.actorAdminId } : {}),
      targetUserId: params.targetUserId ?? null,
      targetBackupFilename: params.targetBackupFilename ?? null,
      metadata: params.metadata === undefined ? undefined : (params.metadata as never),
    };

    await prisma.adminAuditLog.create({
      data: data as never,
      select: { id: true },
    });
  } catch {
    // best-effort only
  }
}
