import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import fs from "node:fs";
import logger from "@/lib/logger";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE, AllowedImageType } from "@/types";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import sharp from "sharp";

const TARGET_W = 1200;
const TARGET_H = 300;

const resolveProjectRoot = () => {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
};

export async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`upload:banner:${clientId}`, RATE_LIMITS.upload);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  try {
    const formData = await req.formData();
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File ? fileEntry : null;
    const focusYRaw = formData.get("focusY");
    const focusYNum = typeof focusYRaw === "string" ? Number(focusYRaw) : NaN;
    const focusY = Number.isFinite(focusYNum) ? Math.min(100, Math.max(0, Math.round(focusYNum))) : 50;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei hochgeladen" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Datei zu groß. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
      return NextResponse.json(
        { error: `Ungültiger Dateityp. Erlaubt: ${ALLOWED_IMAGE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    const validExtensions: Record<string, string[]> = {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
    };

    if (!validExtensions[file.type]?.includes(ext)) {
      return NextResponse.json({ error: "Dateiendung stimmt nicht mit Dateityp überein" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const filename = `banner-${crypto.randomUUID()}.jpg`;
    const uploadDir = path.join(resolveProjectRoot(), "public/uploads");
    await mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);

    const pipeline = sharp(buffer).rotate().resize({ width: TARGET_W });
    const resizedMeta = await pipeline.metadata();

    let out: Buffer;
    if (!resizedMeta.height || resizedMeta.height <= TARGET_H) {
      out = await sharp(buffer)
        .rotate()
        .resize(TARGET_W, TARGET_H, { fit: "cover" })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
    } else {
      const maxTop = Math.max(0, resizedMeta.height - TARGET_H);
      const top = Math.min(maxTop, Math.max(0, Math.round((maxTop * focusY) / 100)));
      out = await pipeline
        .extract({ left: 0, top, width: TARGET_W, height: TARGET_H })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
    }

    await writeFile(filepath, out);

    logger.info({ filename, size: out.length, type: file.type }, "Banner uploaded successfully");
    return NextResponse.json({ url: `/uploads/${filename}`, width: TARGET_W, height: TARGET_H });
  } catch (error) {
    const uploadDir = path.join(resolveProjectRoot(), "public/uploads");
    logger.error(
      {
        error,
        uploadDir,
        cwd: process.cwd(),
        nodeEnv: process.env.NODE_ENV,
      },
      "Banner upload error"
    );

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Fehler beim Upload",
        ...(process.env.NODE_ENV !== "production" ? { details: message } : {}),
      },
      { status: 500 }
    );
  }
}
