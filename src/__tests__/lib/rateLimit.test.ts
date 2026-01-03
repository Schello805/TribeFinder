import { describe, it, expect } from 'vitest';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

describe('Rate Limiting', () => {
  const testId = () => `test-${Date.now()}-${Math.random()}`;

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const id = testId();
      const options = { limit: 5, windowSeconds: 60 };

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(id, options);
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block requests exceeding limit', () => {
      const id = testId();
      const options = { limit: 3, windowSeconds: 60 };

      // Use up the limit
      for (let i = 0; i < 3; i++) {
        checkRateLimit(id, options);
      }

      // Next request should be blocked
      const result = checkRateLimit(id, options);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different identifiers separately', () => {
      const id1 = testId();
      const id2 = testId();
      const options = { limit: 2, windowSeconds: 60 };

      // Use up id1's limit
      checkRateLimit(id1, options);
      checkRateLimit(id1, options);
      const blocked = checkRateLimit(id1, options);
      expect(blocked.success).toBe(false);

      // id2 should still have its full limit
      const allowed = checkRateLimit(id2, options);
      expect(allowed.success).toBe(true);
      expect(allowed.remaining).toBe(1);
    });

    it('should return correct limit info', () => {
      const id = testId();
      const options = { limit: 10, windowSeconds: 60 };

      const result = checkRateLimit(id, options);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });
  });

  describe('RATE_LIMITS presets', () => {
    it('should have stricter limits for auth endpoints', () => {
      expect(RATE_LIMITS.auth.limit).toBeLessThan(RATE_LIMITS.read.limit);
      expect(RATE_LIMITS.register.limit).toBeLessThan(RATE_LIMITS.create.limit);
    });

    it('should have reasonable window sizes', () => {
      expect(RATE_LIMITS.auth.windowSeconds).toBeGreaterThanOrEqual(60);
      expect(RATE_LIMITS.register.windowSeconds).toBeGreaterThanOrEqual(60);
    });
  });
});
