// ─────────────────────────────────────────────────────────────────────────────
// middleware/auth.ts — JWT verification + role-based access control
//
// HOW JWT WORKS (simple explanation):
// 1. User logs in → server creates a signed token with their userId and role
// 2. Client stores that token and sends it in every request header
// 3. Server verifies the token's signature — if valid, trusts the userId inside
// 4. No database lookup needed on every request! The token is self-contained.
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Role } from '../types';

// Extend Express's Request type to include our user info
// After authenticate() runs, any route handler can read req.user safely
export interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    role: Role;
  };
}

/**
 * authenticate — verifies the JWT in the Authorization header.
 *
 * Usage: router.get('/protected', authenticate, handler)
 *
 * The client sends: Authorization: Bearer <token>
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 1. Pull the token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided. Please log in.' });
    return;
  }

  const token = authHeader.split(' ')[1]; // "Bearer <token>" → "<token>"

  // 2. Verify the token's signature using our secret
  //    If expired or tampered with, jwt.verify() throws an error
  try {
    const payload = jwt.verify(token, config.jwtSecret) as {
      userId: number;
      role: Role;
    };

    // 3. Attach the decoded user info to the request object
    //    Route handlers can now use req.user.userId, req.user.role
    (req as AuthenticatedRequest).user = payload;

    next(); // proceed to the actual route handler
  } catch {
    res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

/**
 * requireRole — checks that the logged-in user has one of the allowed roles.
 *
 * Usage: router.post('/', authenticate, requireRole('CLIENT'), handler)
 *
 * This prevents, for example, a FREELANCER from creating projects
 * or a CLIENT from submitting milestone work.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!roles.includes(user.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }
    next();
  };
}
