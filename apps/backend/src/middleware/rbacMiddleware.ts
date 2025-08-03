import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import logger from '../services/logger';

/**
 * Role hierarchy mapping - higher values have more permissions
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  VIEWER: 1,
  ADMIN: 2,
};

/**
 * Role-based access control middleware factory
 * @param requiredRole - Minimum role required to access the endpoint
 * @returns Express middleware function
 */
export function rbacMiddleware(requiredRole: UserRole) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if user is attached to request (should be done by authMiddleware first)
      if (!req.user) {
        logger.error(
          {
            path: req.path,
            method: req.method,
            requiredRole,
          },
          'RBAC middleware called without authenticated user - authMiddleware should be called first'
        );

        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const userRole = req.user.role;
      const userRoleLevel = ROLE_HIERARCHY[userRole];
      const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

      // Check if user's role meets the minimum requirement
      if (userRoleLevel < requiredRoleLevel) {
        logger.warn(
          {
            userId: req.user.id,
            email: req.user.email,
            userRole,
            requiredRole,
            path: req.path,
            method: req.method,
          },
          'Access denied - insufficient role permissions'
        );

        res.status(403).json({
          error: 'Forbidden',
          message: `Insufficient permissions. Required role: ${requiredRole}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            userRole,
            requiredRole,
          },
        });
        return;
      }

      logger.debug(
        {
          userId: req.user.id,
          email: req.user.email,
          userRole,
          requiredRole,
          path: req.path,
          method: req.method,
        },
        'RBAC authorization successful'
      );

      next();
    } catch (error) {
      logger.error(
        {
          err: error,
          path: req.path,
          method: req.method,
          requiredRole,
          userId: req.user?.id,
        },
        'RBAC middleware error'
      );

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authorization check failed',
        code: 'RBAC_ERROR',
      });
    }
  };
}

/**
 * Convenience middleware functions for common roles
 */
export const requireAdmin = rbacMiddleware(UserRole.ADMIN);
export const requireViewer = rbacMiddleware(UserRole.VIEWER);

/**
 * Check if a user has a specific role or higher
 * @param userRole - User's current role
 * @param requiredRole - Required minimum role
 * @returns boolean indicating if user has sufficient permissions
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userRoleLevel = ROLE_HIERARCHY[userRole];
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];
  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Check if a user is an admin
 * @param userRole - User's current role
 * @returns boolean indicating if user is an admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}

/**
 * Get all roles that are equal to or lower than the given role
 * @param userRole - User's current role
 * @returns Array of roles the user can manage/access
 */
export function getAccessibleRoles(userRole: UserRole): UserRole[] {
  const userRoleLevel = ROLE_HIERARCHY[userRole];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, level]) => level <= userRoleLevel)
    .map(([role]) => role as UserRole);
}
