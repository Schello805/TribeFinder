import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => {
  return {
    getServerSession: vi.fn(),
  };
});

import { getServerSession } from "next-auth";
import { requireAdminSession } from "@/lib/requireAdmin";

type Session = Awaited<ReturnType<typeof getServerSession>>;

describe("requireAdminSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if no session", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as unknown as Session);
    await expect(requireAdminSession()).resolves.toBeNull();
  });

  it("returns null if role is not ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "u1", role: "USER" },
    } as unknown as Session);

    await expect(requireAdminSession()).resolves.toBeNull();
  });

  it("returns session if ADMIN", async () => {
    const session = { user: { id: "u1", role: "ADMIN" } };
    vi.mocked(getServerSession).mockResolvedValueOnce(session as unknown as Session);

    await expect(requireAdminSession()).resolves.toEqual(session);
  });
});
