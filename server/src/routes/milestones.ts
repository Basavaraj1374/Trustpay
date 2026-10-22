// ─────────────────────────────────────────────────────────────────────────────
// routes/milestones.ts — Milestone state machine actions
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { suggestMilestones } from '../services/milestoneGen';
import { generateContract } from '../services/contract';
import { fundMilestone, releaseMilestone, canTransition } from '../services/escrow';
import { generateInvoicePdf } from '../services/invoice';
import { config } from '../config';
import { MilestoneStatus } from '../types';

const router = Router();
router.use(authenticate);

// ─── POST /api/milestones/suggest ─────────────────────────────────────────────
const suggestSchema = z.object({
  projectId:         z.number().int().positive(),
  totalBudgetRupees: z.number().positive(),
});

router.post('/suggest', requireRole('CLIENT'), validate(suggestSchema), async (req: Request, res: Response) => {
  const { projectId, totalBudgetRupees } = req.body;
  const { userId } = (req as AuthenticatedRequest).user;

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.clientId !== userId) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const totalPaise = Math.round(totalBudgetRupees * 100);
  const suggestions = suggestMilestones(project.title, project.description, totalPaise);
  res.json({ suggestions });
});

// ─── POST /api/milestones — Confirm and save milestones ──────────────────────
const saveMilestonesSchema = z.object({
  projectId:  z.number().int().positive(),
  milestones: z.array(z.object({
    title:        z.string().min(2),
    description:  z.string().min(5),
    deliverables: z.string().min(2),
    amountRupees: z.number().positive(),
    dueDate:      z.string().optional().nullable(),
  })).min(1).max(10),
});

router.post('/', requireRole('CLIENT'), validate(saveMilestonesSchema), async (req: Request, res: Response) => {
  const { projectId, milestones: input } = req.body;
  const { userId } = (req as AuthenticatedRequest).user;

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.clientId !== userId) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  if (project.status !== 'DRAFT') {
    res.status(400).json({ error: 'Milestones can only be set on DRAFT projects.' });
    return;
  }

  // Validate total matches project budget (within ₹1 tolerance for rounding)
  const totalPaise = input.reduce((sum: number, m: { amountRupees: number }) => sum + Math.round(m.amountRupees * 100), 0);
  if (Math.abs(totalPaise - project.totalBudget) > 100) {
    res.status(400).json({
      error: `Milestone amounts total ₹${(totalPaise / 100).toFixed(2)}, but project budget is ₹${(project.totalBudget / 100).toFixed(2)}. They must match.`,
    });
    return;
  }

  // Replace existing milestones
  await db.milestone.deleteMany({ where: { projectId } });

  const milestones = await db.$transaction(
    input.map((m: { title: string; description: string; deliverables: string; amountRupees: number; dueDate?: string }, i: number) =>
      db.milestone.create({
        data: {
          projectId,
          order:       i + 1,
          title:       m.title,
          description: m.description,
          deliverables: m.deliverables,
          amount:      Math.round(m.amountRupees * 100),
          dueDate:     m.dueDate ? new Date(m.dueDate) : null,
        },
      })
    )
  );

  // Auto-generate the contract now that milestones are set
  await generateContract(projectId);

  res.status(201).json({ milestones, message: 'Milestones saved. Contract generated — both parties must sign.' });
});

// ─── Helper: ensure requesting user is a member of the milestone's project ────
async function getMilestoneForUser(milestoneId: number, userId: number) {
  const milestone = await db.milestone.findUnique({
    where:   { id: milestoneId },
    include: { project: true },
  });
  if (!milestone) throw { status: 404, message: 'Milestone not found.' };

  const isMember = milestone.project.clientId === userId || milestone.project.freelancerId === userId;
  if (!isMember) throw { status: 403, message: 'Access denied.' };

  return milestone;
}

