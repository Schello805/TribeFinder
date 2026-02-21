import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

type MarketingAssetType = "LOGO" | "HEADER" | "POSTER";

function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

function sanitizeAssetType(v: unknown): MarketingAssetType | null {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  if (s === "LOGO" || s === "HEADER" || s === "POSTER") return s;
  return null;
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
    const items = await prisma.marketingAsset.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ items });
  } catch (error) {
    return jsonServerError("Fehler beim Laden", error);
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  try {
    const formData = await req.formData();

    const type = sanitizeAssetType(formData.get("type"));
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();

    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File ? fileEntry : null;

    if (!type) return jsonBadRequest("Ungültiger Typ");
    if (!title) return jsonBadRequest("Titel fehlt");
    if (!file) return jsonBadRequest("Keine Datei hochgeladen");

    if (file.size > MAX_FILE_SIZE) {
      return jsonBadRequest("Datei zu groß");
    }

    if (!isAllowedMime(file.type)) {
      return jsonBadRequest("Ungültiger Dateityp");
    }

    const uploadDir = path.join(process.cwd(), "public/uploads/marketing");
    await mkdir(uploadDir, { recursive: true });

    const ext = extFromFileOrMime(file.name || "", file.type);
    const filename = `marketing-${type.toLowerCase()}-${crypto.randomUUID()}${ext}`;
    const filepath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const fileUrl = `/uploads/marketing/${filename}`;

    const item = await prisma.marketingAsset.create({
      data: {
        type,
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
