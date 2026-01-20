import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => {
  return {
    getServerSession: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      user: {
        findUnique: vi.fn(),
      },
    },
  };
});

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { GET } from "@/app/api/user/profile/route";

describe("GET /api/user/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("derives dancerName/firstName/lastName from legacy name when missing", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "u1" },
    } as any);

    vi.mocked((prisma as any).user.findUnique).mockResolvedValueOnce({
      firstName: null,
      lastName: null,
      dancerName: null,
      bio: null,
      image: null,
      youtubeUrl: null,
      instagramUrl: null,
      facebookUrl: null,
      tiktokUrl: null,
      email: "a@b.de",
      name: "Max Mustermann",
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.firstName).toBe("Max");
    expect(json.lastName).toBe("Mustermann");
    expect(json.dancerName).toBe("Max Mustermann");
  });
});
