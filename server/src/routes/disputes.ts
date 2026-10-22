// ─────────────────────────────────────────────────────────────────────────────
// routes/disputes.ts — Raise and resolve disputes
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { resolveDispute } from '../services/escrow';

const router = Router();
router.use(authenticate);

// POST /api/disputes — raise a dispute on a milestone
const raiseSchema = z.object({
  milestoneId: z.number().int().positive(),
  reason:      z.string().min(10, 'Please describe the dispute in at least 10 characters.'),
});

router.post('/', validate(raiseSchema), async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  const { milestoneId, reason } = req.body;

  const milestone = await db.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true, dispute: true },
  });
  if (!milestone) { res.status(404).json({ error: 'Milestone not found.' }); return; }

  const isMember = milestone.project.clientId === userId || milestone.project.freelancerId === userId;
  if (!isMember) { res.status(403).json({ error: 'Access denied.' }); return; }

  if (!['IN_PROGRESS', 'SUBMITTED'].includes(milestone.status)) {
    res.status(400).json({ error: `Can only dispute IN_PROGRESS or SUBMITTED milestones. Current status: ${milestone.status}.` });
    return;
  }
  if (milestone.dispute) {
    res.status(409).json({ error: 'A dispute already exists for this milestone.' });
    return;
  }

  const [dispute] = await db.$transaction([
    db.dispute.create({ data: { milestoneId, raisedById: userId, reason } }),
    db.milestone.update({ where: { id: milestoneId }, data: { status: 'DISPUTED' } }),
  ]);

  // Notify the other party
  const otherId = milestone.project.clientId === userId
    ? milestone.project.freelancerId
    : milestone.project.clientId;

  await db.notification.create({
    data: {
      userId:  otherId,
      message: `⚠️ Dispute raised on milestone "${milestone.title}": ${reason}. Funds are frozen.`,
      link:    `/projects/${milestone.projectId}/chat`,
    },
  });

  res.status(201).json({ dispute });
});

// GET /api/disputes/:milestoneId
router.get('/:milestoneId', async (req: Request, res: Response) => {
  const { userId, role } = (req as AuthenticatedRequest).user;
  const milestoneId = parseInt(req.params.milestoneId, 10);

  const dispute = await db.dispute.findUnique({
    where:   { milestoneId },
    include: { milestone: { include: { project: true } } },
  });
  if (!dispute) { res.status(404).json({ error: 'No dispute found.' }); return; }

  const isMember = dispute.milestone.project.clientId === userId || dispute.milestone.project.freelancerId === userId;
  if (!isMember && role !== 'MEDIATOR') { res.status(403).json({ error: 'Access denied.' }); return; }

  res.json({ dispute });
});

// PATCH /api/disputes/:id/resolve — MEDIATOR only
const resolveSchema = z.object({
  resolution:  z.enum(['RELEASE', 'REFUND', 'SPLIT']),
  splitPercent: z.number().int().min(0).max(100).optional().nullable(),
});

router.patch(
  '/:id/resolve',
  requireRole('MEDIATOR'),
  validate(resolveSchema),
  async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { resolution, splitPercent } = req.body;
    const disputeId = parseInt(req.params.id, 10);

    const dispute = await db.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) { res.status(404).json({ error: 'Dispute not found.' }); return; }

    if (resolution === 'SPLIT' && splitPercent == null) {
      res.status(400).json({ error: 'splitPercent (0–100) is required for SPLIT resolution.' });
      return;
    }

    try {
      const resolved = await resolveDispute(dispute.milestoneId, resolution, splitPercent ?? null, userId);
      res.json({ dispute: resolved, message: `Dispute resolved: ${resolution}.` });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
