// ─────────────────────────────────────────────────────────────────────────────
// routes/notifications.ts — In-app notifications
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/notifications
router.get('/', async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  const notifications = await db.notification.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    50, // last 50 notifications
  });
  res.json({ notifications });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  const notifId = parseInt(req.params.id, 10);

  const notif = await db.notification.findUnique({ where: { id: notifId } });
  if (!notif || notif.userId !== userId) {
    res.status(404).json({ error: 'Notification not found.' });
    return;
  }
  await db.notification.update({ where: { id: notifId }, data: { read: true } });
  res.json({ message: 'Marked as read.' });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  await db.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  res.json({ message: 'All notifications marked as read.' });
});

export default router;
