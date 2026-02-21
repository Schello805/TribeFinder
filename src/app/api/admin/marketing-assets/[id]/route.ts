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
    const existing = await prisma.marketingAsset.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ ok: true });

    await prisma.marketingAsset.delete({ where: { id } });

    const url = (existing.fileUrl || "").trim();
    await deleteUploadByPublicUrl(url).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonServerError("Fehler beim Löschen", error);
  }
}
