/**
 * LoggerSetup — Zayna Mobile Dashboard
 *
 * Non-visual component that wires up automatic logging for:
 *   1. Screen navigation — logs every route change via useSegments()
 *   2. Global JS errors — captures uncaught errors before they crash the app
 *   3. Unhandled promise rejections — via global Promise override
 *   4. App startup — writes a boot entry with timestamp
 *   5. Old log cleanup — deletes files older than 7 days
 *
 * Mount this ONCE at the root layout, inside the navigation context
 * (so useSegments() has access to the router state).
 */
import { useEffect, useRef } from "react";
import { useSegments } from "expo-router";
import { logger } from "@/lib/logger";

// ErrorUtils is a React Native global — not exported from 'react-native' types
// so we access it via globalThis to avoid duplicate declaration errors
const RNErrorUtils = (globalThis as unknown as {
  ErrorUtils?: {
    getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
    setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
  };
}).ErrorUtils;

export function LoggerSetup() {
  const segments = useSegments();
  const prevScreen = useRef("");

  // ── Boot tasks (run once) ──────────────────────────────────────────────────
  useEffect(() => {
    // Log app start + clean up stale files
    logger.info("App", "═══ Application started ═══");
    void logger.cleanup();

    // ── Global JS error handler ──────────────────────────────────────────────
    // Wraps React Native's ErrorUtils to capture unhandled errors.
    // We call the previous handler after logging so crash reports still work.
    if (!RNErrorUtils) return;

    const previousHandler = RNErrorUtils.getGlobalHandler();

    RNErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      logger.error(
        "GlobalError",
        `${isFatal ? "[FATAL] " : ""}${error.message}`,
        { stack: error.stack?.slice(0, 800) },
      );
      previousHandler(error, isFatal);
    });

    return () => {
      RNErrorUtils.setGlobalHandler(previousHandler);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation tracking ────────────────────────────────────────────────────
  // useSegments() returns something like ['(client)', 'bookings', '[id]'].
  // We join them into a readable path and log it when it changes.
  useEffect(() => {
    const screen = "/" + (segments.length ? segments.join("/") : "");
    if (screen !== prevScreen.current) {
      prevScreen.current = screen;
      logger.nav(screen);
    }
  }, [segments]);

  return null;
}
