import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

function extForMime(mime: AllowedMime): string {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return jsonBadRequest("Keine Datei hochgeladen");
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonBadRequest("Datei zu groß");
    }

    if (!isAllowedMime(file.type)) {
      return jsonBadRequest("Ungültiger Dateityp");
    }

    const uploadDir = path.join(process.cwd(), "public/uploads");
    await mkdir(uploadDir, { recursive: true });

    const ext = extForMime(file.type);
    const filename = `branding-logo-${crypto.randomUUID()}${ext}`;
    const filepath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const logoUrl = `/uploads/${filename}`;

    const oldSetting = await prisma.systemSetting.findUnique({ where: { key: "BRANDING_LOGO_URL" } });

    await prisma.systemSetting.upsert({
      where: { key: "BRANDING_LOGO_URL" },
      update: { value: logoUrl },
      create: { key: "BRANDING_LOGO_URL", value: logoUrl },
    });

    if (oldSetting?.value && oldSetting.value.startsWith("/uploads/")) {
      const oldFilename = oldSetting.value.replace("/uploads/", "");
      const oldPath = path.join(uploadDir, oldFilename);
      if (!oldFilename.includes("..") && oldFilename !== ".gitkeep") {
        unlink(oldPath).catch(() => undefined);
      }
    }

    return NextResponse.json({ logoUrl });
  } catch (error) {
    return jsonServerError("Fehler beim Upload", error);
  }
}

export async function DELETE() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: "BRANDING_LOGO_URL" } });

    if (setting?.value && setting.value.startsWith("/uploads/")) {
      const uploadDir = path.join(process.cwd(), "public/uploads");
      const oldFilename = setting.value.replace("/uploads/", "");
      const oldPath = path.join(uploadDir, oldFilename);
      if (!oldFilename.includes("..") && oldFilename !== ".gitkeep") {
        await unlink(oldPath).catch(() => undefined);
      }
    }

    await prisma.systemSetting.delete({ where: { key: "BRANDING_LOGO_URL" } }).catch(() => undefined);

    return NextResponse.json({ logoUrl: "" });
  } catch (error) {
    return jsonServerError("Fehler beim Entfernen", error);
  }
}
