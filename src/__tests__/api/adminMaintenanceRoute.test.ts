import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requireAdmin", () => {
  return {
    requireAdminSession: vi.fn(),
  };
});

vi.mock("fs/promises", async () => {
  const actual = await vi.importActual<typeof import("fs/promises")>("fs/promises");
  return {
    ...actual,
    readFile: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(),
    default: {},
  };
});

import { requireAdminSession } from "@/lib/requireAdmin";
import * as fsPromises from "fs/promises";

type AdminSession = Awaited<ReturnType<typeof requireAdminSession>>;

describe("/api/admin/maintenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MAINTENANCE_MODE;
  });

  it("GET returns 401 if not authorized", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce(null as unknown as AdminSession);

    const { GET } = await import("@/app/api/admin/maintenance/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns enabled flags for admin", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ user: { id: "a", role: "ADMIN" } } as unknown as AdminSession);

    // simulate .env exists one level up (findEnvPath walks up)
    vi.mocked(fsPromises.access).mockResolvedValueOnce(undefined);
    vi.mocked(fsPromises.readFile).mockResolvedValueOnce('MAINTENANCE_MODE="true"\n');

    process.env.MAINTENANCE_MODE = "false";

    const { GET } = await import("@/app/api/admin/maintenance/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.enabled).toBe(false);
    expect(json.envFileEnabled).toBe(true);
    expect(typeof json.envPath).toBe("string");
    expect(json.restartRequired).toBe(true);
  });

  it("POST upserts MAINTENANCE_MODE and returns ok", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ user: { id: "a", role: "ADMIN" } } as unknown as AdminSession);

    vi.mocked(fsPromises.access).mockResolvedValueOnce(undefined);
    vi.mocked(fsPromises.readFile).mockResolvedValueOnce('FOO="bar"\nMAINTENANCE_MODE="false"\n');

    const req = new Request("http://localhost/api/admin/maintenance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });

    const { POST } = await import("@/app/api/admin/maintenance/route");
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.enabled).toBe(true);

    expect(vi.mocked(fsPromises.writeFile)).toHaveBeenCalledTimes(1);
    const writeArgs = vi.mocked(fsPromises.writeFile).mock.calls[0] as unknown as [string, string];
    expect(writeArgs[1]).toContain('MAINTENANCE_MODE="true"');
  });
});
