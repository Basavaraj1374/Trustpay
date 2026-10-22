// ─────────────────────────────────────────────────────────────────────────────
// config.ts — Central place for all environment variables
//
// WHY: Instead of calling process.env.JWT_SECRET everywhere in the code,
// we load everything here once. If a required variable is missing, the app
// crashes immediately at startup with a clear error — better than a confusing
// failure later.
// ─────────────────────────────────────────────────────────────────────────────

import dotenv from 'dotenv';
dotenv.config(); // loads .env file into process.env

// Helper: read an env var or throw a clear error
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port:           parseInt(process.env.PORT || '5000', 10),
  clientUrl:      process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret:      requireEnv('JWT_SECRET'),
  jwtExpiresIn:   process.env.JWT_EXPIRES_IN || '7d',

  // After this many days with no client response, a SUBMITTED milestone
  // is automatically approved (protects freelancers from ghosting clients)
  autoApproveDays: parseInt(process.env.AUTO_APPROVE_DAYS || '7', 10),

  // Max wallet top-up per API call (in paise). Default: ₹10,00,000
  maxTopupPaise: parseInt(process.env.MAX_TOPUP_PAISE || '100000000', 10),

  // Directory paths
  invoicesDir: process.env.INVOICES_DIR || './invoices',
  uploadsDir:  process.env.UPLOADS_DIR  || './uploads',
} as const;
