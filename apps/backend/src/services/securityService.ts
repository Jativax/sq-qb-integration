import crypto from 'crypto';
import logger from './logger';
import config from '../config';

export class SecurityService {
  /**
   * Validates Square webhook signature using HMAC-SHA256
   * @param request Express request object with raw body attached
   * @returns true if signature is valid, false otherwise
   */
  /**
   * Validates Square webhook signature using HMAC-SHA256.
   * Square signs the **concatenation** of {requestUrl}{rawBody} as a UTF-8 string.
   *
   * @param rawBody Buffer with the raw request body (unparsed)
   * @param requestUrl Full request URL (protocol + host + original path)
   * @param providedSignature Signature from the `x-square-signature` header
   * @returns `true` if signature is valid
   */
  validateSquareSignature(
    rawBody: Buffer,
    requestUrl: string,
    providedSignature: string | undefined
  ): boolean {
    try {
      if (!providedSignature) {
        logger.warn('Missing x-square-signature header');
        return false;
      }

      const signatureKey = config.SQUARE_WEBHOOK_SIGNATURE_KEY;
      if (!signatureKey) {
        logger.error('SQUARE_WEBHOOK_SIGNATURE_KEY not configured');
        return false;
      }

      // Build payload and generate HMAC
      const signaturePayload = requestUrl + rawBody.toString('utf8');
      const hmac = crypto.createHmac('sha256', signatureKey);
      hmac.update(signaturePayload, 'utf8');
      const generatedSignature = hmac.digest('base64');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(providedSignature, 'utf8'),
        Buffer.from(generatedSignature, 'utf8')
      );

      if (!isValid) {
        logger.warn(
          {
            providedSignature: providedSignature.substring(0, 10) + '...',
            generatedSignature: generatedSignature.substring(0, 10) + '...',
            requestUrl,
            bodyLength: rawBody.length,
          },
          'Square webhook signature validation failed'
        );
      }

      return isValid;
    } catch (error) {
      logger.error({ err: error }, 'Error during signature validation');
      return false;
    }
  }

  /**
   * Validates if the required environment variables are configured
   * @returns true if all required environment variables are present
   */
  validateConfiguration(): boolean {
    const requiredEnvVars = ['SQUARE_WEBHOOK_SIGNATURE_KEY'];
    const missingVars = requiredEnvVars.filter(
      varName => !config[varName as keyof typeof config]
    );

    if (missingVars.length > 0) {
      logger.error(
        { missingVars },
        'Missing required environment variables for SecurityService'
      );
      return false;
    }

    return true;
  }
}
