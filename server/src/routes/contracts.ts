// ─────────────────────────────────────────────────────────────────────────────
// routes/contracts.ts — View and sign contracts
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { signContract } from '../services/contract';

const router = Router();
router.use(authenticate);

// GET /api/contracts/:projectId
router.get('/:projectId', async (req: Request, res: Response) => {
  const { userId, role } = (req as AuthenticatedRequest).user;
  const projectId = parseInt(req.params.projectId, 10);

  const contract = await db.contract.findUnique({
    where:   { projectId },
    include: { project: { select: { clientId: true, freelancerId: true, title: true } } },
  });
  if (!contract) { res.status(404).json({ error: 'Contract not found.' }); return; }

  const isMember = contract.project.clientId === userId || contract.project.freelancerId === userId;
  if (!isMember && role !== 'MEDIATOR') {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  res.json({ contract });
});

// POST /api/contracts/:projectId/sign
const signSchema = z.object({
  signedName: z.string().min(2, 'Please type your full name to sign.'),
});

router.post('/:projectId/sign', validate(signSchema), async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  const projectId = parseInt(req.params.projectId, 10);
  const { signedName } = req.body;

  // Capture IP address for the signature record
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket.remoteAddress ?? 'unknown';

  try {
    const result = await signContract(projectId, userId, signedName, ip);
    res.json({
      contract:   result.contract,
      bothSigned: result.bothSigned,
      message:    result.bothSigned
        ? 'Both parties signed! Project is now ACTIVE.'
        : 'Your signature recorded. Waiting for the other party.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
