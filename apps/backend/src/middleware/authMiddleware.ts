import { Request, Response, NextFunction } from 'express';
import { SecurityService } from '../services/securityService';

/**
 * Middleware to verify Square webhook signatures
 * This middleware validates that incoming webhooks are authentic by verifying the signature
 */
export const verifySquareWebhook = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    console.log('🔐 Verifying Square webhook signature...');

    // Instantiate the SecurityService
    const securityService = new SecurityService();

    // Validate configuration first
    if (!securityService.validateConfiguration()) {
      console.error('❌ SecurityService configuration invalid');
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Security service configuration error',
        code: 'SECURITY_CONFIG_ERROR',
      });
      return;
    }

    // Check for test bypass (for E2E testing)
    const testSignature = req.get('x-square-signature');
    if (
      process.env['NODE_ENV'] === 'test' &&
      testSignature === 'VALID_TEST_SIGNATURE'
    ) {
      console.log('✅ Test signature bypass activated');
      next();
      return;
    }

    // Validate the signature
    const isValidSignature = securityService.validateSquareSignature(req);

    if (!isValidSignature) {
      console.warn('⚠️ Invalid Square webhook signature detected');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook signature',
        code: 'INVALID_SIGNATURE',
      });
      return;
    }

    console.log('✅ Square webhook signature validated successfully');

    // If validation succeeds, proceed to the next middleware/route handler
    next();
  } catch (error) {
    console.error('❌ Error in webhook signature verification:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during signature verification',
      code: 'SIGNATURE_VERIFICATION_ERROR',
    });
    return;
  }
};
