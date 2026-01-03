import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "BRANDING_LOGO_URL" },
    });

    return NextResponse.json({ logoUrl: setting?.value || "" });
  } catch {
    return NextResponse.json({ logoUrl: "" }, { status: 200 });
  }
}
