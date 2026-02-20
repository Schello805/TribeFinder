import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requireAdmin", () => {
  return {
    requireAdminSession: vi.fn(),
  };
});

vi.mock("@/lib/adminAudit", () => {
  return {
    recordAdminAudit: vi.fn(),
  };
});

vi.mock("@/lib/serverTransfer", () => {
  return {
    createTransferArchive: vi.fn(),
    storeUploadedTransferArchive: vi.fn(),
    inspectTransfer: vi.fn(),
    getTransferArchiveBuffer: vi.fn(),
    applyTransfer: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      group: { findMany: vi.fn() },
      event: { findMany: vi.fn() },
      user: { findMany: vi.fn() },
    },
  };
});

import { requireAdminSession } from "@/lib/requireAdmin";
import {
  createTransferArchive,
  storeUploadedTransferArchive,
  inspectTransfer,
  getTransferArchiveBuffer,
  applyTransfer,
} from "@/lib/serverTransfer";

import prisma from "@/lib/prisma";

type AdminSession = Awaited<ReturnType<typeof requireAdminSession>>;

describe("/api/admin/transfer/*", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("export returns 401 if not authorized", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce(null as unknown as AdminSession);
    const { POST } = await import("@/app/api/admin/transfer/export/route");
    const req = new Request("https://example.com/api/admin/transfer/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ groupIds: ["g1"] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("export creates archive for admin", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ user: { id: "a", role: "ADMIN" } } as unknown as AdminSession);
    vi.mocked(createTransferArchive).mockResolvedValueOnce(
      ({ filename: "x.tar.gz", size: 123, createdAt: 1 } as unknown) as Awaited<ReturnType<typeof createTransferArchive>>
    );

    vi.mocked((prisma as unknown as { group: { findMany: (...args: unknown[]) => unknown } }).group.findMany).mockResolvedValueOnce(
      [{ id: "g1" }, { id: "g2" }]
    );
    vi.mocked((prisma as unknown as { event: { findMany: (...args: unknown[]) => unknown } }).event.findMany).mockResolvedValueOnce([]);
    vi.mocked((prisma as unknown as { user: { findMany: (...args: unknown[]) => unknown } }).user.findMany).mockResolvedValueOnce([]);

    const { POST } = await import("@/app/api/admin/transfer/export/route");
    const req = new Request("https://example.com/api/admin/transfer/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ groupIds: ["g1", "g2"] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(vi.mocked(createTransferArchive)).toHaveBeenCalled();
  });

  it("inspect returns 401 if not authorized", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce(null as unknown as AdminSession);
    const { GET } = await import("@/app/api/admin/transfer/inspect/route");
    const req = new Request("https://example.com/api/admin/transfer/inspect?file=x.tar.gz");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("inspect returns payload for admin", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ user: { id: "a", role: "ADMIN" } } as unknown as AdminSession);
    vi.mocked(inspectTransfer).mockResolvedValueOnce({
      filename: "x.tar.gz",
      hasDataJson: true,
      uploadsFileCount: 0,
      counts: { users: 1, groups: 1, events: 0, memberships: 0 },
      missingUploads: [],
    } as unknown as Awaited<ReturnType<typeof inspectTransfer>>);

    const { GET } = await import("@/app/api/admin/transfer/inspect/route");
    const req = new Request("https://example.com/api/admin/transfer/inspect?file=x.tar.gz");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.filename).toBe("x.tar.gz");
  });

  it("download returns 401 if not authorized", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce(null as unknown as AdminSession);
    const { GET } = await import("@/app/api/admin/transfer/download/route");
    const req = new Request("https://example.com/api/admin/transfer/download?file=x.tar.gz");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("download returns archive bytes for admin", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ user: { id: "a", role: "ADMIN" } } as unknown as AdminSession);
    vi.mocked(getTransferArchiveBuffer).mockResolvedValueOnce(
      (Buffer.from("abc") as unknown) as Awaited<ReturnType<typeof getTransferArchiveBuffer>>
    );

    const { GET } = await import("@/app/api/admin/transfer/download/route");
    const req = new Request("https://example.com/api/admin/transfer/download?file=x.tar.gz");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/gzip");
  });

  it("apply returns 401 if not authorized", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce(null as unknown as AdminSession);
    const { POST } = await import("@/app/api/admin/transfer/apply/route");
    const req = new Request("https://example.com/api/admin/transfer/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: "x.tar.gz", actions: { users: {}, groups: {}, events: {}, memberships: {} } }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("apply calls transfer apply for admin", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ user: { id: "a", role: "ADMIN" } } as unknown as AdminSession);
    vi.mocked(applyTransfer).mockResolvedValueOnce(({ ok: true } as unknown) as Awaited<ReturnType<typeof applyTransfer>>);

    const { POST } = await import("@/app/api/admin/transfer/apply/route");
    const req = new Request("https://example.com/api/admin/transfer/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: "x.tar.gz", actions: { users: {}, groups: {}, events: {}, memberships: {} } }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(vi.mocked(applyTransfer)).toHaveBeenCalled();
  });

  it("upload returns 401 if not authorized", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce(null as unknown as AdminSession);
    const { POST } = await import("@/app/api/admin/transfer/upload/route");
    const req = new Request("https://example.com/api/admin/transfer/upload", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("upload stores archive for admin (multipart)", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ user: { id: "a", role: "ADMIN" } } as unknown as AdminSession);
    vi.mocked(storeUploadedTransferArchive).mockResolvedValueOnce(
      ({ filename: "up.tar.gz", size: 1, createdAt: 1 } as unknown) as Awaited<ReturnType<typeof storeUploadedTransferArchive>>
    );

    const { POST } = await import("@/app/api/admin/transfer/upload/route");

    const req = new Request("https://example.com/api/admin/transfer/upload", {
      method: "POST",
      headers: {
        "content-type": "application/gzip",
        "x-filename": "x.tar.gz",
      },
      body: new Uint8Array([97, 98, 99]).buffer,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(vi.mocked(storeUploadedTransferArchive)).toHaveBeenCalled();
  });
});
