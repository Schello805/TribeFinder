import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { z } from "zod";
import { jsonBadRequest, jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";

type RouteParams = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  archived: z.boolean(),
});

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.parse(body);

    const updated = await prisma.feedback.update({
      where: { id },
      data: { archivedAt: parsed.archived ? new Date() : null },
      select: { id: true, archivedAt: true },
    });

    return NextResponse.json({
      id: updated.id,
      archivedAt: updated.archivedAt ? updated.archivedAt.toISOString() : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest("Ungültige Daten", { errors: error.issues });
    }

    return jsonServerError("Feedback konnte nicht aktualisiert werden", error);
  }
}
