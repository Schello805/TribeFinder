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
});
