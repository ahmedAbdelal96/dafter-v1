import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  corsCredentials: process.env.CORS_CREDENTIALS === 'true',
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3001',
  mobileAppUrl: process.env.MOBILE_APP_URL || 'daftar://',
}));
