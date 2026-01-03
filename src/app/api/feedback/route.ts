import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import logger from "@/lib/logger";
import { parseUserAgent } from "@/lib/userAgent";

const createFeedbackSchema = z.object({
  message: z.string().trim().min(3).max(5000),
  reporterName: z.string().trim().min(1).max(200).optional(),
  reporterEmail: z.string().trim().email().max(320).optional(),
  pageUrl: z.string().trim().url().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const parsed = createFeedbackSchema.parse(body);

    const userAgent = req.headers.get("user-agent") ?? undefined;
    const uaInfo = parseUserAgent(userAgent);

    const created = await prisma.feedback.create({
      data: {
        message: parsed.message,
        reporterName: parsed.reporterName,
        reporterEmail: parsed.reporterEmail,
        pageUrl: parsed.pageUrl,
        userAgent,
        browser: uaInfo.browser,
        os: uaInfo.os,
        userId: session?.user?.id ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ungültige Daten", errors: error.issues },
        { status: 400 }
      );
    }

    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { value: error };

    logger.error({ error: errorDetails }, "Error saving feedback");

    return NextResponse.json(
      {
        message: "Feedback konnte nicht gespeichert werden",
        details: process.env.NODE_ENV !== "production" ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}
