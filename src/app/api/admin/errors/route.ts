import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonUnauthorized } from "@/lib/apiResponse";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const prismaAny = prisma as any;

  // If Prisma Client isn't generated yet or migration not applied, do not break the admin UI.
  if (!prismaAny?.errorLog?.findMany) {
    return NextResponse.json({ errors: [], message: "ErrorLog ist noch nicht verfügbar (Prisma generate/Migration fehlt)." });
  }

  try {
    const errors = await prismaAny.errorLog.findMany({
      orderBy: { lastSeenAt: "desc" },
      take: 100,
      select: {
        id: true,
        fingerprint: true,
        route: true,
        status: true,
        message: true,
        details: true,
        stack: true,
        count: true,
        firstSeenAt: true,
        lastSeenAt: true,
        lastEmailSentAt: true,
      },
    });

    return NextResponse.json({ errors });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err?.code === "P2021" || err?.code === "P2022") {
      return NextResponse.json({ errors: [], message: "ErrorLog Tabelle fehlt (Migration noch nicht gelaufen?)" });
    }
    throw e;
  }
}

export async function DELETE() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const prismaAny = prisma as any;

  if (!prismaAny?.errorLog?.deleteMany) {
    return NextResponse.json({ deleted: 0, message: "ErrorLog ist noch nicht verfügbar (Prisma generate/Migration fehlt)." });
  }

  try {
    const result = await prismaAny.errorLog.deleteMany({});
    return NextResponse.json({ deleted: result.count });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err?.code === "P2021" || err?.code === "P2022") {
      return NextResponse.json({ deleted: 0, message: "ErrorLog Tabelle fehlt (Migration noch nicht gelaufen?)" });
    }
    throw e;
  }
}
