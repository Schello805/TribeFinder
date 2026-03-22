import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";
import { chmod, mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { resolveUploadsDir } from "@/lib/uploadFiles";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

function extFromFileOrMime(originalName: string, mime: AllowedMime) {
  const ext = path.extname(originalName).toLowerCase();
  if (ext) return ext;
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "application/pdf") return ".pdf";
  return "";
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  try {
    const marketingAssetDelegate = (prisma as unknown as {
      marketingAsset?: { findMany: (args: unknown) => Promise<unknown> };
    }).marketingAsset;

    const items = (marketingAssetDelegate
      ? ((await marketingAssetDelegate.findMany({
          orderBy: { createdAt: "desc" },
          include: { category: true },
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
      marketingAssetCategory?: {
        findUnique: (args: unknown) => Promise<unknown>;
      };
    }).marketingAssetCategory;

    const marketingAssetDelegate = (prisma as unknown as {
      marketingAsset?: {
        create: (args: unknown) => Promise<unknown>;
      };
    }).marketingAsset;

    const formData = await req.formData();

    const categoryId = String(formData.get("categoryId") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();

    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File ? fileEntry : null;

    if (!categoryId) return jsonBadRequest("Kategorie fehlt");
    if (!title) return jsonBadRequest("Titel fehlt");
    if (!file) return jsonBadRequest("Keine Datei hochgeladen");

    if (!marketingAssetCategoryDelegate || !marketingAssetDelegate) {
      return jsonServerError("Marketing-Schema fehlt", null);
    }

    const category = (await marketingAssetCategoryDelegate.findUnique({
      where: { id: categoryId },
      select: { id: true, slug: true },
    })) as { id: string; slug: string } | null;
    if (!category) return jsonBadRequest("Ungültige Kategorie");

    if (file.size > MAX_FILE_SIZE) {
      return jsonBadRequest("Datei zu groß");
    }

    if (!isAllowedMime(file.type)) {
      return jsonBadRequest("Ungültiger Dateityp");
    }

    const uploadsDir = await resolveUploadsDir();
    const uploadDir = path.join(uploadsDir, "marketing");
    await mkdir(uploadDir, { recursive: true });

    const ext = extFromFileOrMime(file.name || "", file.type);
    const filename = `marketing-${category.slug}-${crypto.randomUUID()}${ext}`;
    const filepath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);
    await chmod(filepath, 0o644).catch(() => undefined);

    const fileUrl = `/uploads/marketing/${filename}`;

    const item = await marketingAssetDelegate.create({
      data: {
        categoryId: category.id,
        title,
        description: description || null,
        fileUrl,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return jsonServerError("Fehler beim Upload", error);
  }
}
