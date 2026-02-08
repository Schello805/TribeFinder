import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

type LoginAttemptEntry = { failures: number; lockedUntil: number };
const loginAttemptStore = new Map<string, LoginAttemptEntry>();

function getIpFromAuthRequest(req: { headers?: Record<string, string | string[] | undefined> } | undefined) {
  const headers = req?.headers || {};
  const forwarded = headers["x-forwarded-for"];
  const forwardedVal = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof forwardedVal === "string" && forwardedVal.trim()) {
    return forwardedVal.split(",")[0].trim();
  }
  const realIp = headers["x-real-ip"];
  const realIpVal = Array.isArray(realIp) ? realIp[0] : realIp;
  if (typeof realIpVal === "string" && realIpVal.trim()) {
    return realIpVal.trim();
  }
  return "unknown";
}

function getAttemptKey(email: string, ip: string) {
  return `${email.toLowerCase().trim()}|${ip}`;
}

function isLocked(key: string) {
  const entry = loginAttemptStore.get(key);
  if (!entry) return false;
  const now = Date.now();
  if (entry.lockedUntil > now) return true;
  if (entry.failures > 0) {
    loginAttemptStore.delete(key);
  }
  return false;
}

function registerFailure(key: string) {
  const now = Date.now();
  const entry = loginAttemptStore.get(key);
  const nextFailures = (entry?.failures ?? 0) + 1;
  const lockedUntil = nextFailures >= 5 ? now + 5 * 60 * 1000 : 0;
  loginAttemptStore.set(key, { failures: nextFailures, lockedUntil });
}

function registerSuccess(key: string) {
  loginAttemptStore.delete(key);
}

// Note: Type assertion needed due to custom Prisma client output path
// This is a known compatibility issue between @next-auth/prisma-adapter and custom client paths
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const ip = getIpFromAuthRequest(req as unknown as { headers?: Record<string, string | string[] | undefined> });
        const attemptKey = getAttemptKey(credentials.email, ip);
        if (isLocked(attemptKey)) {
          throw new Error("LOGIN_LOCKED")
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          registerFailure(attemptKey)
          return null
        }

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED")
        }

        if ((user as { isBlocked?: boolean }).isBlocked) {
          registerFailure(attemptKey)
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          registerFailure(attemptKey)
          return null
        }

        registerSuccess(attemptKey)

        try {
          await prisma.user.update({
            where: { id: user.id },
            data: ({ lastLoginAt: new Date() } as unknown as never),
            select: { id: true },
          })
        } catch {
          // best-effort only
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: normalizeUploadedImageUrl(user.image),
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24,
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.image = (user as { image?: string | null }).image ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.image = normalizeUploadedImageUrl((token as { image?: string | null }).image ?? null)
      }
      return session
    }
  }
}
