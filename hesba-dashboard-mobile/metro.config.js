/**
 * Metro bundler configuration for Zayna Client Mobile.
 *
 * `withNativeWind` wraps the default Expo config to enable:
 * - CSS processing via the `input` global CSS file
 * - PostCSS/Tailwind compilation at build time
 * - Hot reload for style changes in development
 */
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Explicit @/ alias resolver — ensures Metro always finds src/* files
// regardless of file-map cache state (Windows file-watcher quirks).
const fs = require('fs');
const srcRoot = path.resolve(__dirname, 'src');
const ALIAS_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const base = path.resolve(srcRoot, moduleName.slice(2));
    // Try direct file with each extension
    for (const ext of ALIAS_EXTS) {
      if (fs.existsSync(base + ext)) {
        return { type: 'sourceFile', filePath: base + ext };
      }
    }
    // Try index file inside the directory
    for (const ext of ALIAS_EXTS) {
      const idx = path.join(base, 'index' + ext);
      if (fs.existsSync(idx)) {
        return { type: 'sourceFile', filePath: idx };
      }
    }
  }
  // Fall through to Metro's default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

// Required for web: tells Metro to respect the `exports` field in package.json
// so ESM packages (expo-secure-store, reanimated worklets) load their web
// implementations instead of their native ones.
config.resolver.unstable_enablePackageExports = true;

// Limit concurrent transform workers.
// Without this, Metro spawns (CPU_count - 1) workers — on a modern machine
// that's 8–15 processes each allocating 200-400 MB of V8 zones, which crashes
// with "Zone Allocation failed - process out of memory" before the bundle
// finishes. Two workers is enough to stay responsive while keeping RAM sane.
config.maxWorkers = 2;

module.exports = withNativeWind(config, {
  /** Path to the global CSS entry file that includes Tailwind directives */
  input: './src/global.css',
});
