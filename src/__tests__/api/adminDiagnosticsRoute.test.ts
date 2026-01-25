import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/requireAdmin", () => {
  return {
    requireAdminSession: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      user: { count: vi.fn() },
      event: { count: vi.fn() },
      $queryRawUnsafe: vi.fn(),
      danceStyle: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
      tag: { create: vi.fn(), delete: vi.fn() },
      groupMember: { findUnique: vi.fn() },
      group: { count: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
      errorLog: { count: vi.fn() },
    },
  };
});

vi.mock("fs/promises", async () => {
  const actual = await vi.importActual<typeof import("fs/promises")>("fs/promises");
  return {
    ...actual,
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn().mockResolvedValue("ok"),
    unlink: vi.fn(),
    default: {},
  };
});

import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { GET } from "@/app/api/admin/diagnostics/route";

describe("GET /api/admin/diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authorized", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce(null as any);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("includes errors check", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ user: { id: "admin", role: "ADMIN" } } as any);

    vi.mocked((prisma as any).user.count).mockResolvedValueOnce(1);
    vi.mocked((prisma as any).group.count).mockResolvedValueOnce(1);
    vi.mocked((prisma as any).event.count).mockResolvedValueOnce(1);
    vi.mocked((prisma as any).$queryRawUnsafe).mockResolvedValueOnce([{ count: 1 }]);
    vi.mocked((prisma as any).danceStyle.count).mockResolvedValueOnce(1);
    vi.mocked((prisma as any).errorLog.count).mockResolvedValueOnce(2);

    // For the CRUD checks, just no-op and let them throw? We mock minimal to keep them from failing.
    vi.mocked((prisma as any).tag.create).mockResolvedValueOnce({ id: "t" });
    vi.mocked((prisma as any).group.create).mockResolvedValueOnce({ id: "g" });
    vi.mocked((prisma as any).group.update).mockResolvedValueOnce({});
    vi.mocked((prisma as any).group.findUnique).mockResolvedValueOnce({ tags: [{ id: "t" }], members: [{ userId: "admin" }] });
    vi.mocked((prisma as any).group.delete).mockResolvedValueOnce({});
    vi.mocked((prisma as any).tag.delete).mockResolvedValueOnce({});

    vi.mocked((prisma as any).danceStyle.create).mockResolvedValueOnce({ id: "ds" });
    vi.mocked((prisma as any).danceStyle.findUnique).mockResolvedValueOnce({ id: "ds" });
    vi.mocked((prisma as any).danceStyle.update).mockResolvedValueOnce({});
    vi.mocked((prisma as any).danceStyle.delete).mockResolvedValueOnce({});

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    const checks = json.checks as Array<{ id: string; status: string }>;
    const errorsCheck = checks.find((c) => c.id === "errors");
    expect(errorsCheck).toBeTruthy();
  });
});
