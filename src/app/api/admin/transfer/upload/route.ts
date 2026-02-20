import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { recordAdminAudit } from "@/lib/adminAudit";
import { storeUploadedTransferArchive } from "@/lib/serverTransfer";

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  const isRawArchive =
    contentType.includes("application/gzip") ||
    contentType.includes("application/x-gzip") ||
    contentType.includes("application/octet-stream");

  if (isRawArchive) {
    const MAX_BYTES = 500 * 1024 * 1024;
    const buf = Buffer.from(await req.arrayBuffer());
    if (!buf.length) return NextResponse.json({ message: "Datei fehlt" }, { status: 400 });
    if (buf.length > MAX_BYTES) return NextResponse.json({ message: "Archiv ist zu groß" }, { status: 400 });

    const headerName = req.headers.get("x-filename") || "";
    const originalName = headerName && headerName.endsWith(".tar.gz") ? headerName : "transfer.tar.gz";

    try {
      const stored = await storeUploadedTransferArchive(originalName, buf);

      await recordAdminAudit({
        action: "TRANSFER_UPLOAD",
        actorAdminId: session.user.id,
        metadata: { originalName, filename: stored.filename, size: stored.size, createdAt: stored.createdAt },
      });

      return NextResponse.json(stored, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { message: "Upload fehlgeschlagen", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  }

  let form: FormData | null = null;
  try {
    form = await req.formData();
  } catch (e) {
    return NextResponse.json(
      { message: "Ungültige Formdaten", details: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
  if (!form) return NextResponse.json({ message: "Ungültige Formdaten" }, { status: 400 });

  const fileEntry = form.get("file");
  const file = fileEntry instanceof File ? fileEntry : null;
  if (!file) return NextResponse.json({ message: "Datei fehlt" }, { status: 400 });

  const originalName = typeof file.name === "string" ? file.name : "transfer.tar.gz";
  if (!originalName.endsWith(".tar.gz")) {
    return NextResponse.json({ message: "Nur .tar.gz Archive sind erlaubt" }, { status: 400 });
  }

  const MAX_BYTES = 500 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ message: "Archiv ist zu groß" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const stored = await storeUploadedTransferArchive(originalName, buf);

    await recordAdminAudit({
      action: "TRANSFER_UPLOAD",
      actorAdminId: session.user.id,
      metadata: { originalName, filename: stored.filename, size: stored.size, createdAt: stored.createdAt },
    });

    return NextResponse.json(stored, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Upload fehlgeschlagen", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
