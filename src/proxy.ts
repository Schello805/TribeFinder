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

  // Always allow NextAuth operations (login, callbacks, etc.)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Only guard APIs; normal page navigation is read-only anyway.
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow admins to write even in maintenance mode.
  try {
    const token = await getToken({ req });
    const role = (token as { role?: string } | null)?.role;
    if (role === "ADMIN") {
      return NextResponse.next();
    }
  } catch {
    // If token parsing fails, treat as non-admin.
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
  matcher: ["/api/:path*"],
};
