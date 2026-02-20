import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { createTransferArchive } from "@/lib/serverTransfer";
import { recordAdminAudit } from "@/lib/adminAudit";

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const groupIds = Array.isArray(body?.groupIds) ? body.groupIds : [];
  const cleaned = groupIds.filter((v: unknown) => typeof v === "string").map((s: string) => s.trim()).filter(Boolean);

  if (cleaned.length === 0) {
    return NextResponse.json({ message: "groupIds fehlt" }, { status: 400 });
  }

  try {
    const result = await createTransferArchive(cleaned);

    await recordAdminAudit({
      action: "TRANSFER_EXPORT",
      actorAdminId: session.user.id,
      metadata: { groupIds: cleaned, filename: result.filename, size: result.size, createdAt: result.createdAt },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Export fehlgeschlagen", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
