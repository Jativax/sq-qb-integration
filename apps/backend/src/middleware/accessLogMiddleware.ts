import pinoHttp from 'pino-http';
import logger from '../services/logger';
import config, {
  ACCESS_LOG_SAMPLING_RATE,
  ACCESS_LOG_INCLUDE_BODY,
} from '../config';

/**
 * Access logging middleware using pino-http with sampling and security considerations
 */
export const accessLogMiddleware = pinoHttp({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: logger as any, // Type workaround for pino-http compatibility

  // Sampling for production environments
  autoLogging: {
    // Sample requests based on configuration
    ignore: req => {
      // Always log errors and important endpoints
      if (req.url?.includes('/health') || req.url?.includes('/metrics')) {
        return true; // Skip health/metrics endpoints to reduce noise
      }

      // Apply sampling rate
      return Math.random() > ACCESS_LOG_SAMPLING_RATE;
    },
  },

  // Custom serializers for security and performance
  serializers: {
    req: req => ({
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
      userAgent: req.headers?.['user-agent'],
      referer: req.headers?.referer,
      // Conditionally include body for debugging (be careful with sensitive data)
      ...(ACCESS_LOG_INCLUDE_BODY &&
        config.NODE_ENV !== 'production' &&
        req.method !== 'GET' && {
          body:
            req.body && typeof req.body === 'object'
              ? sanitizeRequestBody(req.body)
              : req.body,
        }),
    }),

    res: res => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.getHeader('content-type'),
        'content-length': res.getHeader('content-length'),
        'x-response-time': res.getHeader('x-response-time'),
      },
      // Only include response body in non-production for debugging
      ...(ACCESS_LOG_INCLUDE_BODY &&
        config.NODE_ENV !== 'production' &&
        {
          // Note: This would require custom response capture which is complex
          // For now, we'll skip response body logging for security
        }),
    }),

    err: err => ({
      type: err.constructor.name,
      message: err.message,
      stack: config.NODE_ENV !== 'production' ? err.stack : undefined,
    }),
  },

  // Custom log level based on response status
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    } else if (res.statusCode >= 300 && res.statusCode < 400) {
      return 'info';
    }
    return 'info';
  },

  // Include request duration
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration',
  },

  // Custom success message
  customSuccessMessage: function (req, res) {
    const duration = res.getHeader('x-response-time') || 0;
    return `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`;
  },

  // Custom error message
  customErrorMessage: function (req, res, err) {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
});

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'authorization',
    'credential',
    'privateKey',
    'accessToken',
    'refreshToken',
  ];

  const sanitized = { ...body };

  const sanitizeObject = (obj: unknown): unknown => {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  };

  return sanitizeObject(sanitized);
}

/**
 * Middleware for webhook-specific access logging with enhanced context
 */
export const webhookAccessLogMiddleware = pinoHttp({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: logger as any, // Type workaround for pino-http compatibility

  serializers: {
    req: req => ({
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
      headers: {
        'user-agent': req.headers?.['user-agent'],
        'x-square-signature': req.headers?.['x-square-signature']
          ? '[PRESENT]'
          : '[MISSING]',
        'content-type': req.headers?.['content-type'],
        'content-length': req.headers?.['content-length'],
      },
      // Include webhook-specific metadata
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webhookType: (req as any).body?.type,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventId: (req as any).body?.event_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      merchantId: (req as any).body?.merchant_id,
    }),

    res: res => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.getHeader('content-type'),
        'x-response-time': res.getHeader('x-response-time'),
      },
    }),
  },

  customLogLevel: function (req, res, err) {
    // Webhook failures are more critical
    if (res.statusCode >= 400 || err) {
      return 'error';
    }
    return 'info';
  },

  customSuccessMessage: function (req, res) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (req as any).body; // Type workaround for Express req.body
    const eventType = body?.type || 'unknown';
    const eventId = body?.event_id || 'no-id';
    const duration = res.getHeader('x-response-time') || 0;
    return `Webhook ${eventType} (${eventId}) processed - ${res.statusCode} - ${duration}ms`;
  },
});
