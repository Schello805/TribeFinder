import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { applyTransfer, type TransferApplyRequest } from "@/lib/serverTransfer";
import { recordAdminAudit } from "@/lib/adminAudit";

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as TransferApplyRequest | null;
  if (!body?.filename) return NextResponse.json({ message: "filename fehlt" }, { status: 400 });

  try {
    const result = await applyTransfer(body);

    await recordAdminAudit({
      action: "TRANSFER_APPLY",
      actorAdminId: session.user.id,
      metadata: { filename: body.filename, result },
    });

    return NextResponse.json(result);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes("Ungültiger") || details.includes("nicht gefunden") ? 400 : 500;
    return NextResponse.json({ message: "Import fehlgeschlagen", details }, { status });
  }
}
