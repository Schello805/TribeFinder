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

type AdminSession = Awaited<ReturnType<typeof requireAdminSession>>;
type PrismaMock = { $queryRaw: (query: unknown) => unknown };

describe("GET /api/admin/system", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authorized", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce(null as unknown as AdminSession);

    const res = await GET();
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({ message: "Nicht autorisiert", error: "Nicht autorisiert" });
  });

  it("returns system info for admin and masks DATABASE_URL", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({
      user: { id: "admin", role: "ADMIN" },
    } as unknown as AdminSession);

    const prismaMock = prisma as unknown as PrismaMock;
    vi.mocked(prismaMock.$queryRaw).mockResolvedValueOnce([{ "1": 1 }]);

    process.env.DATABASE_URL = "postgresql://tribefinder:supersecret@localhost:5432/tribefinder?schema=public";

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.database.url.provider).toBe("postgresql");
    expect(json.database.url.maskedUrl).toContain("tribefinder:***@");
    expect(json.database.checks.dbPingOk).toBe(true);
  });
});
