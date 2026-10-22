// ─────────────────────────────────────────────────────────────────────────────
// routes/wallet.ts — Wallet balance + top-up + ledger history
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { config } from '../config';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

// GET /api/wallet — my balance and ledger
router.get('/', async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;

  const [user, ledger] = await Promise.all([
    db.user.findUnique({
      where:  { id: userId },
      select: { id: true, name: true, walletBalance: true },
    }),
    db.ledger.findMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        project:   { select: { title: true } },
        milestone: { select: { title: true } },
      },
    }),
  ]);

  res.json({ wallet: user, ledger });
});

// POST /api/wallet/topup — demo: add fake funds
const topupSchema = z.object({
  amountRupees: z.number()
    .positive('Amount must be positive')
    .max(config.maxTopupPaise / 100, `Maximum top-up is ₹${(config.maxTopupPaise / 100).toLocaleString('en-IN')}`),
});

router.post('/topup', validate(topupSchema), async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  const { amountRupees } = req.body;
  const amountPaise = Math.round(amountRupees * 100);

  // Atomic: credit wallet + create ledger entry together
  const [user] = await db.$transaction([
    db.user.update({
      where: { id: userId },
      data:  { walletBalance: { increment: amountPaise } },
      select: { id: true, name: true, walletBalance: true },
    }),
    db.ledger.create({
      data: {
        type:       'DEPOSIT',
        amount:     amountPaise,
        fromUserId: null,   // "from" is the demo top-up system
        toUserId:   userId,
        note:       `Demo wallet top-up of ₹${amountRupees.toLocaleString('en-IN')}`,
      },
    }),
  ]);

  res.json({ wallet: user, message: `₹${amountRupees.toLocaleString('en-IN')} added to your wallet.` });
});

export default router;