// ─── PATCH /api/milestones/:id/fund ─────────────── CLIENT ───────────────────
router.patch('/:id/fund', requireRole('CLIENT'), async (req: Request, res: Response) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user;
    const milestone = await fundMilestone(parseInt(req.params.id, 10), userId);
    res.json({ milestone, message: 'Milestone funded. Freelancer can now begin work.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── PATCH /api/milestones/:id/start ──────────── FREELANCER ─────────────────
router.patch('/:id/start', requireRole('FREELANCER'), async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  try {
    const ms = await getMilestoneForUser(parseInt(req.params.id, 10), userId);
    if (!canTransition(ms.status as MilestoneStatus, 'IN_PROGRESS')) {
      res.status(400).json({ error: `Cannot start: milestone is ${ms.status}.` });
      return;
    }
    const updated = await db.milestone.update({ where: { id: ms.id }, data: { status: 'IN_PROGRESS' } });
    res.json({ milestone: updated });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── PATCH /api/milestones/:id/submit ─────────── FREELANCER ─────────────────
const submitSchema = z.object({
  submissionNote: z.string().min(10, 'Please describe what you delivered.'),
  submissionLink: z.string().url('Please provide a valid URL.').optional(),
});

router.patch('/:id/submit', requireRole('FREELANCER'), validate(submitSchema), async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  const { submissionNote, submissionLink } = req.body;
  try {
    const ms = await getMilestoneForUser(parseInt(req.params.id, 10), userId);
    if (!canTransition(ms.status as MilestoneStatus, 'SUBMITTED')) {
      res.status(400).json({ error: `Cannot submit: milestone is ${ms.status}.` });
      return;
    }

    // Set auto-approve deadline
    const autoApproveAt = new Date();
    autoApproveAt.setDate(autoApproveAt.getDate() + config.autoApproveDays);

    const updated = await db.milestone.update({
      where: { id: ms.id },
      data:  { status: 'SUBMITTED', submissionNote, submissionLink, autoApproveAt },
    });

    // Notify client
    await db.notification.create({
      data: {
        userId:  ms.project.clientId,
        message: `Milestone "${ms.title}" submitted for review. Approve within ${config.autoApproveDays} days to avoid auto-approval.`,
        link:    `/projects/${ms.projectId}/milestones/${ms.id}`,
      },
    });

    res.json({ milestone: updated });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── PATCH /api/milestones/:id/approve ────────── CLIENT ─────────────────────
router.patch('/:id/approve', requireRole('CLIENT'), async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  try {
    const ms = await getMilestoneForUser(parseInt(req.params.id, 10), userId);
    if (ms.project.clientId !== userId) { res.status(403).json({ error: 'Not your project.' }); return; }
    if (!canTransition(ms.status as MilestoneStatus, 'APPROVED')) {
      res.status(400).json({ error: `Cannot approve: milestone is ${ms.status}.` });
      return;
    }

    // Approve then release (two-step to match state machine)
    await db.milestone.update({ where: { id: ms.id }, data: { status: 'APPROVED' } });
    const released = await releaseMilestone(ms.id);

    // Generate PDF invoice asynchronously (don't block response)
    generateInvoicePdf(ms.id).catch((e: Error) => console.error('Invoice PDF error:', e.message));

    res.json({ milestone: released, message: 'Approved! Funds released to freelancer.' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── PATCH /api/milestones/:id/reject ─────────── CLIENT ─────────────────────
const rejectSchema = z.object({ reason: z.string().min(5, 'Please provide a reason for rejection.') });

router.patch('/:id/reject', requireRole('CLIENT'), validate(rejectSchema), async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  const { reason } = req.body;
  try {
    const ms = await getMilestoneForUser(parseInt(req.params.id, 10), userId);
    if (ms.project.clientId !== userId) { res.status(403).json({ error: 'Not your project.' }); return; }
    if (!canTransition(ms.status as MilestoneStatus, 'REJECTED')) {
      res.status(400).json({ error: `Cannot reject: milestone is ${ms.status}.` });
      return;
    }

    const updated = await db.milestone.update({
      where: { id: ms.id },
      data:  { status: 'REJECTED', submissionNote: null, autoApproveAt: null },
    });

    await db.notification.create({
      data: {
        userId:  ms.project.freelancerId,
        message: `Milestone "${ms.title}" revision requested: ${reason}. Please resubmit.`,
        link:    `/projects/${ms.projectId}/milestones/${ms.id}`,
      },
    });

    res.json({ milestone: updated });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── GET /api/milestones/:id ──────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  try {
    const milestone = await db.milestone.findUnique({
      where:   { id: parseInt(req.params.id, 10) },
      include: { project: true, dispute: true, invoice: true },
    });
    if (!milestone) { res.status(404).json({ error: 'Milestone not found.' }); return; }
    const isMember = milestone.project.clientId === userId || milestone.project.freelancerId === userId;
    if (!isMember) { res.status(403).json({ error: 'Access denied.' }); return; }
    res.json({ milestone });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
