import { Request, Response, NextFunction } from 'express';
import { User } from '@prisma/client';
import authService from '../services/authService';
import logger from '../services/logger';

/**
 * Extend Express Request interface to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Authentication middleware that validates session tokens
 * and attaches user information to the request
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(
        {
          path: req.path,
          method: req.method,
          ip: req.ip,
        },
        'Authentication failed - missing or invalid Authorization header'
      );

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
        code: 'MISSING_AUTH_HEADER',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate session token
    const { user } = await authService.validateSession(token);

    // Attach user to request object
    req.user = user;

    logger.debug(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        path: req.path,
        method: req.method,
      },
      'Authentication successful'
    );

    next();
  } catch (error) {
    logger.warn(
      {
        err: error,
        path: req.path,
        method: req.method,
        ip: req.ip,
      },
      'Authentication failed'
    );

    // Determine appropriate error response
    let statusCode = 401;
    let message = 'Invalid or expired session token';
    let code = 'INVALID_SESSION';

    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        code = 'SESSION_EXPIRED';
        message = 'Session has expired, please login again';
      } else if (error.message.includes('Invalid session token')) {
        code = 'INVALID_TOKEN';
        message = 'Invalid session token';
      }
    }

    res.status(statusCode).json({
      error: 'Unauthorized',
      message,
      code,
    });
  }
}

/**
 * Optional authentication middleware that doesn't fail if no token is provided
 * but validates the token if present
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      next();
      return;
    }

    const token = authHeader.substring(7);

    try {
      const { user } = await authService.validateSession(token);
      req.user = user;

      logger.debug(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          path: req.path,
          method: req.method,
        },
        'Optional authentication successful'
      );
    } catch (error) {
      // Token was provided but invalid, log warning but don't fail
      logger.warn(
        {
          err: error,
          path: req.path,
          method: req.method,
        },
        'Optional authentication failed - continuing without user'
      );
    }

    next();
  } catch (error) {
    logger.error(
      {
        err: error,
        path: req.path,
        method: req.method,
      },
      'Unexpected error in optional auth middleware'
    );

    // Don't fail on unexpected errors in optional middleware
    next();
  }
}
