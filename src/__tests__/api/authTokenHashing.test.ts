import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/email", () => {
  return {
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
    emailTemplate: vi.fn().mockResolvedValue("<html/>"),
    emailHeading: vi.fn().mockReturnValue(""),
    emailText: vi.fn().mockReturnValue(""),
    emailButton: vi.fn().mockReturnValue(""),
    emailHighlight: vi.fn().mockReturnValue(""),
    getEmailBaseUrl: vi.fn().mockReturnValue("https://example.com"),
    toAbsoluteUrl: (path: string, base: string) => `${base}${path}`,
  };
});

vi.mock("uuid", () => {
  return {
    v4: () => "00000000-0000-0000-0000-000000000000",
  };
});

import prisma from "@/lib/prisma";
import { hashToken } from "@/lib/tokenHash";

describe("Auth token hashing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forgot-password stores only hashed reset token", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");

    const prismaMock = prisma as unknown as {
      user: {
        findUnique: (args: unknown) => unknown;
        update: (args: unknown) => unknown;
      };
    };

    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce({
      id: "u1",
      email: "a@b.de",
    });

    vi.mocked(prismaMock.user.update).mockResolvedValueOnce({ id: "u1" });

    const req = new Request("https://example.com/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.de" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const updateCalls = vi.mocked(prismaMock.user.update).mock.calls;
    expect(updateCalls.length).toBe(1);

    const updateArgs = updateCalls[0]?.[0] as { data?: { resetToken?: string | null } };

    expect(updateArgs.data?.resetToken).toBe(hashToken("00000000-0000-0000-0000-000000000000"));
    expect(updateArgs.data?.resetToken).not.toBe("00000000-0000-0000-0000-000000000000");
  });

  it("reset-password hashes incoming token for lookup", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");

    const prismaMock = prisma as unknown as {
      user: {
        findFirst: (args: unknown) => unknown;
        update: (args: unknown) => unknown;
      };
    };

    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce({ id: "u1" });
    vi.mocked(prismaMock.user.update).mockResolvedValueOnce({ id: "u1" });

    const req = new Request("https://example.com/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "raw-token", password: "12345678" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const findFirstCalls = vi.mocked(prismaMock.user.findFirst).mock.calls;
    expect(findFirstCalls.length).toBe(1);

    const findFirstArgs = findFirstCalls[0]?.[0] as { where?: { resetToken?: string } };
    expect(findFirstArgs.where?.resetToken).toBe(hashToken("raw-token"));
  });

  it("verify-email hashes incoming token for lookup", async () => {
    const { POST } = await import("@/app/api/auth/verify-email/route");

    const prismaMock = prisma as unknown as {
      user: {
        findFirst: (args: unknown) => unknown;
        update: (args: unknown) => unknown;
      };
    };

    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce({
      id: "u1",
      emailVerified: null,
    });
    vi.mocked(prismaMock.user.update).mockResolvedValueOnce({ id: "u1" });

    const req = new Request("https://example.com/api/auth/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "raw-verify" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const findFirstCalls = vi.mocked(prismaMock.user.findFirst).mock.calls;
    expect(findFirstCalls.length).toBe(1);

    const findFirstArgs = findFirstCalls[0]?.[0] as { where?: { verificationToken?: string } };
    expect(findFirstArgs.where?.verificationToken).toBe(hashToken("raw-verify"));
  });
});
