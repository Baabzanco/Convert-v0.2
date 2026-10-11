import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma.js';
import { hashSessionToken, logSecurityAuditEvent } from '../db/security.js';

export interface AuthenticatedAdminRequest extends Request {
  adminUser?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  sessionId?: string;
}

/**
 * Server-side authentication and authorization middleware.
 * Verifies HTTP-only SameSite session cookie against PostgreSQL admin_sessions.
 */
export async function requireAdminAuth(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionToken = req.cookies?.admin_session;

  if (!sessionToken || typeof sessionToken !== 'string') {
    res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHENTICATED',
    });
    return;
  }

  try {
    const hashedToken = hashSessionToken(sessionToken);

    const session = await prisma.adminSession.findUnique({
      where: { sessionToken: hashedToken },
      include: { adminUser: true },
    });

    if (!session) {
      res.clearCookie('admin_session');
      res.status(401).json({
        error: 'Invalid or revoked session',
        code: 'SESSION_INVALID',
      });
      return;
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
      res.clearCookie('admin_session');
      res.status(401).json({
        error: 'Session expired',
        code: 'SESSION_EXPIRED',
      });
      return;
    }

    // Verify admin user is active
    if (!session.adminUser.isActive) {
      await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
      res.clearCookie('admin_session');
      res.status(403).json({
        error: 'Administrator account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
      return;
    }

    // Update session lastActiveAt (throttled to once every 2 minutes)
    const now = new Date();
    if (now.getTime() - session.lastActiveAt.getTime() > 120_000) {
      await prisma.adminSession.update({
        where: { id: session.id },
        data: { lastActiveAt: now },
      }).catch(() => {});
    }

    req.adminUser = {
      id: session.adminUser.id,
      username: session.adminUser.username,
      email: session.adminUser.email,
      role: session.adminUser.role,
    };
    req.sessionId = session.id;

    next();
  } catch (error: any) {
    console.error('[Auth Middleware] Verification error:', error.message);
    res.status(500).json({
      error: 'Internal authorization error',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Role-Based Access Control (RBAC) middleware generator.
 */
export function requireAdminRole(roles: string[]) {
  return (req: AuthenticatedAdminRequest, res: Response, next: NextFunction): void => {
    if (!req.adminUser || !roles.includes(req.adminUser.role)) {
      void logSecurityAuditEvent({
        action: 'ACCESS_DENIED_UNAUTHORIZED_ROLE',
        adminUserId: req.adminUser?.id,
        status: 'WARN',
        details: {
          requiredRoles: roles,
          userRole: req.adminUser?.role,
          path: req.originalUrl,
        },
      });

      res.status(403).json({
        error: 'Forbidden: Insufficient privileges for this operation',
        code: 'FORBIDDEN_ROLE',
      });
      return;
    }
    next();
  };
}
