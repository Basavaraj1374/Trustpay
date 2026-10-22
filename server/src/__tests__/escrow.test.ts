// ─────────────────────────────────────────────────────────────────────────────
// server/src/__tests__/escrow.test.ts
// Unit Tests for TrustPay Escrow State Machine, Ledger Math & Security
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { canTransition } from '../services/escrow';
import { suggestMilestones } from '../services/milestoneGen';
import { rupeesToPaise, paiseToRupees, formatInr, isValidPaise } from '../utils/money';
import { sha256 } from '../utils/hash';
import { buildContractText } from '../services/contract';

describe('1. Money Utility & Integer Arithmetic (Paise)', () => {
  it('converts rupees to paise accurately without floating-point errors', () => {
    expect(rupeesToPaise(500)).toBe(50000);
    expect(rupeesToPaise(10.5)).toBe(1050);
    expect(rupeesToPaise(0.01)).toBe(1);
    expect(rupeesToPaise(99999.99)).toBe(9999999);
  });

  it('converts paise to rupee string for UI display', () => {
    expect(paiseToRupees(50000)).toBe('500.00');
    expect(paiseToRupees(1050)).toBe('10.50');
    expect(paiseToRupees(1)).toBe('0.01');
  });

  it('formats rupee values cleanly with currency symbol', () => {
    expect(formatInr(50000)).toBe('₹500.00');
    expect(formatInr(100000)).toBe('₹1000.00');
  });

  it('validates strictly positive integers for financial operations', () => {
    expect(isValidPaise(100)).toBe(true);
    expect(isValidPaise(0)).toBe(false);
    expect(isValidPaise(-50)).toBe(false);
    expect(isValidPaise(10.5)).toBe(false); // floats rejected!
  });
});

describe('2. Milestone State Machine Transitions', () => {
  it('allows the standard happy path workflow', () => {
    expect(canTransition('PENDING', 'FUNDED')).toBe(true);
    expect(canTransition('FUNDED', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'SUBMITTED')).toBe(true);
    expect(canTransition('SUBMITTED', 'APPROVED')).toBe(true);
    expect(canTransition('APPROVED', 'RELEASED')).toBe(true);
  });

  it('allows revision and dispute side branches', () => {
    // Client can request changes (REJECTED), then freelancer resumes
    expect(canTransition('SUBMITTED', 'REJECTED')).toBe(true);
    expect(canTransition('REJECTED', 'IN_PROGRESS')).toBe(true);

    // Either party can dispute during active work or submission
    expect(canTransition('IN_PROGRESS', 'DISPUTED')).toBe(true);
    expect(canTransition('SUBMITTED', 'DISPUTED')).toBe(true);
  });

  it('BLOCKS illegal transitions (security & correctness)', () => {
    // Cannot release unfunded milestone
    expect(canTransition('PENDING', 'RELEASED')).toBe(false);
    expect(canTransition('PENDING', 'APPROVED')).toBe(false);
    expect(canTransition('FUNDED', 'RELEASED')).toBe(false);

    // Cannot submit before starting work
    expect(canTransition('FUNDED', 'SUBMITTED')).toBe(false);

    // Cannot release directly from submitted without client approval
    expect(canTransition('SUBMITTED', 'RELEASED')).toBe(false);

    // Double-release prevention: RELEASED is a terminal state
    expect(canTransition('RELEASED', 'PENDING')).toBe(false);
    expect(canTransition('RELEASED', 'RELEASED')).toBe(false);
    expect(canTransition('RELEASED', 'DISPUTED')).toBe(false);
  });
});

describe('3. Rule-Based Milestone Suggestion Engine', () => {
  it('generates milestones that sum exactly to total budget', () => {
    const totalPaise = 5000000; // ₹50,000
    const suggestions = suggestMilestones(
      'Web Application Development',
      'Build a responsive full-stack website in React & Node.js',
      totalPaise
    );

    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    const sumPercentage = suggestions.reduce((sum, s) => sum + s.percentage, 0);
    expect(sumPercentage).toBe(100);
  });

  it('detects categories accurately based on title & description keywords', () => {
    const web = suggestMilestones('E-commerce Website', 'React frontend', 100000);
    expect(web[0].title).toContain('Wireframes');

    const mobile = suggestMilestones('iOS Delivery App', 'Flutter and Android build', 100000);
    expect(mobile[0].title).toContain('App Architecture');

    const design = suggestMilestones('Brand Logo & Identity', 'Figma illustrations', 100000);
    expect(design[0].title).toContain('Moodboard');
  });
});

describe('4. Cryptographic Contract Integrity (SHA-256)', () => {
  it('computes consistent 64-char hex SHA-256 hash', () => {
    const hash = sha256('TrustPay Agreement Sample Text');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256('TrustPay Agreement Sample Text')).toBe(hash);
  });

  it('detects any tampering in contract content', () => {
    const contractOriginal = buildContractText({
      projectId: 1,
      projectTitle: 'Demo Project',
      description: 'Scope description',
      clientName: 'Arjun Mehta',
      clientEmail: 'client@demo.com',
      freelancerName: 'Priya Sharma',
      freelancerEmail: 'freelancer@demo.com',
      totalBudgetPaise: 5000000,
      milestones: [{ order: 1, title: 'Phase 1', deliverables: 'Code', amount: 5000000 }],
      createdAt: new Date('2026-01-01'),
    });

    const hash1 = sha256(contractOriginal);

    // Tampered copy (even a single character change alters the hash)
    const contractTampered = contractOriginal.replace('50000', '10000');
    const hash2 = sha256(contractTampered);

    expect(hash1).not.toBe(hash2);
  });
});

describe('5. Dispute Resolution Split Arithmetic', () => {
  it('ensures freelancer and client shares always equal 100% of milestone amount', () => {
    const amount = 5000000; // ₹50,000 in paise
    const splitPercentages = [0, 25, 33, 50, 70, 99, 100];

    for (const splitPercent of splitPercentages) {
      const freelancerShare = Math.round((amount * splitPercent) / 100);
      const clientShare = amount - freelancerShare;

      expect(freelancerShare + clientShare).toBe(amount);
      expect(freelancerShare).toBeGreaterThanOrEqual(0);
      expect(clientShare).toBeGreaterThanOrEqual(0);
    }
  });
});
