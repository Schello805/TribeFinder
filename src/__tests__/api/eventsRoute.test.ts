import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => {
  return {
    getServerSession: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      group: { findUnique: vi.fn() },
      groupMember: { findUnique: vi.fn() },
      event: { create: vi.fn() },
    },
  };
});

vi.mock("@/lib/notifications", () => {
  return {
    notifyUsersAboutNewEvent: vi.fn(() => Promise.resolve()),
  };
});

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { POST } from "@/app/api/events/route";

type Session = Awaited<ReturnType<typeof getServerSession>>;

type PrismaMock = {
  group: { findUnique: (args: unknown) => unknown };
  groupMember: { findUnique: (args: unknown) => unknown };
  event: { create: (args: unknown) => unknown };
};

describe("POST /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as unknown as Session);

    const req = new Request("https://example.com/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("creates an event with danceStyles when danceStyleIds are provided", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "u1", role: "USER" },
    } as unknown as Session);

    const prismaMock = prisma as unknown as PrismaMock;

    vi.mocked(prismaMock.event.create).mockResolvedValueOnce({ id: "e1", title: "My Event" });

    const now = Date.now();
    const start = new Date(now + 60 * 60 * 1000);
    const end = new Date(now + 2 * 60 * 60 * 1000);

    const req = new Request("https://example.com/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "My Event",
        description: "This is a sufficiently long description",
        eventType: "EVENT",
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        address: "Some Street 1, 12345 City",
        lat: 52.52,
        lng: 13.405,
        danceStyleIds: ["ds1", "ds2"],
        requiresRegistration: false,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(vi.mocked(prismaMock.event.create)).toHaveBeenCalledTimes(1);

    const createArgs = vi.mocked(prismaMock.event.create).mock.calls[0]?.[0] as unknown as {
      data: Record<string, unknown>;
    };

    expect(createArgs.data.danceStyles).toEqual({
      createMany: {
        data: [{ styleId: "ds1" }, { styleId: "ds2" }],
        skipDuplicates: true,
      },
    });
  });
});
