import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ notifyEventWaitlistPromotion: vi.fn() }));

vi.mock("@/lib/prisma", () => {
  const client = {
    event: { findUnique: vi.fn() },
    eventRegistration: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  };
  return { default: { ...client, $transaction: vi.fn((callback: (tx: typeof client) => unknown) => callback(client)) } };
});

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { DELETE, POST } from "@/app/api/events/[id]/registrations/route";
import { notifyEventWaitlistPromotion } from "@/lib/notifications";

const params = { params: Promise.resolve({ id: "event1" }) };

describe("event registrations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("puts a user on the waitlist when the event is full", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1", role: "USER" } } as never);
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "event1", title: "Workshop", requiresRegistration: true, maxParticipants: 1, creatorId: "owner", group: null } as never);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.count).mockResolvedValue(1);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({ id: "reg1", status: "WAITLIST", createdAt: new Date() } as never);

    const response = await POST(new Request("https://example.com", { method: "POST" }), params);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ status: "WAITLIST" });
  });

  it("promotes the oldest waitlisted user after a confirmed cancellation", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1", role: "USER" } } as never);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue({ id: "reg1", eventId: "event1", userId: "u1", status: "CONFIRMED" } as never);
    vi.mocked(prisma.eventRegistration.findFirst).mockResolvedValue({ id: "reg2", userId: "u2" } as never);
    vi.mocked(prisma.eventRegistration.delete).mockResolvedValue({} as never);
    vi.mocked(prisma.eventRegistration.update).mockResolvedValue({} as never);

    const response = await DELETE(new Request("https://example.com", { method: "DELETE" }), params);
    expect(response.status).toBe(200);
    expect(prisma.eventRegistration.update).toHaveBeenCalledWith({ where: { id: "reg2" }, data: { status: "CONFIRMED" } });
    expect(notifyEventWaitlistPromotion).toHaveBeenCalledWith("event1", "u2");
  });
});
