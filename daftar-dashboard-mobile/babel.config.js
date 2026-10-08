/**
 * Babel configuration for Zayna Client Mobile.
 *
 * Key decisions:
 * - `jsxImportSource: "nativewind"` — required for NativeWind v4 to inject
 *   its className prop into all JSX elements without manually importing `styled`.
 * - `react-native-reanimated/plugin` must come LAST in the plugins array,
 *   as per the Reanimated docs.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
          // Needed on Expo web when dependencies expose ESM code that reads
          // import.meta (e.g. zustand/esm). Metro serves classic scripts.
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [
      // Reanimated plugin MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
