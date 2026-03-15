import { NextResponse } from "next/server";
import { chmod, mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { resolveUploadsDir } from "@/lib/uploadFiles";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/rateLimit";
import { ALLOWED_IMAGE_TYPES, AllowedImageType } from "@/types";

const MAX_FEEDBACK_SCREENSHOT_SIZE = 5 * 1024 * 1024;

function isAllowedMime(mime: string): mime is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime);
}

function safeExtFromMime(mime: AllowedImageType) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/webp") return ".webp";
  return "";
}

export async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`feedback-upload:ip:${clientId}`, { limit: 10, windowSeconds: 600 });
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  try {
    const formData = await req.formData();

    const website = String(formData.get("website") || "").trim();
    if (website) {
      return NextResponse.json({ message: "Ungültige Anfrage" }, { status: 400 });
    }

    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File ? fileEntry : null;

    if (!file) {
      return NextResponse.json({ message: "Keine Datei hochgeladen" }, { status: 400 });
    }

    if (file.size > MAX_FEEDBACK_SCREENSHOT_SIZE) {
      return NextResponse.json(
        { message: `Datei zu groß. Maximum: ${MAX_FEEDBACK_SCREENSHOT_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (!isAllowedMime(file.type)) {
      return NextResponse.json(
        { message: `Ungültiger Dateityp. Erlaubt: ${ALLOWED_IMAGE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const magicBytes: Record<AllowedImageType, number[][]> = {
      "image/jpeg": [[0xff, 0xd8, 0xff]],
      "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
      "image/gif": [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
      ],
      "image/webp": [[0x52, 0x49, 0x46, 0x46]],
    };

    const expected = magicBytes[file.type];
    const header = Array.from(buffer.slice(0, 12));
    const ok = expected.some((sig) => sig.every((byte, i) => header[i] === byte));
    if (!ok) {
      return NextResponse.json({ message: "Datei-Signatur stimmt nicht" }, { status: 400 });
    }

    const uploadsDir = await resolveUploadsDir();
    const uploadDir = path.join(uploadsDir, "feedback");
    await mkdir(uploadDir, { recursive: true });

    const ext = safeExtFromMime(file.type);
    const filename = `feedback-${crypto.randomUUID()}${ext}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);
    await chmod(filepath, 0o644).catch(() => undefined);

    return NextResponse.json({ url: `/uploads/feedback/${filename}` }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Fehler beim Upload" }, { status: 500 });
  }
}
