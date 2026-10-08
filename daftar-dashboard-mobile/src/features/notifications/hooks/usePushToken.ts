// ─── Expo Push Token Registration ─────────────────────────────────────────────
// Handles: request permission → get Expo token → register with backend
// Called once after login, cleaned up on logout.
//
// NOTE: expo-notifications must be installed.
// If not available (web/emulator), registration is gracefully skipped.

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { notificationsApi } from '../api/notifications.api';

/**
 * Registers the device's Expo push token with the backend.
 * Safe to call multiple times — backend upserts by token.
 *
 * @param enabled - only register when the user is authenticated
 */
export function usePushTokenRegistration(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function register() {
      try {
        // Dynamic import — graceful degradation if expo-notifications not installed
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        let Notifications: typeof import('expo-notifications') | null = null;
        try { Notifications = require('expo-notifications'); } catch { /* not installed */ }

        if (!Notifications || cancelled) return;

        // Request permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') return; // User denied — skip silently

        // Get Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
        if (!tokenData || cancelled) return;

        const platform: 'ios' | 'android' | 'web' =
          Platform.OS === 'ios' ? 'ios' :
          Platform.OS === 'android' ? 'android' : 'web';

        await notificationsApi.registerDeviceToken({
          token: tokenData.data,
          platform,
        });
      } catch {
        // Non-critical — push is best-effort, don't crash the app
      }
    }

    register();
    return () => { cancelled = true; };
  }, [enabled]);
}
