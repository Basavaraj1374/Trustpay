// ─────────────────────────────────────────────────────────────────────────────
// index.ts — Server entry point
//
// This file:
// 1. Creates the Express app
// 2. Attaches security middleware (helmet, cors, rate-limit)
// 3. Mounts all API route handlers
// 4. Attaches Socket.io for real-time chat
// 5. Starts listening on the configured port
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { Server as SocketServer } from 'socket.io';

import { config } from './config';
import { registerChatHandlers } from './socket/chat';

// Route modules (we'll fill these in step-by-step)
import authRoutes          from './routes/auth';
import userRoutes          from './routes/users';
import projectRoutes       from './routes/projects';
import milestoneRoutes     from './routes/milestones';
import contractRoutes      from './routes/contracts';
import walletRoutes        from './routes/wallet';
import disputeRoutes       from './routes/disputes';
import invoiceRoutes       from './routes/invoices';
import notificationRoutes  from './routes/notifications';

// ─── Setup folders that must exist ───────────────────────────────────────────
[config.invoicesDir, config.uploadsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Create Express app ───────────────────────────────────────────────────────
const app = express();

// ─── Security middleware ──────────────────────────────────────────────────────

// helmet sets HTTP security headers automatically (prevents clickjacking, etc.)
app.use(helmet());

// cors allows our React frontend to call this API
// Without this, browsers block cross-origin requests
app.use(cors({
  origin: config.clientUrl,
  credentials: true, // allow cookies / auth headers
}));

// Parse incoming JSON request bodies
app.use(express.json());

// Serve generated invoices as static files so the frontend can download them
app.use('/invoices', express.static(path.resolve(config.invoicesDir)));

// ─── API Routes ───────────────────────────────────────────────────────────────
// Each route file handles a specific resource.
// "Protected" routes validate the JWT token before doing anything.
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/projects',      projectRoutes);
app.use('/api/milestones',    milestoneRoutes);
app.use('/api/contracts',     contractRoutes);
app.use('/api/wallet',        walletRoutes);
app.use('/api/disputes',      disputeRoutes);
app.use('/api/invoices',      invoiceRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// If any route throws an error, Express passes it here.
// We return a clean JSON error instead of crashing.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Socket.io setup ─────────────────────────────────────────────────────────
// Socket.io needs a plain HTTP server (not just Express) to attach to
const httpServer = http.createServer(app);

const io = new SocketServer(httpServer, {
  cors: { origin: config.clientUrl, credentials: true },
});

// Register all chat event handlers
registerChatHandlers(io);

// ─── Start server ─────────────────────────────────────────────────────────────
httpServer.listen(config.port, () => {
  console.log(`
  ✅ TrustPay server running
  ─────────────────────────────
  🌐 API:    http://localhost:${config.port}/api
  🔌 Socket: http://localhost:${config.port}
  💡 Health: http://localhost:${config.port}/api/health
  `);
});

export { io }; // exported so other modules can emit events
