/**
 * Sentry Server Configuration — Next.js Server / Edge
 *
 * Setup steps:
 *   1. npm install @sentry/nextjs
 *   2. Wrap next.config.ts with withSentryConfig:
 *
 *      import { withSentryConfig } from "@sentry/nextjs";
 *      export default withSentryConfig(nextConfig, {
 *        org: process.env.SENTRY_ORG,
 *        project: process.env.SENTRY_PROJECT,
 *        silent: true,
 *        widenClientFileUpload: true,
 *        hideSourceMaps: true,
 *        disableLogger: true,
 *      });
 *
 *   3. Set SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT in .env.local
 *
 * This file is auto-loaded by @sentry/nextjs — do not import it manually.
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    enabled: process.env.NODE_ENV === "production",

    // Sanitize sensitive data before sending
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });
}
