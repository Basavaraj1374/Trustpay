// ─────────────────────────────────────────────────────────────────────────────
// routes/projects.ts — Project CRUD
//
// GET    /api/projects       → list my projects (filtered by role)
// POST   /api/projects       → create project + invite freelancer (CLIENT only)
// GET    /api/projects/:id   → get project details
// PATCH  /api/projects/:id   → update project (CLIENT, DRAFT only)
// DELETE /api/projects/:id   → cancel project (CLIENT, DRAFT only)
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { db } from '../db';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// All project routes require login
router.use(authenticate);

// ─── Validation schemas ───────────────────────────────────────────────────────
const createProjectSchema = z.object({
  title:            z.string().min(3).max(100),
  description:      z.string().min(10).max(2000),
  totalBudgetRupees: z.number().positive('Budget must be positive'),
  freelancerEmail:  z.string().email('Invalid freelancer email'),
});

const updateProjectSchema = z.object({
  title:       z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(2000).optional(),
});

// ─── GET /api/projects ────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const { userId, role } = (req as AuthenticatedRequest).user;

  // Return different projects depending on the user's role
  const projects = await db.project.findMany({
    where: role === 'CLIENT'
      ? { clientId: userId }
      : role === 'FREELANCER'
        ? { freelancerId: userId }
        : {}, // MEDIATOR sees all
    include: {
      client:     { select: { id: true, name: true, email: true } },
      freelancer: { select: { id: true, name: true, email: true } },
      milestones: { select: { id: true, status: true, amount: true } },
      _count:     { select: { milestones: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ projects });
});

// ─── POST /api/projects ───────────────────────────────────────────────────────
router.post(
  '/',
  requireRole('CLIENT'),
  validate(createProjectSchema),
  async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { title, description, totalBudgetRupees, freelancerEmail } = req.body;

    // 1. Find the freelancer by email
    const freelancer = await db.user.findUnique({ where: { email: freelancerEmail } });
    if (!freelancer || freelancer.role !== 'FREELANCER') {
      res.status(404).json({ error: 'No FREELANCER account found with that email.' });
      return;
    }
    if (freelancer.id === userId) {
      res.status(400).json({ error: 'You cannot hire yourself.' });
      return;
    }

    // 2. Convert budget to paise (integer, never float)
    const totalBudget = Math.round(totalBudgetRupees * 100);

    // 3. Create the project
    const project = await db.project.create({
      data: {
        title,
        description,
        totalBudget,
        clientId:     userId,
        freelancerId: freelancer.id,
        status:       'DRAFT',
      },
      include: {
        client:     { select: { id: true, name: true, email: true } },
        freelancer: { select: { id: true, name: true, email: true } },
      },
    });

    // 4. Notify the freelancer
    await db.notification.create({
      data: {
        userId:  freelancer.id,
        message: `You've been invited to project "${title}". Review and sign the contract to get started.`,
        link:    `/projects/${project.id}`,
      },
    });

    res.status(201).json({ project });
  }
);

// ─── GET /api/projects/:id ────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const { userId, role } = (req as AuthenticatedRequest).user;
  const projectId = parseInt(req.params.id, 10);

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      client:      { select: { id: true, name: true, email: true } },
      freelancer:  { select: { id: true, name: true, email: true } },
      milestones:  { orderBy: { order: 'asc' } },
      contract:    true,
      invoices:    true,
      _count:      { select: { chatMessages: true } },
    },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  // Authorization: only the client, freelancer, or mediator can view
  const isMember = project.clientId === userId || project.freelancerId === userId;
  if (!isMember && role !== 'MEDIATOR') {
    res.status(403).json({ error: 'You do not have access to this project.' });
    return;
  }

  res.json({ project });
});

// ─── PATCH /api/projects/:id ──────────────────────────────────────────────────
router.patch(
  '/:id',
  requireRole('CLIENT'),
  validate(updateProjectSchema),
  async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const projectId = parseInt(req.params.id, 10);

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project || project.clientId !== userId) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    if (project.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only DRAFT projects can be edited.' });
      return;
    }

    const updated = await db.project.update({
      where: { id: projectId },
      data: req.body,
    });
    res.json({ project: updated });
  }
);

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────
router.delete('/:id', requireRole('CLIENT'), async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  const projectId = parseInt(req.params.id, 10);

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.clientId !== userId) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  if (project.status !== 'DRAFT') {
    res.status(400).json({ error: 'Only DRAFT projects can be cancelled.' });
    return;
  }

  await db.project.update({ where: { id: projectId }, data: { status: 'CANCELLED' } });
  res.json({ message: 'Project cancelled.' });
});

export default router;
