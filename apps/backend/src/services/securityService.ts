import { Request } from 'express';
import crypto from 'crypto';

export class SecurityService {
  /**
   * Validates Square webhook signature using HMAC-SHA256
   * @param request Express request object with raw body attached
   * @returns true if signature is valid, false otherwise
   */
  validateSquareSignature(request: Request): boolean {
    try {
      // Step 1: Retrieve the signature from the x-square-signature header
      const providedSignature = request.get('x-square-signature');
      if (!providedSignature) {
        console.warn('⚠️ Missing x-square-signature header');
        return false;
      }

      // Step 2: Get the webhook signature key from environment
      const signatureKey = process.env['SQUARE_WEBHOOK_SIGNATURE_KEY'];
      if (!signatureKey) {
        console.error('❌ SQUARE_WEBHOOK_SIGNATURE_KEY not configured');
        return false;
      }

      // Step 3: Retrieve the request URL and raw request body
      const requestUrl = `${request.protocol}://${request.get('host')}${
        request.originalUrl
      }`;

      // The raw body should be attached to the request object by the express.json verify function
      const rawBody = (request as Request & { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        console.error(
          '❌ Raw request body not available for signature validation'
        );
        return false;
      }

      // Step 4: Concatenate the request URL and the raw body
      const signaturePayload = requestUrl + rawBody.toString('utf8');

      // Step 5: Use crypto module to perform HMAC-SHA256 hash
      const hmac = crypto.createHmac('sha256', signatureKey);
      hmac.update(signaturePayload, 'utf8');

      // Step 6: Base64-encode the resulting hash
      const generatedSignature = hmac.digest('base64');

      // Step 7: Perform timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(providedSignature, 'utf8'),
        Buffer.from(generatedSignature, 'utf8')
      );

      if (isValid) {
        console.log('✅ Square webhook signature validation successful');
      } else {
        console.warn('⚠️ Square webhook signature validation failed', {
          providedSignature: providedSignature.substring(0, 10) + '...',
          generatedSignature: generatedSignature.substring(0, 10) + '...',
          requestUrl,
          bodyLength: rawBody.length,
        });
      }

      return isValid;
    } catch (error) {
      console.error('❌ Error during signature validation:', error);
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
      varName => !process.env[varName]
    );

    if (missingVars.length > 0) {
      console.error(
        '❌ Missing required environment variables for SecurityService:',
        missingVars
      );
      return false;
    }

    return true;
  }
}
