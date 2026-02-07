import { NextResponse } from "next/server";
import { getUserLastSeen, ONLINE_WINDOW_MS } from "@/lib/presence";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = (url.searchParams.get("userId") || "").trim();
  if (!userId) return NextResponse.json({ message: "userId fehlt" }, { status: 400 });

  const now = Date.now();
  const lastSeen = getUserLastSeen(userId, now);
  const online = lastSeen !== null && now - lastSeen <= ONLINE_WINDOW_MS;

  return NextResponse.json({
    userId,
    online,
    lastSeen,
    windowMinutes: 5,
  });
}
