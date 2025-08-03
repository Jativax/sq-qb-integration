import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env['PORT'] || 3001,
  logLevel: process.env['LOG_LEVEL'] || 'info',
  nodeEnv: process.env['NODE_ENV'] || 'development',
  redis: {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
  },
  square: {
    accessToken: process.env['SQUARE_ACCESS_TOKEN'],
    locationId: process.env['SQUARE_LOCATION_ID'],
    webhookSignatureKey: process.env['SQUARE_WEBHOOK_SIGNATURE_KEY'],
  },
  quickbooks: {
    clientId: process.env['QUICKBOOKS_CLIENT_ID'],
    clientSecret: process.env['QUICKBOOKS_CLIENT_SECRET'],
    redirectUri: process.env['QUICKBOOKS_REDIRECT_URI'],
    realmId: process.env['QUICKBOOKS_REALM_ID'],
    refreshToken: process.env['QUICKBOOKS_REFRESH_TOKEN'],
  },
};

export default config;
