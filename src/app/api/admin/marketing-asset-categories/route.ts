import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";

function normalizeSlug(v: unknown) {
  const raw = typeof v === "string" ? v.trim().toLowerCase() : "";
  const s = raw
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s;
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  try {
    const marketingAssetCategoryDelegate = (prisma as unknown as {
      marketingAssetCategory?: { findMany: (args: unknown) => Promise<unknown> };
    }).marketingAssetCategory;

    const items = (marketingAssetCategoryDelegate
      ? ((await marketingAssetCategoryDelegate.findMany({
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        })) as unknown as unknown[])
      : []) as unknown[];
    return NextResponse.json({ items });
  } catch (error) {
    return jsonServerError("Fehler beim Laden", error);
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  try {
    const marketingAssetCategoryDelegate = (prisma as unknown as {
      marketingAssetCategory?: { create: (args: unknown) => Promise<unknown> };
    }).marketingAssetCategory;

    const body = (await req.json().catch(() => null)) as
      | { slug?: unknown; title?: unknown; subtitle?: unknown; order?: unknown }
      | null;

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const subtitle = typeof body?.subtitle === "string" ? body.subtitle.trim() : "";
    const orderRaw = typeof body?.order === "number" ? body.order : Number(body?.order);
    const order = Number.isFinite(orderRaw) ? Math.trunc(orderRaw) : 0;

    if (!title) return jsonBadRequest("Titel fehlt");

    const slug = normalizeSlug(body?.slug) || normalizeSlug(title);
    if (!slug) return jsonBadRequest("Slug fehlt");

    if (!marketingAssetCategoryDelegate) {
      return jsonServerError("Marketing-Schema fehlt", null);
    }

    const item = await marketingAssetCategoryDelegate.create({
      data: {
        slug,
        title,
        subtitle: subtitle || null,
        order,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return jsonServerError("Fehler beim Anlegen", error);
  }
}
