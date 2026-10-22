// ─────────────────────────────────────────────────────────────────────────────
// services/autoApprove.ts — Cron job for auto-approving milestones
//
// WHY: If a freelancer submits work and the client ignores it, the freelancer
// shouldn't have their money trapped forever. We run this periodically.
// ─────────────────────────────────────────────────────────────────────────────

import { processAutoApprovals } from './escrow';

/**
 * startAutoApproveCron — Sets up an interval to check for overdue milestones
 * every hour. In a production app, you might use a library like node-cron,
 * but setInterval is sufficient for this project.
 */
export function startAutoApproveCron() {
  console.log('⏳ Auto-approve cron job started. Checking every hour.');
  
  // Run immediately on startup
  processAutoApprovals().catch(console.error);

  // Then run every hour (60 * 60 * 1000 ms)
  setInterval(() => {
    processAutoApprovals().catch(console.error);
  }, 60 * 60 * 1000);
}
