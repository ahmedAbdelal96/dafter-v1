import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Extract origin only (scheme + host + port) so CSP path-matching doesn't
// accidentally block requests to sub-paths like /api/v1/dashboard/overview.
// CSP spec: a source WITHOUT trailing slash only matches that exact path;
// to allow all sub-paths you need the origin alone.
function apiOriginFromEnv(): string {
  const url = process.env.NEXT_PUBLIC_API_URL ?? "";
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

const API_ORIGIN = apiOriginFromEnv();

const securityHeaders = [
  // Enforce HTTPS for 1 year, include subdomains
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Prevent clickjacking
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // Prevent MIME sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Control referrer information
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Restrict browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Content Security Policy
  // Adjust connect-src and img-src as needed for CDN/storage URLs
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed for Next.js dev HMR; restrict in prod if possible
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      // Use origin-only (no path) so ALL sub-paths under the API are allowed.
      // ws:// / wss:// needed for Next.js HMR WebSocket in development.
      `connect-src 'self' ${API_ORIGIN} ws://localhost:3000 wss://localhost:3000 ws://localhost:3001 wss://localhost:3001 https://sentry.io https://*.sentry.io`,
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Required for Docker standalone build
  output: "standalone",

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default withNextIntl(nextConfig);
