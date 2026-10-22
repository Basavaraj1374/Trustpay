// ─────────────────────────────────────────────────────────────────────────────
// middleware/rateLimiter.ts — Rate limiting for auth routes
//
// WHY: Without this, an attacker can try thousands of passwords per second.
// This limits each IP to 10 login/register attempts per 15 minutes.
// ─────────────────────────────────────────────────────────────────────────────

import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 requests per IP in the window
  standardHeaders: true,     // send X-RateLimit-* headers so the client knows
  legacyHeaders: false,
  message: {
    error: 'Too many attempts. Please try again in 15 minutes.',
  },
});
