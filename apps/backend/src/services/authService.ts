import { PrismaClient, User, Session, UserRole } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';
import { getPrismaClient } from './db';
import logger from './logger';

/**
 * Interface for login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Interface for login response
 */
export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Interface for session validation response
 */
export interface SessionValidationResponse {
  user: User;
  session: Session;
}

/**
 * AuthService provides comprehensive authentication and session management
 */
export class AuthService {
  private readonly prismaClient: PrismaClient;
  private readonly sessionExpiryHours: number = 24; // 24 hours

  constructor() {
    this.prismaClient = getPrismaClient();
  }

  /**
   * Authenticate user with email and password, create a session
   * @param credentials - User email and password
   * @returns Promise resolving to login response with token and user info
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const { email, password } = credentials;

      logger.info({ email }, 'Attempting user login');

      // Find user by email
      const user = await this.prismaClient.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        logger.warn({ email }, 'Login attempt with non-existent email');
        throw new Error('Invalid email or password');
      }

      // Verify password using Argon2
      const isPasswordValid = await argon2.verify(user.password, password);

      if (!isPasswordValid) {
        logger.warn(
          { email, userId: user.id },
          'Login attempt with invalid password'
        );
        throw new Error('Invalid email or password');
      }

      // Generate secure session token
      const token = this.generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.sessionExpiryHours);

      // Create session in database
      const session = await this.prismaClient.session.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      logger.info(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId: session.id,
        },
        'User logged in successfully'
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      logger.error(
        {
          err: error,
          email: credentials.email,
        },
        'Login failed'
      );
      throw error;
    }
  }

  /**
   * Invalidate user session (logout)
   * @param token - Session token to invalidate
   * @returns Promise resolving when session is deleted
   */
  async logout(token: string): Promise<void> {
    try {
      logger.info({ token: this.maskToken(token) }, 'Attempting user logout');

      const session = await this.prismaClient.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!session) {
        logger.warn(
          { token: this.maskToken(token) },
          'Logout attempt with invalid token'
        );
        throw new Error('Invalid session token');
      }

      // Delete session from database
      await this.prismaClient.session.delete({
        where: { token },
      });

      logger.info(
        {
          userId: session.user.id,
          email: session.user.email,
          sessionId: session.id,
        },
        'User logged out successfully'
      );
    } catch (error) {
      logger.error(
        {
          err: error,
          token: this.maskToken(token),
        },
        'Logout failed'
      );
      throw error;
    }
  }

  /**
   * Validate session token and return associated user
   * @param token - Session token to validate
   * @returns Promise resolving to user and session if valid
   */
  async validateSession(token: string): Promise<SessionValidationResponse> {
    try {
      if (!token) {
        throw new Error('Session token is required');
      }

      // Find session with user data
      const session = await this.prismaClient.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!session) {
        logger.warn(
          { token: this.maskToken(token) },
          'Session validation failed - token not found'
        );
        throw new Error('Invalid session token');
      }

      // Check if session has expired
      if (session.expiresAt < new Date()) {
        logger.warn(
          {
            sessionId: session.id,
            userId: session.user.id,
            expiresAt: session.expiresAt,
          },
          'Session validation failed - token expired'
        );

        // Clean up expired session
        await this.prismaClient.session.delete({
          where: { id: session.id },
        });

        throw new Error('Session token has expired');
      }

      // Optionally extend session on successful validation
      const extendedExpiresAt = new Date();
      extendedExpiresAt.setHours(
        extendedExpiresAt.getHours() + this.sessionExpiryHours
      );

      await this.prismaClient.session.update({
        where: { id: session.id },
        data: { expiresAt: extendedExpiresAt },
      });

      logger.debug(
        {
          userId: session.user.id,
          sessionId: session.id,
        },
        'Session validated and extended successfully'
      );

      return {
        user: session.user,
        session,
      };
    } catch (error) {
      logger.error(
        {
          err: error,
          token: this.maskToken(token),
        },
        'Session validation failed'
      );
      throw error;
    }
  }

  /**
   * Clean up expired sessions (can be called periodically)
   * @returns Promise resolving to number of cleaned sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      logger.info('Starting cleanup of expired sessions');

      const result = await this.prismaClient.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info({ count: result.count }, 'Cleaned up expired sessions');
      return result.count;
    } catch (error) {
      logger.error({ err: error }, 'Failed to cleanup expired sessions');
      throw error;
    }
  }

  /**
   * Get all active sessions for a user
   * @param userId - User ID to get sessions for
   * @returns Promise resolving to array of active sessions
   */
  async getActiveSessions(userId: string): Promise<Session[]> {
    try {
      const sessions = await this.prismaClient.session.findMany({
        where: {
          userId,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      logger.info(
        { userId, count: sessions.length },
        'Retrieved active sessions for user'
      );
      return sessions;
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get active sessions');
      throw error;
    }
  }

  /**
   * Generate a secure session token
   * @private
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Mask token for logging (show only first/last few characters)
   * @private
   */
  private maskToken(token: string): string {
    if (!token || token.length < 8) {
      return '***';
    }
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  }
}

// Export a singleton instance for easy use across the application
export const authService = new AuthService();
export default authService;
