import pino from 'pino';
import config from '../config';

// Determine environment
const isProduction = config.NODE_ENV === 'production';
const isDevelopment = config.NODE_ENV === 'development';

// Configure logger options
const loggerOptions: pino.LoggerOptions = {
  level: isDevelopment ? 'debug' : 'info',
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    },
  }),
  // In production, use standard JSON format (no transport)
  ...(isProduction && {
    formatters: {
      level: label => {
        return { level: label.toUpperCase() };
      },
    },
  }),
};

// Create singleton logger instance
const logger = pino(loggerOptions);

// Export the logger instance
export default logger;

// Export typed logger for better IDE support
export { logger };
