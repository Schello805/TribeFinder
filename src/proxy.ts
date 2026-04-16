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

const parseContentLength = (value: string | null) => {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const getMaxBodyBytesForPath = (pathname: string) => {
  // Default write limit for most endpoints.
  const DEFAULT_MAX = 25 * 1024 * 1024; // 25 MB

  // Admin-only large uploads.
  if (pathname === "/api/admin/backups/upload") return 500 * 1024 * 1024; // 500 MB
  if (pathname === "/api/admin/branding/hero-logo") return 105 * 1024 * 1024; // 100 MB + overhead
  if (pathname === "/api/admin/branding/logo") return 6 * 1024 * 1024; // 5 MB + overhead

  // Other uploads.
  if (pathname === "/api/admin/marketing-assets") return 20 * 1024 * 1024;
  if (pathname === "/api/upload") return 20 * 1024 * 1024;
  if (pathname === "/api/upload/banner") return 20 * 1024 * 1024;
  if (pathname === "/api/feedback/upload") return 20 * 1024 * 1024;

  return DEFAULT_MAX;
};

const isPublicPagePath = (pathname: string) => {
  if (pathname === "/") return true;
  if (pathname === "/changelog") return true;
  if (pathname === "/marketing") return true;
  if (pathname === "/hilfe") return true;
  if (pathname === "/impressum") return true;
  if (pathname === "/datenschutz") return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/uploads")) return true;
  if (pathname.startsWith("/map")) return true;
  if (pathname.startsWith("/groups")) return true;
  if (pathname.startsWith("/taenzerinnen")) return true;
  if (pathname.startsWith("/users")) return true;
  if (pathname.startsWith("/marketplace")) return true;
  if (pathname.startsWith("/events")) return true;
  return false;
};

const isPublicApiPath = (pathname: string, method: string) => {
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname === "/api/presence/ping") return true;
  if (pathname === "/api/register") return true;

  if (pathname === "/api/feedback") return true;
  if (pathname === "/api/feedback/upload") return true;

  if (!isReadMethod(method)) return false;

  if (pathname === "/api/branding") return true;
  if (pathname === "/api/tags") return true;
  if (pathname === "/api/groups") return true;
  if (/^\/api\/groups\/[^/]+$/.test(pathname)) return true;
  if (/^\/api\/groups\/[^/]+\/like$/.test(pathname)) return true;
  if (pathname === "/api/taenzerinnen") return true;
  if (pathname === "/api/marketplace") return true;
  if (/^\/api\/marketplace\/[^/]+$/.test(pathname)) return true;
  if (pathname === "/api/events") return true;
  if (/^\/api\/events\/[^/]+$/.test(pathname)) return true;
  if (pathname === "/api/event-countries") return true;
  if (pathname === "/api/dance-styles") return true;
  if (pathname === "/api/geocode") return true;
  return false;
};

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Basic body-size guard (only works when Content-Length is present).
  // This mitigates accidental or malicious large uploads to endpoints that don't expect them.
  if (pathname.startsWith("/api") && !isReadMethod(req.method)) {
    const len = parseContentLength(req.headers.get("content-length"));
    if (len != null) {
      const max = getMaxBodyBytesForPath(pathname);
      if (len > max) {
        return NextResponse.json(
          {
            message: "Request ist zu groß",
            details: `Maximal erlaubt: ${Math.floor(max / 1024 / 1024)}MB`,
          },
          { status: 413 }
        );
      }
    }
  }

  if (pathname.startsWith("/api")) {
    if (isPublicApiPath(pathname, req.method)) {
      // continue
    } else {
      let token = null as unknown;
      try {
        token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      } catch {
        token = null;
      }
      if (!token) {
        return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
      }
    }
  } else {
    if (!isPublicPagePath(pathname)) {
      let token = null as unknown;
      try {
        token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      } catch {
        token = null;
      }
      if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = "/auth/signin";
        url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
        return NextResponse.redirect(url);
      }
    }
  }

  if (!isMaintenanceEnabled()) return NextResponse.next();

  if (isReadMethod(req.method)) return NextResponse.next();

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
