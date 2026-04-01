/**
 * Sentry Error Tracking — Daftar Mobile
 *
 * Setup steps:
 *   1. npx expo install @sentry/react-native
 *   2. Run: npx @sentry/wizard@latest -i reactNative
 *      (or manually configure per https://docs.sentry.io/platforms/react-native/)
 *   3. Set EXPO_PUBLIC_SENTRY_DSN in .env
 *   4. Uncomment the initialization block below
 *   5. Wrap the root component in _layout.tsx:
 *      import * as Sentry from "@sentry/react-native";
 *      export default Sentry.wrap(RootLayout);
 *
 * This module is a no-op until @sentry/react-native is installed and initialized.
 */

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Initialize Sentry — call once in _layout.tsx before rendering.
 *
 * Uncomment after running: npx expo install @sentry/react-native
 */
export function initSentry(): void {
  if (!SENTRY_DSN) return;

  // Uncomment after installing @sentry/react-native:
  //
  // import * as Sentry from "@sentry/react-native";
  // Sentry.init({
  //   dsn: SENTRY_DSN,
  //   environment: process.env.NODE_ENV ?? "development",
  //   tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  //   enabled: !__DEV__,
  //   beforeSend(event) {
  //     // Remove sensitive request data
  //     if (event.request?.headers) {
  //       delete event.request.headers["authorization"];
  //     }
  //     return event;
  //   },
  // });
}
