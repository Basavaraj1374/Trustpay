// ─────────────────────────────────────────────────────────────────────────────
// services/escrow.ts — The core escrow engine
//
// This is the most important file in the backend. It implements:
// 1. The milestone state machine (strict transitions)
// 2. The immutable financial ledger (every money movement = one row)
// 3. Database transactions (all-or-nothing money operations)
//
// ═══════════════════════════════════════════════════════════════════════
// STATE MACHINE (what transitions are legal):
//
//   PENDING → FUNDED          (client funds the milestone)
//   FUNDED  → IN_PROGRESS     (freelancer starts work)
//   IN_PROGRESS → SUBMITTED   (freelancer submits work)
//   SUBMITTED → APPROVED      (client approves)
//   APPROVED → RELEASED       (automatic: funds transferred to freelancer)
//   SUBMITTED → REJECTED      (client requests revision)
//   REJECTED → IN_PROGRESS    (freelancer resubmits)
//   SUBMITTED / IN_PROGRESS → DISPUTED (either party raises dispute)
//
// ═══════════════════════════════════════════════════════════════════════
// LEDGER PRINCIPLE:
//   We never UPDATE or DELETE ledger rows.
//   We only INSERT (append) new rows.
//   Think of it like a bank statement — each transaction is a permanent record.
//   This means you can audit every rupee at any time.
// ═══════════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { MilestoneStatus, LedgerType } from '../types';
import { db } from '../db';
import { isValidPaise } from '../utils/money';
import { config } from '../config';

// ─── State machine: allowed transitions ───────────────────────────────────────
// This map defines which transitions are legal.
// If a requested transition isn't here, we reject it.
const ALLOWED_TRANSITIONS: Partial<Record<MilestoneStatus, MilestoneStatus[]>> = {
  PENDING:     ['FUNDED'],
  FUNDED:      ['IN_PROGRESS'],
  IN_PROGRESS: ['SUBMITTED', 'DISPUTED'],
  SUBMITTED:   ['APPROVED', 'REJECTED', 'DISPUTED'],
  APPROVED:    ['RELEASED'],
  REJECTED:    ['IN_PROGRESS'],
  DISPUTED:    [], // only mediator can resolve a dispute (done via disputes route)
};

/**
 * canTransition — checks if a state change is legal.
 * This is called before every milestone status update.
 */
export function canTransition(from: MilestoneStatus, to: MilestoneStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── fundMilestone ─────────────────────────────────────────────────────────────
/**
 * Client funds a milestone: lock funds in the project escrow.
 *
 * What happens in one atomic database transaction:
 * 1. Verify the milestone is PENDING
 * 2. Verify the client has enough wallet balance
 * 3. Deduct from client wallet
 * 4. Append a LOCK ledger entry
 * 5. Set milestone status to FUNDED
 *
 * Using db.$transaction ensures steps 3-5 either ALL succeed or ALL fail.
 * You can't end up with money deducted but milestone not funded.
 */
export async function fundMilestone(milestoneId: number, clientId: number) {
  const milestone = await db.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true },
  });

  if (!milestone)                              throw new Error('Milestone not found.');
  if (milestone.project.clientId !== clientId) throw new Error('Not your project.');
  if (milestone.status !== 'PENDING')          throw new Error(`Cannot fund a milestone in ${milestone.status} status.`);
  if (!isValidPaise(milestone.amount))         throw new Error('Invalid milestone amount.');

  const client = await db.user.findUnique({ where: { id: clientId } });
  if (!client || client.walletBalance < milestone.amount) {
    throw new Error(`Insufficient wallet balance. Need ₹${(milestone.amount / 100).toFixed(2)}, have ₹${((client?.walletBalance ?? 0) / 100).toFixed(2)}.`);
  }

  // ⚡ Atomic transaction — all steps or none
  return await db.$transaction(async (tx) => {
    // 1. Deduct from client wallet
    await tx.user.update({
      where: { id: clientId },
      data:  { walletBalance: { decrement: milestone.amount } },
    });

    // 2. Record in ledger (LOCK = client → escrow)
    await tx.ledger.create({
      data: {
        type:        'LOCK',
        amount:      milestone.amount,
        fromUserId:  clientId,
        toUserId:    null, // "escrow" is not a real user — it's just a locked state
        projectId:   milestone.projectId,
        milestoneId: milestone.id,
        note:        `Funds locked for Milestone ${milestone.order}: "${milestone.title}"`,
      },
    });

    // 3. Update milestone status
    const updated = await tx.milestone.update({
      where: { id: milestoneId },
      data:  { status: 'FUNDED' },
    });

    // 4. Notify freelancer
    await tx.notification.create({
      data: {
        userId:  milestone.project.freelancerId,
        message: `Funds locked for Milestone ${milestone.order}: "${milestone.title}". You can start work now.`,
        link:    `/projects/${milestone.projectId}/milestones/${milestone.id}`,
      },
    });

    return updated;
  });
}

