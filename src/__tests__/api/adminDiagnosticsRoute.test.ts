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

type AdminSession = Awaited<ReturnType<typeof requireAdminSession>>;
type PrismaMock = {
  user: { count: (args?: unknown) => unknown };
  group: {
    count: (args?: unknown) => unknown;
    create: (args?: unknown) => unknown;
    update: (args?: unknown) => unknown;
    findUnique: (args?: unknown) => unknown;
    delete: (args?: unknown) => unknown;
  };
  event: { count: (args?: unknown) => unknown };
  $queryRawUnsafe: (query: unknown) => unknown;
  danceStyle: {
    count: (args?: unknown) => unknown;
    create: (args?: unknown) => unknown;
    findUnique: (args?: unknown) => unknown;
    update: (args?: unknown) => unknown;
    delete: (args?: unknown) => unknown;
  };
  tag: { create: (args?: unknown) => unknown; delete: (args?: unknown) => unknown };
  errorLog: { count: (args?: unknown) => unknown };
};

describe("GET /api/admin/diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authorized", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce(null as unknown as AdminSession);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("includes errors check", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ user: { id: "admin", role: "ADMIN" } } as unknown as AdminSession);

    const prismaMock = prisma as unknown as PrismaMock;

    vi.mocked(prismaMock.user.count).mockResolvedValueOnce(1);
    vi.mocked(prismaMock.group.count).mockResolvedValueOnce(1);
    vi.mocked(prismaMock.event.count).mockResolvedValueOnce(1);
    vi.mocked(prismaMock.$queryRawUnsafe).mockResolvedValueOnce([{ count: 1 }]);
    vi.mocked(prismaMock.danceStyle.count).mockResolvedValueOnce(1);
    vi.mocked(prismaMock.errorLog.count).mockResolvedValueOnce(2);

    // For the CRUD checks, just no-op and let them throw? We mock minimal to keep them from failing.
    vi.mocked(prismaMock.tag.create).mockResolvedValueOnce({ id: "t" });
    vi.mocked(prismaMock.group.create).mockResolvedValueOnce({ id: "g" });
    vi.mocked(prismaMock.group.update).mockResolvedValueOnce({});
    vi.mocked(prismaMock.group.findUnique).mockResolvedValueOnce({ tags: [{ id: "t" }], members: [{ userId: "admin" }] });
    vi.mocked(prismaMock.group.delete).mockResolvedValueOnce({});
    vi.mocked(prismaMock.tag.delete).mockResolvedValueOnce({});

    vi.mocked(prismaMock.danceStyle.create).mockResolvedValueOnce({ id: "ds" });
    vi.mocked(prismaMock.danceStyle.findUnique).mockResolvedValueOnce({ id: "ds" });
    vi.mocked(prismaMock.danceStyle.update).mockResolvedValueOnce({});
    vi.mocked(prismaMock.danceStyle.delete).mockResolvedValueOnce({});

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    const checks = json.checks as Array<{ id: string; status: string }>;
    const errorsCheck = checks.find((c) => c.id === "errors");
    expect(errorsCheck).toBeTruthy();
  });
});
