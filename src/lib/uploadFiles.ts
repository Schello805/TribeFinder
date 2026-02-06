import { mkdir, realpath, stat, unlink } from "fs/promises";
import path from "path";
import fs from "node:fs";

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

export const resolveUploadsDir = async () => {
  const envDir = (process.env.UPLOADS_DIR || "").trim();
  const uploadsDir = envDir || path.join(resolveProjectRoot(), "public", "uploads");
  try {
    const resolved = await realpath(uploadsDir);
    await mkdir(resolved, { recursive: true });
    return resolved;
  } catch {
    await mkdir(uploadsDir, { recursive: true });
    return uploadsDir;
  }
};

const fileExists = async (p: string) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

export const deleteUploadByPublicUrl = async (url: string) => {
  const trimmed = (url || "").trim();
  if (!trimmed.startsWith("/uploads/")) return;

  const filename = trimmed.replace(/^\/uploads\//, "");
  if (!filename) return;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) return;

  const uploadsDir = await resolveUploadsDir();
  const resolvedUploads = path.resolve(uploadsDir);
  const candidate = path.resolve(uploadsDir, filename);
  if (!candidate.startsWith(resolvedUploads + path.sep)) return;

  if (!(await fileExists(candidate))) return;

  await unlink(candidate).catch(() => undefined);
};
