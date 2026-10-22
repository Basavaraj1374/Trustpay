// ─────────────────────────────────────────────────────────────────────────────
// routes/invoices.ts — List invoices and download PDFs
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { config } from '../config';

const router = Router();
router.use(authenticate);

// GET /api/invoices — list my invoices
router.get('/', async (req: Request, res: Response) => {
  const { userId, role } = (req as AuthenticatedRequest).user;

  const invoices = await db.invoice.findMany({
    where: role === 'MEDIATOR'
      ? {}
      : { OR: [{ clientId: userId }, { freelancerId: userId }] },
    include: {
      milestone: { select: { title: true, order: true } },
      project:   { select: { title: true } },
    },
    orderBy: { issuedAt: 'desc' },
  });

  res.json({ invoices });
});

// GET /api/invoices/:id/download — download PDF
router.get('/:id/download', async (req: Request, res: Response) => {
  const { userId, role } = (req as AuthenticatedRequest).user;
  const invoiceId = parseInt(req.params.id, 10);

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found.' }); return; }

  const isMember = invoice.clientId === userId || invoice.freelancerId === userId;
  if (!isMember && role !== 'MEDIATOR') {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const pdfPath = path.resolve(config.invoicesDir, path.basename(invoice.pdfPath));
  if (!fs.existsSync(pdfPath)) {
    res.status(404).json({ error: 'PDF not yet generated. Please try again in a moment.' });
    return;
  }

  res.download(pdfPath, `${invoice.invoiceNumber}.pdf`);
});

export default router;
