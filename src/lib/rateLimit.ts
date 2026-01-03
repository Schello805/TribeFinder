/**
 * Simple in-memory rate limiter for API routes.
 * 
 * Note: This is per-process. In a multi-instance deployment,
 * consider using Redis or a distributed rate limiter.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // Clean every minute

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier (e.g., IP address or user ID).
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const key = identifier;

  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new window
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, entry);

    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  if (entry.count > options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client identifier from request (IP address).
 * Falls back to a generic key if IP cannot be determined.
 */
export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback - in production, you should always have one of the above
  return "unknown-client";
}

/**
 * Create a rate limit response with proper headers.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Bitte warte einen Moment und versuche es erneut.",
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.resetAt.toString(),
        "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
      },
    }
  );
}

// Preset configurations for common use cases
export const RATE_LIMITS = {
  // Auth endpoints - stricter limits
  auth: { limit: 5, windowSeconds: 60 },
  register: { limit: 3, windowSeconds: 300 },
  
  // Write operations
  create: { limit: 10, windowSeconds: 60 },
  update: { limit: 20, windowSeconds: 60 },
  
  // Upload - very strict
  upload: { limit: 10, windowSeconds: 60 },
  
  // Read operations - more lenient
  read: { limit: 100, windowSeconds: 60 },
} as const;
