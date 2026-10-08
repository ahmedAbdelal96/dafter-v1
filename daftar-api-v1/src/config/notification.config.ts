import { registerAs } from '@nestjs/config';

// ============================================================
// Notification Configuration
// ============================================================
// Expo Push Notification settings.
//
// EXPO_ACCESS_TOKEN is OPTIONAL — Expo allows unauthenticated
// requests but with lower rate limits. For production, get a
// token from expo.dev and add it here.
// ============================================================

export default registerAs('notification', () => ({
  expo: {
    // Optional Expo access token — increases rate limits in production.
    // Get one at: https://expo.dev/accounts/[account]/settings/access-tokens
    accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
  },
}));
