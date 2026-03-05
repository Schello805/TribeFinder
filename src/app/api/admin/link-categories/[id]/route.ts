import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonUnauthorized } from "@/lib/apiResponse";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

type CategoryRow = { id: string; name: string; showOnMap: boolean };

function getCategoryDelegate(p: typeof prisma) {
  return (p as unknown as { externalLinkCategory?: unknown }).externalLinkCategory as
    | undefined
    | {
        findUnique: (args: unknown) => Promise<CategoryRow | null>;
        update: (args: unknown) => Promise<CategoryRow>;
        delete: (args: unknown) => Promise<CategoryRow>;
      };
}

function getExternalLinkDelegate(p: typeof prisma) {
  return (p as unknown as { externalLink?: unknown }).externalLink as
    | undefined
    | {
        count: (args: unknown) => Promise<number>;
        updateMany: (args: unknown) => Promise<{ count: number }>;
      };
}

function getSuggestionDelegate(p: typeof prisma) {
  return (p as unknown as { externalLinkSuggestion?: unknown }).externalLinkSuggestion as
    | undefined
    | {
        count: (args: unknown) => Promise<number>;
        updateMany: (args: unknown) => Promise<{ count: number }>;
      };
}

const patchSchema = z.object({
  action: z.enum(["RENAME", "SET_SHOW_ON_MAP"]),
  name: z.string().trim().min(2).max(40).optional(),
  showOnMap: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  const categoryDelegate = getCategoryDelegate(prisma);
  const linkDelegate = getExternalLinkDelegate(prisma);
  const suggestionDelegate = getSuggestionDelegate(prisma);

  if (!categoryDelegate || !linkDelegate || !suggestionDelegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonBadRequest("Validierungsfehler", { errors: parsed.error.flatten() });
  }

  const existing = await categoryDelegate.findUnique({ where: { id }, select: { id: true, name: true, showOnMap: true } });
  if (!existing) return NextResponse.json({ message: "Nicht gefunden" }, { status: 404 });

  if (parsed.data.action === "RENAME") {
    const newName = (parsed.data.name || "").trim();
    if (!newName) return jsonBadRequest("Validierungsfehler");

    const updated = await categoryDelegate.update({
      where: { id },
      data: { name: newName },
      select: { id: true, name: true, showOnMap: true },
    });

    // Propagate rename to existing links and suggestions (since those store category as string today)
    await linkDelegate.updateMany({ where: { category: existing.name }, data: { category: newName } });
    await suggestionDelegate.updateMany({ where: { category: existing.name }, data: { category: newName } });

    return NextResponse.json(updated);
  }

  if (parsed.data.action === "SET_SHOW_ON_MAP") {
    if (typeof parsed.data.showOnMap !== "boolean") return jsonBadRequest("Validierungsfehler");

    const updated = await categoryDelegate.update({
      where: { id },
      data: { showOnMap: parsed.data.showOnMap },
      select: { id: true, name: true, showOnMap: true },
    });
    return NextResponse.json(updated);
  }

  return jsonBadRequest("Validierungsfehler");
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  const categoryDelegate = getCategoryDelegate(prisma);
  const linkDelegate = getExternalLinkDelegate(prisma);
  const suggestionDelegate = getSuggestionDelegate(prisma);

  if (!categoryDelegate || !linkDelegate || !suggestionDelegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const existing = await categoryDelegate.findUnique({ where: { id }, select: { id: true, name: true, showOnMap: true } });
  if (!existing) return NextResponse.json({ message: "Nicht gefunden" }, { status: 404 });

  const usedLinks = await linkDelegate.count({ where: { category: existing.name } });
  const usedSuggestions = await suggestionDelegate.count({ where: { category: existing.name } });

  if (usedLinks > 0 || usedSuggestions > 0) {
    return NextResponse.json(
      {
        message:
          `Kategorie kann nicht gelöscht werden, weil sie verwendet wird (Links: ${usedLinks}, Vorschläge: ${usedSuggestions}). Bitte erst umbenennen oder die Links umstellen.`,
      },
      { status: 400 }
    );
  }

  await categoryDelegate.delete({ where: { id }, select: { id: true, name: true } });
  return NextResponse.json({ ok: true });
}
