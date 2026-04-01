/**
 * Auth Layout — public screens (login, register, forgot-password)
 *
 * Uses a Stack navigator with no headers (each screen manages its own UI).
 * If the user is already authenticated, redirects immediately to the
 * main client area — prevents showing auth screens to logged-in users.
 */
import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/stores/auth-store';
import { LoadingScreen } from '@/components/common/LoadingScreen';

export default function AuthLayout() {
  const { isAuthenticated, isInitialized } = useAuth();

  // Show loading while auth store finishes initializing
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  // Already logged in — skip auth screens and go straight to the app
  if (isAuthenticated) {
    return <Redirect href={'/(client)' as never} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
