import express from 'express';
import authService, { LoginCredentials } from '../services/authService';
import auditService from '../services/auditService';
import { authMiddleware } from '../middleware/authMiddleware';
import logger from '../services/logger';

const router: express.Router = express.Router();

/**
 * POST /api/v1/auth/login
 * Authenticate user with email and password
 */
router.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password }: LoginCredentials = req.body;

    // Validate request body
    if (!email || !password) {
      logger.warn({ email }, 'Login attempt with missing credentials');

      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn({ email }, 'Login attempt with invalid email format');

      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT',
      });
      return;
    }

    // Attempt login
    const loginResponse = await authService.login({ email, password });

    // Log successful login in audit trail
    await auditService.logEvent({
      action: 'USER_LOGIN',
      userId: loginResponse.user.id,
      details: {
        email: loginResponse.user.email,
        role: loginResponse.user.role,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      },
    });

    logger.info(
      {
        userId: loginResponse.user.id,
        email: loginResponse.user.email,
        role: loginResponse.user.role,
      },
      'User login successful'
    );

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: loginResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error, email: req.body?.email }, 'Login failed');

    // Don't expose internal error details for security
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid email or password',
      code: 'LOGIN_FAILED',
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Invalidate user session (requires authentication)
 */
router.post(
  '/logout',
  authMiddleware,
  async (req: express.Request, res: express.Response) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7); // Remove 'Bearer ' prefix

      if (!token) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Session token is required',
          code: 'MISSING_TOKEN',
        });
        return;
      }

      // Get user info before logout (from authMiddleware)
      const user = req.user!;

      // Perform logout
      await authService.logout(token);

      // Log logout in audit trail
      await auditService.logEvent({
        action: 'USER_LOGOUT',
        userId: user.id,
        details: {
          email: user.email,
          role: user.role,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
        },
      });

      logger.info(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        'User logout successful'
      );

      res.status(200).json({
        status: 'success',
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error, userId: req.user?.id }, 'Logout failed');

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Logout failed',
        code: 'LOGOUT_ERROR',
      });
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Get current user information (requires authentication)
 */
router.get(
  '/me',
  authMiddleware,
  async (req: express.Request, res: express.Response) => {
    try {
      const user = req.user!;

      // Get active sessions count
      const activeSessions = await authService.getActiveSessions(user.id);

      logger.debug({ userId: user.id }, 'User info requested');

      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          sessionInfo: {
            activeSessionsCount: activeSessions.length,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        { err: error, userId: req.user?.id },
        'Failed to get user info'
      );

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve user information',
        code: 'USER_INFO_ERROR',
      });
    }
  }
);

/**
 * POST /api/v1/auth/refresh
 * Refresh session (extends expiry) - requires authentication
 */
router.post(
  '/refresh',
  authMiddleware,
  async (req: express.Request, res: express.Response) => {
    try {
      const user = req.user!;

      logger.info({ userId: user.id }, 'Session refresh successful');

      res.status(200).json({
        status: 'success',
        message: 'Session refreshed successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        { err: error, userId: req.user?.id },
        'Session refresh failed'
      );

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Session refresh failed',
        code: 'REFRESH_ERROR',
      });
    }
  }
);

export default router;
