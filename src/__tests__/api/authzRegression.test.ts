import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => {
  return {
    getServerSession: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      marketplaceListing: {
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      group: {
        findUnique: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
      groupThread: {
        findUnique: vi.fn(),
      },
      groupMember: {
        findUnique: vi.fn(),
      },
      groupThreadReadState: {
        upsert: vi.fn(),
      },
      groupThreadMessage: {
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";

type Session = Awaited<ReturnType<typeof getServerSession>>;

describe("AuthZ regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies marketplace listing update for non-owner non-admin", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "u2", role: "USER" },
    } as unknown as Session);

    const prismaMock = prisma as unknown as {
      marketplaceListing: {
        findUnique: (args: unknown) => unknown;
        update: (args: unknown) => unknown;
      };
    };

    vi.mocked(prismaMock.marketplaceListing.findUnique).mockResolvedValueOnce({
      id: "l1",
      ownerId: "u1",
    });

    const { PUT } = await import("@/app/api/marketplace/[id]/route");

    const req = new Request("https://example.com/api/marketplace/l1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "l1" }) });
    expect(res.status).toBe(403);
  });

  it("denies marketplace listing delete for non-owner non-admin", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "u2", role: "USER" },
    } as unknown as Session);

    const prismaMock = prisma as unknown as {
      marketplaceListing: {
        findUnique: (args: unknown) => unknown;
        delete: (args: unknown) => unknown;
      };
    };

    vi.mocked(prismaMock.marketplaceListing.findUnique).mockResolvedValueOnce({
      id: "l1",
      ownerId: "u1",
    });

    const { DELETE } = await import("@/app/api/marketplace/[id]/route");

    const req = new Request("https://example.com/api/marketplace/l1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "l1" }) });
    expect(res.status).toBe(403);
    expect(vi.mocked(prismaMock.marketplaceListing.delete)).not.toHaveBeenCalled();
  });

  it("denies thread access for non-member non-creator", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "u2" },
    } as unknown as Session);

    const prismaMock = prisma as unknown as {
      groupThread: { findUnique: (args: unknown) => unknown };
      groupMember: { findUnique: (args: unknown) => unknown };
      groupThreadReadState: { upsert: (args: unknown) => unknown };
    };

    vi.mocked(prismaMock.groupThread.findUnique).mockResolvedValueOnce({
      id: "t1",
      groupId: "g1",
      createdByUserId: "u1",
    });

    vi.mocked(prismaMock.groupMember.findUnique).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/messages/threads/[threadId]/route");

    const req = new Request("https://example.com/api/messages/threads/t1", { method: "GET" });
    const res = await GET(req, { params: Promise.resolve({ threadId: "t1" }) });

    expect(res.status).toBe(403);
    expect(vi.mocked(prismaMock.groupThreadReadState.upsert)).not.toHaveBeenCalled();
  });

  it("denies group update for non-owner and non-admin-member", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "u2", role: "USER" },
    } as unknown as Session);

    const prismaMock = prisma as unknown as {
      group: {
        findUnique: (args: unknown) => unknown;
        update: (args: unknown) => unknown;
      };
      groupMember: { findUnique: (args: unknown) => unknown };
    };

    vi.mocked(prismaMock.group.findUnique).mockResolvedValueOnce({ ownerId: "u1" });
    vi.mocked(prismaMock.groupMember.findUnique).mockResolvedValueOnce(null);

    const { PUT } = await import("@/app/api/groups/[id]/route");

    const req = new Request("https://example.com/api/groups/g1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "x" }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "g1" }) });
    expect(res.status).toBe(403);
    expect(vi.mocked(prismaMock.group.update)).not.toHaveBeenCalled();
  });

  it("denies group delete for non-owner and non-admin-member", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "u2", role: "USER" },
    } as unknown as Session);

    const prismaMock = prisma as unknown as {
      group: {
        findUnique: (args: unknown) => unknown;
        delete: (args: unknown) => unknown;
      };
      groupMember: { findUnique: (args: unknown) => unknown };
    };

    vi.mocked(prismaMock.group.findUnique).mockResolvedValueOnce({ ownerId: "u1" });
    vi.mocked(prismaMock.groupMember.findUnique).mockResolvedValueOnce(null);

    const { DELETE } = await import("@/app/api/groups/[id]/route");

    const req = new Request("https://example.com/api/groups/g1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "g1" }) });

    expect(res.status).toBe(403);
    expect(vi.mocked(prismaMock.group.delete)).not.toHaveBeenCalled();
  });

  it("denies editing a thread message when not the author", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "u2" },
    } as unknown as Session);

    const prismaMock = prisma as unknown as {
      groupThread: { findUnique: (args: unknown) => unknown };
      groupMember: { findUnique: (args: unknown) => unknown };
      groupThreadMessage: {
        findUnique: (args: unknown) => unknown;
        update: (args: unknown) => unknown;
      };
      groupThreadReadState: { findMany: (args: unknown) => unknown };
    };

    vi.mocked(prismaMock.groupThread.findUnique).mockResolvedValueOnce({
      id: "t1",
      groupId: "g1",
      createdByUserId: "u1",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    vi.mocked(prismaMock.groupMember.findUnique).mockResolvedValueOnce({ status: "APPROVED" });
    vi.mocked(prismaMock.groupThreadMessage.findUnique).mockResolvedValueOnce({
      id: "m1",
      threadId: "t1",
      authorId: "u1",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    const { PATCH } = await import("@/app/api/messages/threads/[threadId]/messages/[messageId]/route");

    const req = new Request("https://example.com/api/messages/threads/t1/messages/m1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "hi" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ threadId: "t1", messageId: "m1" }) });

    expect(res.status).toBe(403);
    expect(vi.mocked(prismaMock.groupThreadMessage.update)).not.toHaveBeenCalled();
  });

  it("denies deleting a thread message when not the author", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "u2" },
    } as unknown as Session);

    const prismaMock = prisma as unknown as {
      groupThread: { findUnique: (args: unknown) => unknown };
      groupMember: { findUnique: (args: unknown) => unknown };
      groupThreadMessage: {
        findUnique: (args: unknown) => unknown;
        delete: (args: unknown) => unknown;
      };
    };

    vi.mocked(prismaMock.groupThread.findUnique).mockResolvedValueOnce({
      id: "t1",
      groupId: "g1",
      createdByUserId: "u1",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    vi.mocked(prismaMock.groupMember.findUnique).mockResolvedValueOnce({ status: "APPROVED" });
    vi.mocked(prismaMock.groupThreadMessage.findUnique).mockResolvedValueOnce({
      id: "m1",
      threadId: "t1",
      authorId: "u1",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    const { DELETE } = await import("@/app/api/messages/threads/[threadId]/messages/[messageId]/route");

    const req = new Request("https://example.com/api/messages/threads/t1/messages/m1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ threadId: "t1", messageId: "m1" }) });

    expect(res.status).toBe(403);
    expect(vi.mocked(prismaMock.groupThreadMessage.delete)).not.toHaveBeenCalled();
  });
});
