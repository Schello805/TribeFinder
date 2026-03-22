import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";
import { deleteUploadByPublicUrl } from "@/lib/uploadFiles";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  try {
    const marketingAssetDelegate = (prisma as unknown as {
      marketingAsset?: {
        findUnique: (args: unknown) => Promise<unknown>;
        delete: (args: unknown) => Promise<unknown>;
      };
    }).marketingAsset;

    if (!marketingAssetDelegate) {
      return jsonServerError("Marketing-Schema fehlt", null);
    }

    const existing = (await marketingAssetDelegate.findUnique({ where: { id } })) as { fileUrl?: string | null } | null;
    if (!existing) return NextResponse.json({ ok: true });

    await marketingAssetDelegate.delete({ where: { id } });

    const url = (existing.fileUrl || "").trim();
    await deleteUploadByPublicUrl(url).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonServerError("Fehler beim Löschen", error);
  }
}