// ─── releaseMilestone ──────────────────────────────────────────────────────────
/**
 * Release funds to the freelancer after client approval.
 *
 * What happens atomically:
 * 1. Verify milestone is APPROVED (not already RELEASED — prevents double-release)
 * 2. Credit freelancer wallet
 * 3. Append RELEASE ledger entry
 * 4. Set milestone status to RELEASED
 * 5. Create invoice
 * 6. Check if all milestones released → mark project COMPLETED
 */
export async function releaseMilestone(milestoneId: number, prisma: PrismaClient = db) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: { include: { milestones: true } } },
  });

  if (!milestone)                       throw new Error('Milestone not found.');
  if (milestone.status !== 'APPROVED')  throw new Error(`Cannot release: milestone is ${milestone.status}, must be APPROVED.`);

  return await prisma.$transaction(async (tx) => {
    // 1. Credit freelancer wallet
    await tx.user.update({
      where: { id: milestone.project.freelancerId },
      data:  { walletBalance: { increment: milestone.amount } },
    });

    // 2. Ledger: RELEASE (escrow → freelancer)
    await tx.ledger.create({
      data: {
        type:        'RELEASE',
        amount:      milestone.amount,
        fromUserId:  null, // from escrow (locked funds)
        toUserId:    milestone.project.freelancerId,
        projectId:   milestone.projectId,
        milestoneId: milestone.id,
        note:        `Payment released for Milestone ${milestone.order}: "${milestone.title}"`,
      },
    });

    // 3. Update milestone status
    const updated = await tx.milestone.update({
      where: { id: milestoneId },
      data:  { status: 'RELEASED' },
    });

    // 4. Generate invoice number (INV-0001, INV-0002, ...)
    const invoiceCount = await tx.invoice.count();
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, '0')}`;

    await tx.invoice.create({
      data: {
        invoiceNumber,
        milestoneId: milestone.id,
        projectId:   milestone.projectId,
        clientId:    milestone.project.clientId,
        freelancerId: milestone.project.freelancerId,
        amount:      milestone.amount,
        pdfPath:     `invoices/${invoiceNumber}.pdf`, // generated asynchronously
      },
    });

    // 5. Notify both parties
    await tx.notification.createMany({
      data: [
        {
          userId:  milestone.project.freelancerId,
          message: `💰 Payment of ₹${(milestone.amount / 100).toFixed(2)} released for "${milestone.title}"!`,
          link:    `/invoices`,
        },
        {
          userId:  milestone.project.clientId,
          message: `Invoice generated for "${milestone.title}". Download from your invoices.`,
          link:    `/invoices`,
        },
      ],
    });

    // 6. Check if all milestones are released → complete the project
    const allReleased = milestone.project.milestones.every(
      (m) => m.id === milestoneId || m.status === 'RELEASED'
    );
    if (allReleased) {
      await tx.project.update({
        where: { id: milestone.projectId },
        data:  { status: 'COMPLETED' },
      });
    }

    return updated;
  });
}

// ─── resolveDispute ────────────────────────────────────────────────────────────
/**
 * Mediator resolves a dispute by releasing, refunding, or splitting the funds.
 * This is the most complex money operation — it handles 3 different outcomes.
 */
export async function resolveDispute(
  milestoneId: number,
  resolution: 'RELEASE' | 'REFUND' | 'SPLIT',
  splitPercent: number | null, // 0-100, percentage to freelancer (only for SPLIT)
  mediatorId: number
) {
  const milestone = await db.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true, dispute: true },
  });

  if (!milestone)              throw new Error('Milestone not found.');
  if (milestone.status !== 'DISPUTED') throw new Error('Milestone is not in DISPUTED status.');
  if (!milestone.dispute)      throw new Error('No dispute found for this milestone.');
  if (milestone.dispute.status !== 'OPEN') throw new Error('Dispute is already resolved.');

  const amount = milestone.amount;

  return await db.$transaction(async (tx) => {
    if (resolution === 'RELEASE') {
      // Full release to freelancer (freelancer wins dispute)
      await tx.user.update({
        where: { id: milestone.project.freelancerId },
        data:  { walletBalance: { increment: amount } },
      });
      await tx.ledger.create({
        data: {
          type: 'RELEASE', amount,
          fromUserId: null, toUserId: milestone.project.freelancerId,
          projectId: milestone.projectId, milestoneId,
          note: `Dispute resolved in favour of freelancer for Milestone "${milestone.title}"`,
        },
      });
      await tx.milestone.update({ where: { id: milestoneId }, data: { status: 'RELEASED' } });

    } else if (resolution === 'REFUND') {
      // Full refund to client (client wins dispute)
      await tx.user.update({
        where: { id: milestone.project.clientId },
        data:  { walletBalance: { increment: amount } },
      });
      await tx.ledger.create({
        data: {
          type: 'REFUND', amount,
          fromUserId: null, toUserId: milestone.project.clientId,
          projectId: milestone.projectId, milestoneId,
          note: `Dispute resolved — refund to client for Milestone "${milestone.title}"`,
        },
      });
      await tx.milestone.update({ where: { id: milestoneId }, data: { status: 'PENDING' } });

    } else if (resolution === 'SPLIT') {
      // Split: validate the percentage
      if (splitPercent === null || splitPercent < 0 || splitPercent > 100) {
        throw new Error('splitPercent must be 0–100 for a SPLIT resolution.');
      }
      const freelancerShare = Math.round((amount * splitPercent) / 100);
      const clientShare = amount - freelancerShare; // remainder goes to client

      // Pay freelancer their share
      if (freelancerShare > 0) {
        await tx.user.update({
          where: { id: milestone.project.freelancerId },
          data:  { walletBalance: { increment: freelancerShare } },
        });
        await tx.ledger.create({
          data: {
            type: 'SPLIT', amount: freelancerShare,
            fromUserId: null, toUserId: milestone.project.freelancerId,
            projectId: milestone.projectId, milestoneId,
            note: `Dispute split (${splitPercent}% to freelancer) for Milestone "${milestone.title}"`,
          },
        });
      }

      // Refund client their share
      if (clientShare > 0) {
        await tx.user.update({
          where: { id: milestone.project.clientId },
          data:  { walletBalance: { increment: clientShare } },
        });
        await tx.ledger.create({
          data: {
            type: 'SPLIT', amount: clientShare,
            fromUserId: null, toUserId: milestone.project.clientId,
            projectId: milestone.projectId, milestoneId,
            note: `Dispute split (${100 - splitPercent}% to client) for Milestone "${milestone.title}"`,
          },
        });
      }

      await tx.milestone.update({ where: { id: milestoneId }, data: { status: 'RELEASED' } });
    }

    // Mark dispute as resolved
    const resolvedDispute = await tx.dispute.update({
      where: { milestoneId },
      data: {
        status:       'RESOLVED',
        resolution,
        splitPercent,
        resolvedById: mediatorId,
        resolvedAt:   new Date(),
      },
    });

    // Notify both parties
    await tx.notification.createMany({
      data: [
        {
          userId:  milestone.project.clientId,
          message: `Dispute resolved for "${milestone.title}": ${resolution}${resolution === 'SPLIT' ? ` (${100 - (splitPercent ?? 0)}% refunded to you)` : ''}`,
          link:    `/projects/${milestone.projectId}`,
        },
        {
          userId:  milestone.project.freelancerId,
          message: `Dispute resolved for "${milestone.title}": ${resolution}${resolution === 'SPLIT' ? ` (${splitPercent}% released to you)` : ''}`,
          link:    `/projects/${milestone.projectId}`,
        },
      ],
    });

    return resolvedDispute;
  });
}

// ─── Auto-approve check ───────────────────────────────────────────────────────
/**
 * Called by a periodic job (or manually) to auto-approve milestones
 * that have been in SUBMITTED state for longer than AUTO_APPROVE_DAYS.
 * This protects freelancers from clients who ghost them.
 */
export async function processAutoApprovals() {
  const now = new Date();

  const overdue = await db.milestone.findMany({
    where: {
      status:        'SUBMITTED',
      autoApproveAt: { lte: now }, // autoApproveAt is in the past
    },
  });

  for (const milestone of overdue) {
    // Approve the milestone first, then release
    await db.milestone.update({
      where: { id: milestone.id },
      data:  { status: 'APPROVED' },
    });
    await releaseMilestone(milestone.id);

    await db.notification.create({
      data: {
        userId:  milestone.projectId, // project client
        message: `Milestone "${milestone.title}" was auto-approved after ${config.autoApproveDays} days.`,
        link:    `/projects/${milestone.projectId}`,
      },
    });

    console.log(`[auto-approve] Milestone ${milestone.id} auto-approved.`);
  }
}
