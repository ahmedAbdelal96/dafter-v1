/**
 * App-wide configuration constants.
 *
 * TENANT_SLUG: The slug of the tenant this app is built for.
 * Sent as `X-Tenant-Slug` header with every API request so the backend
 * can identify which tenant's data to scope the request to.
 *
 * API_BASE_URL notes:
 *   - Physical device on LAN  → use the machine's IP (e.g. 192.168.x.x)
 *   - Android emulator        → use 10.0.2.2 (maps to host's localhost)
 *   - iOS simulator           → use localhost directly
 *   - Production              → use deployed API domain
 */

export const Config = {
  /**
   * The slug of the tenant this mobile app is built for.
   * Must match the `slug` column of the tenant row in the database.
   */
  TENANT_SLUG: "dafter",

  /**
   * Backend API base URL — change to match your environment.
   * The Axios client (lib/api/client.ts) auto-detects the LAN IP from
   * Metro's hostUri at runtime, so this value is only used as a
   * last-resort fallback when no explicit apiUrl is set in app.json.
   *
   * Port 7000 = Daftar NestJS API (dev). Production uses EXPO_PUBLIC_API_URL.
   */
  API_BASE_URL: "http://192.168.100.4:7000/api/v1",

  /** App metadata */
  APP_NAME: "Dafter",
  APP_VERSION: "1.0.0",

  /** Supported locales */
  DEFAULT_LOCALE: "ar" as const,
  SUPPORTED_LOCALES: ["ar", "en"] as const,

  /** Default theme */
  DEFAULT_THEME: "light" as const,

  /** AsyncStorage key prefix — prevents collisions with other apps */
  STORAGE_PREFIX: "dafter",
} as const;

export type SupportedLocale = (typeof Config.SUPPORTED_LOCALES)[number];
