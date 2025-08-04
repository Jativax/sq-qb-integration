import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metricsService';

/**
 * Express middleware to track API request metrics
 * Records request duration, method, route, status code, and user agent
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip metrics for the metrics endpoint itself to avoid recursive collection
  if (req.path === '/metrics') {
    next();
    return;
  }

  const startTime = Date.now();

  // Store original res.end to capture when response is sent
  const originalEnd = res.end;

  // Override res.end to capture metrics when response completes
  res.end = function (...args: unknown[]): Response {
    // Calculate request duration in seconds
    const duration = (Date.now() - startTime) / 1000;

    // Get route pattern (if available) or use the original URL
    const route = req.route?.path || req.path || 'unknown';

    // Extract user agent
    const userAgent = req.get('User-Agent') || 'unknown';

    // Record the API request metrics
    metricsService.recordApiRequest(
      req.method,
      route,
      res.statusCode,
      duration,
      userAgent
    );

    // Call original res.end with all arguments
    return (
      originalEnd as (this: Response, ...args: unknown[]) => Response
    ).apply(this, args);
  };

  next();
}

/**
 * Enhanced middleware that can also capture route patterns more accurately
 * Use this for specific routes where you want more detailed tracking
 */
export function enhancedMetricsMiddleware(routeName?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const originalEnd = res.end;

    res.end = function (...args: unknown[]): Response {
      const duration = (Date.now() - startTime) / 1000;

      // Use provided route name or fallback to detected route
      const route = routeName || req.route?.path || req.path || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      metricsService.recordApiRequest(
        req.method,
        route,
        res.statusCode,
        duration,
        userAgent
      );

      return (
        originalEnd as (this: Response, ...args: unknown[]) => Response
      ).apply(this, args);
    };

    next();
  };
}

/**
 * Middleware specifically for webhook endpoints with custom metrics
 */
export function webhookMetricsMiddleware(webhookSource: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const originalEnd = res.end;

    res.end = function (...args: unknown[]): Response {
      const duration = (Date.now() - startTime) / 1000;
      const route = req.route?.path || req.path || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Record standard API metrics
      metricsService.recordApiRequest(
        req.method,
        route,
        res.statusCode,
        duration,
        userAgent
      );

      // Record webhook-specific metrics
      let webhookStatus: 'accepted' | 'rejected' | 'failed';
      if (res.statusCode === 202) {
        webhookStatus = 'accepted';
      } else if (res.statusCode >= 400 && res.statusCode < 500) {
        webhookStatus = 'rejected';
      } else {
        webhookStatus = 'failed';
      }

      // Extract event type from request body if available
      const eventType = req.body?.type || 'unknown';

      metricsService.recordWebhookReceived(
        webhookSource,
        eventType,
        webhookStatus
      );

      return (
        originalEnd as (this: Response, ...args: unknown[]) => Response
      ).apply(this, args);
    };

    next();
  };
}
