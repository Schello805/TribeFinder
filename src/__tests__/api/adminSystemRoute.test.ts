import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/requireAdmin", () => {
  return {
    requireAdminSession: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      $queryRaw: vi.fn(),
    },
  };
});

import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { GET } from "@/app/api/admin/system/route";

describe("GET /api/admin/system", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authorized", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce(null as any);

    const res = await GET();
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({ message: "Nicht autorisiert" });
  });

  it("returns system info for admin and masks DATABASE_URL", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({
      user: { id: "admin", role: "ADMIN" },
    } as any);

    vi.mocked((prisma as any).$queryRaw).mockResolvedValueOnce([{ "1": 1 }]);

    process.env.DATABASE_URL = "postgresql://tribefinder:supersecret@localhost:5432/tribefinder?schema=public";

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.database.url.provider).toBe("postgresql");
    expect(json.database.url.maskedUrl).toContain("tribefinder:***@");
    expect(json.database.checks.dbPingOk).toBe(true);
  });
});
