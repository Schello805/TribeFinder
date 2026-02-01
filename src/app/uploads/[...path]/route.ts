import fs from "fs";
import path from "path";
import { realpath, stat } from "fs/promises";
import { Readable } from "stream";

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

const contentTypeForExt = (ext: string) => {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await ctx.params;
  const uploadDir = await resolveUploadsDir();

  const joined = path.join(uploadDir, ...segments);
  const resolved = path.resolve(joined);
  const resolvedBase = path.resolve(uploadDir);

  if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const st = await stat(resolved);
    if (!st.isFile()) {
      return new Response("Not found", { status: 404 });
    }

    const ext = path.extname(resolved);
    const stream = fs.createReadStream(resolved);
    const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentTypeForExt(ext),
        "Content-Length": String(st.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
