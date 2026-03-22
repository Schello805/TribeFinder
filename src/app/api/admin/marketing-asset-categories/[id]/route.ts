import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  try {
    const marketingAssetCategoryDelegate = (prisma as unknown as {
      marketingAssetCategory?: {
        delete: (args: unknown) => Promise<unknown>;
        findUnique: (args: unknown) => Promise<unknown>;
      };
      marketingAsset?: {
        count: (args: unknown) => Promise<unknown>;
      };
    }).marketingAssetCategory;

    const marketingAssetDelegate = (prisma as unknown as {
      marketingAsset?: {
        count: (args: unknown) => Promise<unknown>;
      };
    }).marketingAsset;

    if (!marketingAssetCategoryDelegate || !marketingAssetDelegate) {
      return jsonServerError("Marketing-Schema fehlt", null);
    }

    const existing = (await marketingAssetCategoryDelegate.findUnique({
      where: { id },
      select: { id: true },
    })) as { id: string } | null;

    if (!existing) return NextResponse.json({ ok: true });

    const usedCount = (await marketingAssetDelegate.count({
      where: { categoryId: id },
    })) as number;

    if (usedCount > 0) {
      return jsonBadRequest("Kategorie kann nicht gelöscht werden, solange Dateien zugeordnet sind.");
    }

    await marketingAssetCategoryDelegate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonServerError("Fehler beim Löschen", error);
  }
}
