import { NextResponse } from "next/server";
import { writeFile, mkdir, realpath, stat } from "fs/promises";
import path from "path";
import crypto from "crypto";
import fs from "node:fs";
import logger from "@/lib/logger";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE, AllowedImageType } from "@/types";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

const resolveProjectRoot = () => {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const hasPackageJson = fs.existsSync(path.join(dir, "package.json"));
    const hasPrismaSchema = fs.existsSync(path.join(dir, "prisma", "schema.prisma"));
    if (hasPackageJson && hasPrismaSchema) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
};

const resolveUploadsDir = async () => {
  const uploadsDir = path.join(resolveProjectRoot(), "public", "uploads");
  try {
    return await realpath(uploadsDir);
  } catch {
    return uploadsDir;
  }
};

async function fileExists(p: string) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`upload:${clientId}`, RATE_LIMITS.upload);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  try {
    const formData = await req.formData();
    const fileEntry = formData.get('file');
    const file = fileEntry instanceof File ? fileEntry : null;

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      logger.warn({ size: file.size, maxSize: MAX_FILE_SIZE }, 'File too large');
      return NextResponse.json({ 
        error: `Datei zu groß. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
      logger.warn({ type: file.type }, 'Invalid file type');
      return NextResponse.json({ 
        error: `Ungültiger Dateityp. Erlaubt: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
      }, { status: 400 });
    }

    // Validate file extension matches MIME type
    const ext = path.extname(file.name).toLowerCase();
    const validExtensions: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
    };
    
    if (!validExtensions[file.type]?.includes(ext)) {
      logger.warn({ type: file.type, ext }, 'File extension mismatch');
      return NextResponse.json({ 
        error: 'Dateiendung stimmt nicht mit Dateityp überein' 
      }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate magic bytes (file signature)
    const magicBytes: Record<string, number[][]> = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP starts with RIFF)
    };

    const expectedSignatures = magicBytes[file.type];
    if (expectedSignatures) {
      const fileHeader = Array.from(buffer.slice(0, 12));
      const isValidSignature = expectedSignatures.some(sig => 
        sig.every((byte, i) => fileHeader[i] === byte)
      );
      
      if (!isValidSignature) {
        logger.warn({ type: file.type, header: fileHeader.slice(0, 8) }, 'Invalid file signature');
        return NextResponse.json({ 
          error: 'Datei-Signatur stimmt nicht mit Dateityp überein' 
        }, { status: 400 });
      }
    }

    const filename = `${crypto.randomUUID()}${ext}`;
    const projectRoot = resolveProjectRoot();
    const uploadDir = await resolveUploadsDir();

    const publicUploadsPath = path.join(projectRoot, "public", "uploads");
    const standaloneUploadsPath = path.join(projectRoot, ".next", "standalone", "public", "uploads");

    // Sicherstellen, dass das Verzeichnis existiert
    await mkdir(uploadDir, { recursive: true, mode: 0o755 });

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer, { mode: 0o644 });

    const exists = await fileExists(filepath);
    const publicUploadsExists = await fileExists(publicUploadsPath);
    const standaloneUploadsExists = await fileExists(standaloneUploadsPath);

    logger.info(
      {
        filename,
        size: file.size,
        type: file.type,
        projectRoot,
        uploadDir,
        filepath,
        exists,
        publicUploadsPath,
        publicUploadsExists,
        standaloneUploadsPath,
        standaloneUploadsExists,
        cwd: process.cwd(),
      },
      "File uploaded successfully"
    );
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    const uploadDir = await resolveUploadsDir();
    logger.error(
      {
        error,
        uploadDir,
        cwd: process.cwd(),
        nodeEnv: process.env.NODE_ENV,
      },
      'Upload error'
    );
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Fehler beim Upload',
        ...(process.env.NODE_ENV !== 'production' ? { details: message } : {}),
      },
      { status: 500 }
    );
  }
}
