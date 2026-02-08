import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const isMaintenanceEnabled = () => {
  const v = (process.env.MAINTENANCE_MODE || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
};

const isReadMethod = (method: string) => {
  const m = method.toUpperCase();
  return m === "GET" || m === "HEAD" || m === "OPTIONS";
};

export async function proxy(req: NextRequest) {
  if (!isMaintenanceEnabled()) return NextResponse.next();

  if (isReadMethod(req.method)) return NextResponse.next();

  const pathname = req.nextUrl.pathname;

  // Admins can always write, even during maintenance mode (e.g. to disable it).
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if ((token as { role?: string } | null)?.role === "ADMIN") {
      return NextResponse.next();
    }
  } catch {
    // If token parsing fails, fall back to normal maintenance behavior.
  }

  // Always allow NextAuth operations (login, callbacks, etc.)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow online presence pings even during maintenance mode.
  // This endpoint is intentionally lightweight and does not mutate persistent data.
  if (pathname === "/api/presence/ping") {
    return NextResponse.next();
  }

  return NextResponse.json(
    {
      error: "Maintenance Mode",
      message:
        "Wartungsmodus ist aktiv. Änderungen sind vorübergehend deaktiviert. Bitte später erneut versuchen.",
    },
    {
      status: 503,
      headers: {
        "Retry-After": "300",
      },
    }
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|robots.txt|sitemap.xml).*)",
  ],
};
