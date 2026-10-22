// ─────────────────────────────────────────────────────────────────────────────
// routes/users.ts — User profiles (minimal)
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/users — list all users (MEDIATOR only)
router.get('/', requireRole('MEDIATOR'), async (_req: Request, res: Response) => {
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, walletBalance: true, createdAt: true },
  });
  res.json({ users });
});

// GET /api/users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  const targetId = parseInt(req.params.id, 10);

  // Users can only view their own profile (or mediator can view all)
  if (targetId !== userId) {
    res.status(403).json({ error: 'You can only view your own profile.' });
    return;
  }

  const user = await db.user.findUnique({
    where:  { id: targetId },
    select: { id: true, name: true, email: true, role: true, walletBalance: true, createdAt: true },
  });
  if (!user) { res.status(404).json({ error: 'User not found.' }); return; }
  res.json({ user });
});

export default router;
