// ─────────────────────────────────────────────────────────────────────────────
// hash.ts — Cryptographic hashing utility
//
// Used for:
// 1. Generating the SHA-256 fingerprint of a signed contract
//    (proves it wasn't changed after signing)
// 2. Creating unique invoice numbers
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto'; // built-in Node.js module — no extra package needed

/**
 * Generate SHA-256 hash of any string.
 * SHA-256 is a one-way function: you can always verify the hash but you
 * cannot reverse it to get the original text. This is how we prove a
 * contract wasn't tampered with after signing.
 *
 * @example sha256('hello') → "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c..."
 */
export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Generate a random hex string of a given byte length.
 * Used internally for unique IDs when needed.
 */
export function randomHex(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}
