import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    event: { findUnique: vi.fn() },
    favoriteEvent: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { POST } from "@/app/api/event-favorites/route";

describe("event favorites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires a login", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await POST(new Request("https://example.com/api/event-favorites", { method: "POST", body: JSON.stringify({ eventId: "e1" }) }));
    expect(response.status).toBe(401);
  });

  it("saves an upcoming event with default reminders", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "e1", startDate: new Date("2027-01-01T10:00:00Z") } as never);
    vi.mocked(prisma.favoriteEvent.upsert).mockResolvedValue({ id: "f1", remindWeek: true, remindDay: true } as never);
    const response = await POST(new Request("https://example.com/api/event-favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId: "e1" }) }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ favorite: { id: "f1", remindWeek: true, remindDay: true } });
  });
});
