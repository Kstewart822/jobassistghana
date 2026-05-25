/**
 * Reusable RBAC (Role-Based Access Control) middleware
 */
import { AuthorizationError } from '../lib/errors.mjs';
import logger from '../utils/logger.mjs';

/**
 * Require specific roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('User not authenticated');
      }

      if (!roles.includes(req.user.role)) {
        logger.warn('Authorization failed', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: roles,
          path: req.path,
        });
        throw new AuthorizationError(`This action requires one of the following roles: ${roles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require specific permissions
 */
export function requirePermission(...permissions) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('User not authenticated');
      }

      const userPermissions = req.user.permissions || [];
      const hasPermission = permissions.some((perm) => userPermissions.includes(perm));

      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId: req.user.id,
          requiredPermissions: permissions,
          path: req.path,
        });
        throw new AuthorizationError(`This action requires one of the following permissions: ${permissions.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require user to own the resource
 */
export function requireOwnership(resourceIdField = 'id') {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('User not authenticated');
      }

      const resourceId = req.params[resourceIdField] || req.body[resourceIdField];

      if (req.user.id !== resourceId) {
        logger.warn('Ownership check failed', {
          userId: req.user.id,
          resourceId,
          path: req.path,
        });
        throw new AuthorizationError('You do not have permission to access this resource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Role-based RBAC with specific role requirements
 */
export const rbac = {
  requireRole,
  requirePermission,
  requireOwnership,

  // Predefined role sets
  adminOnly: () => requireRole('admin'),
  employerOnly: () => requireRole('employer'),
  candidateOnly: () => requireRole('candidate'),
  notAnonymous: () => (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }
      next();
    } catch (error) {
      next(error);
    }
  },
};

export default rbac;
