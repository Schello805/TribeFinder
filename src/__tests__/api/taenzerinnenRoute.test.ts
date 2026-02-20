import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => {
  return {
    getServerSession: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      user: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { GET } from "@/app/api/taenzerinnen/route";

type Session = Awaited<ReturnType<typeof getServerSession>>;

type PrismaMock = {
  user: {
    count: (args: unknown) => unknown;
    findMany: (args: unknown) => unknown;
  };
};

describe("GET /api/taenzerinnen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies workshops filter and hides private profiles when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as unknown as Session);

    const prismaMock = prisma as unknown as PrismaMock;
    vi.mocked(prismaMock.user.count).mockResolvedValueOnce(1);
    vi.mocked(prismaMock.user.findMany).mockResolvedValueOnce([
      {
        id: "u1",
        name: "Test",
        dancerName: "Test",
        image: null,
        bio: null,
        dancerTeaches: false,
        dancerTeachingWhere: null,
        dancerTeachingFocus: null,
        dancerEducation: null,
        dancerPerformances: null,
        dancerGivesWorkshops: true,
        dancerBookableForShows: false,
        dancerWorkshopConditions: null,
        updatedAt: new Date().toISOString(),
        memberships: [],
      },
    ]);

    const req = new Request("https://example.com/api/taenzerinnen?workshops=1");
    const res = await GET(req);

    expect(res.status).toBe(200);

    const countCall = vi.mocked(prismaMock.user.count).mock.calls[0]?.[0] as unknown as { where: Record<string, unknown> };
    expect(countCall.where).toMatchObject({
      isDancerProfileEnabled: true,
      isDancerProfilePrivate: false,
      dancerGivesWorkshops: true,
    });

    const findManyCall = vi.mocked(prismaMock.user.findMany).mock.calls[0]?.[0] as unknown as { where: Record<string, unknown> };
    expect(findManyCall.where).toMatchObject({
      isDancerProfileEnabled: true,
      isDancerProfilePrivate: false,
      dancerGivesWorkshops: true,
    });

    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.pagination.total).toBe(1);
  });

  it("includes private profiles when authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: "u-session" } } as unknown as Session);

    const prismaMock = prisma as unknown as PrismaMock;
    vi.mocked(prismaMock.user.count).mockResolvedValueOnce(0);
    vi.mocked(prismaMock.user.findMany).mockResolvedValueOnce([]);

    const req = new Request("https://example.com/api/taenzerinnen");
    const res = await GET(req);

    expect(res.status).toBe(200);

    const countCall = vi.mocked(prismaMock.user.count).mock.calls[0]?.[0] as unknown as { where: Record<string, unknown> };
    expect(countCall.where.isDancerProfileEnabled).toBe(true);
    expect(countCall.where.isDancerProfilePrivate).toBeUndefined();
  });

  it("supports pagination parameters (page/limit)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as unknown as Session);

    const prismaMock = prisma as unknown as PrismaMock;
    vi.mocked(prismaMock.user.count).mockResolvedValueOnce(0);
    vi.mocked(prismaMock.user.findMany).mockResolvedValueOnce([]);

    const req = new Request("https://example.com/api/taenzerinnen?page=2&limit=5");
    const res = await GET(req);

    expect(res.status).toBe(200);

    const findManyCall = vi.mocked(prismaMock.user.findMany).mock.calls[0]?.[0] as unknown as { skip?: number; take?: number };
    expect(findManyCall.skip).toBe(5);
    expect(findManyCall.take).toBe(5);
  });
});
