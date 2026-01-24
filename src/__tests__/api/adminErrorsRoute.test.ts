import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/requireAdmin", () => {
  return {
    requireAdminSession: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      errorLog: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
  };
});

import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { GET, DELETE } from "@/app/api/admin/errors/route";

describe("/api/admin/errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authorized", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce(null as any);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns errors list for admin", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ user: { id: "admin", role: "ADMIN" } } as any);

    vi.mocked((prisma as any).errorLog.findMany).mockResolvedValueOnce([
      { id: "1", fingerprint: "f", message: "boom", count: 1, lastSeenAt: new Date().toISOString() },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.errors)).toBe(true);
    expect(json.errors[0].message).toBe("boom");
  });

  it("clears errors for admin", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ user: { id: "admin", role: "ADMIN" } } as any);
    vi.mocked((prisma as any).errorLog.deleteMany).mockResolvedValueOnce({ count: 3 });

    const res = await DELETE();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.deleted).toBe(3);
  });
});
