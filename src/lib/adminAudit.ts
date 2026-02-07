import prisma from "@/lib/prisma";

export async function recordAdminAudit(params: {
  action: string;
  actorAdminId: string;
  targetUserId?: string | null;
  targetBackupFilename?: string | null;
  metadata?: unknown;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        action: params.action,
        actorAdminId: params.actorAdminId,
        targetUserId: params.targetUserId ?? null,
        targetBackupFilename: params.targetBackupFilename ?? null,
        metadata: params.metadata === undefined ? undefined : (params.metadata as never),
      },
      select: { id: true },
    });
  } catch {
    // best-effort only
  }
}
