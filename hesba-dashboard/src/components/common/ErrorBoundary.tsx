"use client";

import React, { Component, ReactNode } from "react";
import Button from "@/components/ui/button/Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 * ÙŠÙ„ØªÙ‚Ø· Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ ÙÙŠ Ø´Ø¬Ø±Ø© Ø§Ù„Ù…ÙƒÙˆÙ†Ø§Øª ÙˆÙŠØ¹Ø±Ø¶ UI Ø¨Ø¯ÙŠÙ„
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * ErrorFallback Component
 * UI Ø§ÙØªØ±Ø§Ø¶ÙŠ Ø¹Ù†Ø¯ Ø­Ø¯ÙˆØ« Ø®Ø·Ø£
 */
interface ErrorFallbackProps {
  error: Error | null;
  onReset?: () => void;
}

export function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
          Ø­Ø¯Ø« Ø®Ø·Ø£ Ù…Ø§
        </h2>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-start dark:bg-red-900/10">
            <p className="text-sm text-red-800 dark:text-red-400">
              {error.message}
            </p>
          </div>
        )}

        {/* Description */}
        <p className="mb-8 text-gray-600 dark:text-gray-400">
          Ù†Ø£Ø³ÙØŒ Ø­Ø¯Ø« Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹. ÙŠØ±Ø¬Ù‰ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {onReset && (
            <Button
              onClick={onReset}
              className="inline-flex items-center justify-center gap-2"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ø±Ø¦ÙŠØ³ÙŠØ©
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mini Error Fallback
 * Ù†Ø³Ø®Ø© Ù…ØµØºØ±Ø© Ù„Ù„Ø£Ø®Ø·Ø§Ø¡ Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…ÙƒÙˆÙ†Ø§Øª
 */
export function MiniErrorFallback({ 
  error, 
  onRetry 
}: { 
  error?: Error | string; 
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-900/10">
      <svg
        className="mb-3 h-10 w-10 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="mb-4 text-sm text-red-800 dark:text-red-400">
        {typeof error === "string" ? error : error?.message || "Ø­Ø¯Ø« Ø®Ø·Ø£"}
      </p>
      {onRetry && (
        <Button size="sm" onClick={onRetry} variant="outline">
          Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©
        </Button>
      )}
    </div>
  );
}
