// eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config'
import nextConfig from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextConfig,
  globalIgnores([
    '.next/**',
    '.next-stale-b08/**',
    'out/**',
    'build/**',
    'artifacts/**',
    'next-env.d.ts'
  ]),
])
