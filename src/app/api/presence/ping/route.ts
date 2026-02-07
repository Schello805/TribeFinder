import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordUserSeen, recordVisitorSeen } from "@/lib/presence";

function getOrCreateVisitorId(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)tf_vid=([^;]+)/);
  const existing = match?.[1] ? decodeURIComponent(match[1]) : "";
  if (existing) return { visitorId: existing, isNew: false };

  const visitorId = crypto.randomBytes(16).toString("hex");
  return { visitorId, isNew: true };
}

export async function POST(req: Request) {
  const { visitorId, isNew } = getOrCreateVisitorId(req);
  const now = Date.now();

  recordVisitorSeen(visitorId, now);

  const session = await getServerSession(authOptions).catch(() => null);
  const userId = session?.user?.id;
  if (userId) recordUserSeen(userId, now);

  const res = NextResponse.json({ ok: true, now, onlineWindowMs: 5 * 60 * 1000 });

  if (isNew) {
    res.cookies.set({
      name: "tf_vid",
      value: visitorId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return res;
}
