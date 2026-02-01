import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/rateLimit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;

  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`groups:contact-email:${clientId}:${id}`, { limit: 5, windowSeconds: 60 });
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const group = await prisma.group.findUnique({
    where: { id },
    select: { contactEmail: true },
  });

  if (!group || !group.contactEmail) {
    return NextResponse.json({ message: "Keine Kontakt-E-Mail vorhanden" }, { status: 404 });
  }

  return NextResponse.json({ email: group.contactEmail });
}
