// ─────────────────────────────────────────────────────────────────────────────
// middleware/validate.ts — Zod input validation wrapper
//
// Zod lets us declare the exact shape we expect for request bodies.
// If the input doesn't match (e.g. missing email, negative amount),
// we return a clear 400 error before the route handler runs.
// This prevents garbage data from ever reaching the database.
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * validate(schema) — returns middleware that validates req.body against
 * the given Zod schema. On failure, returns 400 with readable error messages.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), handler)
 *
 * Where registerSchema is a Zod object like:
 *   z.object({ email: z.string().email(), password: z.string().min(8) })
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // .parse() throws a ZodError if validation fails
      // It also strips unknown fields for safety (no extra junk in req.body)
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // Format Zod's detailed errors into a simple list for the client
        const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        res.status(400).json({ error: 'Validation failed', details: messages });
        return;
      }
      next(err);
    }
  };
}
