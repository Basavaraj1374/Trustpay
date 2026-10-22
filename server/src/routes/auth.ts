// ─────────────────────────────────────────────────────────────────────────────
// routes/auth.ts — Register, Login
//
// POST /api/auth/register  → create new user account
// POST /api/auth/login     → verify credentials, return JWT
// GET  /api/auth/me        → return current user info
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { db } from '../db';
import { config } from '../config';
import { validate } from '../middleware/validate';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// ─── Validation schemas ───────────────────────────────────────────────────────
const registerSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role:     z.enum(['CLIENT', 'FREELANCER'], {
    errorMap: () => ({ message: 'Role must be CLIENT or FREELANCER' }),
  }),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

// ─── Helper: generate JWT ─────────────────────────────────────────────────────
function generateToken(userId: number, role: string): string {
  return jwt.sign(
    { userId, role },       // payload — what's stored inside the token
    config.jwtSecret,       // secret — used to sign and verify
    { expiresIn: config.jwtExpiresIn as any }
  );
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post(
  '/register',
  authRateLimiter,          // max 10 attempts per IP per 15 min
  validate(registerSchema), // validate body before anything else
  async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;

    // 1. Check if email already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered.' });
      return;
    }

    // 2. Hash the password — bcrypt adds a random "salt" and hashes 10 rounds
    //    NEVER store plain passwords. Even if the DB is leaked, hashes are safe.
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create the user
    const user = await db.user.create({
      data: { name, email, passwordHash, role },
      // Only return safe fields — never return passwordHash to the client!
      select: { id: true, name: true, email: true, role: true, walletBalance: true, createdAt: true },
    });

    // 4. Generate JWT
    const token = generateToken(user.id, user.role);

    res.status(201).json({ token, user });
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // 1. Find the user by email
    const user = await db.user.findUnique({ where: { email } });

    // 2. Check password — we use bcrypt.compare (not ==) because the stored
    //    hash includes a random salt, so every hash looks different
    //    even for the same password. bcrypt.compare handles this correctly.
    const passwordOk = user && await bcrypt.compare(password, user.passwordHash);

    // IMPORTANT: return the SAME error for both "user not found" and
    // "wrong password". This prevents attackers from learning which emails
    // are registered (user enumeration attack).
    if (!passwordOk) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // 3. Generate JWT
    const token = generateToken(user.id, user.role);

    // 4. Return token + safe user object
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, walletBalance: true, createdAt: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json({ user });
});

export default router;
