// ─────────────────────────────────────────────────────────────────────────────
// db.ts — Prisma client singleton
//
// WHY a singleton? Prisma recommends creating ONE PrismaClient instance and
// reusing it. Creating a new instance per request would open too many database
// connections and slow everything down.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

// 'declare global' lets us attach a property to Node's global object.
// This prevents creating multiple PrismaClient instances during hot-reloads
// in development (nodemon restarts the module but 'global' persists).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const db: PrismaClient = global.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = db;
}
