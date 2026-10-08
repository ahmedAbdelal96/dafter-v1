/**
 * Sentry Client Configuration — Next.js Browser
 *
 * Setup steps:
 *   1. npm install @sentry/nextjs
 *   2. Wrap next.config.ts with withSentryConfig (see sentry.server.config.ts comments)
 *   3. Set SENTRY_DSN in .env.local
 *
 * This file is auto-loaded by @sentry/nextjs — do not import it manually.
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Capture 10% of sessions for performance in production, 100% in dev
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Replay sessions when an error occurs
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,

    // Do not send errors in development
    enabled: process.env.NODE_ENV === "production",

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
