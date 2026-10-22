// ─────────────────────────────────────────────────────────────────────────────
// money.ts — Helper functions for working with money safely
//
// WHY integers? Floating point (0.1 + 0.2 = 0.30000000000000004) causes bugs
// in financial software. We store everything in PAISE (smallest unit of INR):
//   ₹1    = 100 paise
//   ₹500  = 50,000 paise
//   ₹1000 = 1,00,000 paise
//
// When showing to the user, we convert paise → ₹ just for display.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert rupees (from user input like "500") to paise (integer).
 * Always rounds to nearest paisa to avoid any floating-point weirdness.
 *
 * @example rupeesToPaise(500) → 50000
 * @example rupeesToPaise(10.5) → 1050
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Convert paise (from database) to rupees string for display.
 *
 * @example paiseToRupees(50000) → "500.00"
 * @example paiseToRupees(1050) → "10.50"
 */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

/**
 * Format paise as a human-readable rupee string with symbol.
 *
 * @example formatInr(50000) → "₹500.00"
 */
export function formatInr(paise: number): string {
  return `₹${paiseToRupees(paise)}`;
}

/**
 * Validate that a paise amount is a positive integer.
 * Used in service layer before any money operation.
 */
export function isValidPaise(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}
