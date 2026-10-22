// ─────────────────────────────────────────────────────────────────────────────
// types.ts — Shared Types
//
// Since SQLite does not support enums natively, we define them here in TypeScript.
// ─────────────────────────────────────────────────────────────────────────────

export type Role = 'CLIENT' | 'FREELANCER' | 'MEDIATOR';

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type MilestoneStatus = 
  | 'PENDING'
  | 'FUNDED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'RELEASED'
  | 'REJECTED'
  | 'DISPUTED';

export type LedgerType = 'DEPOSIT' | 'LOCK' | 'RELEASE' | 'REFUND' | 'SPLIT';

export type DisputeStatus = 'OPEN' | 'RESOLVED';

export type DisputeResolution = 'RELEASE' | 'REFUND' | 'SPLIT';
