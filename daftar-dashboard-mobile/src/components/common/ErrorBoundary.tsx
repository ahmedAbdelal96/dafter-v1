/**
 * ErrorBoundary — Catches uncaught React render errors and shows a
 * user-friendly fallback instead of a blank (white) screen.
 *
 * Must be a class component — React only supports error boundaries as classes.
 *
 * Usage:
 *   // Wrap your screen tree (already done in AppProviders)
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 *   // Or wrap a specific risky component:
 *   <ErrorBoundary fallback={<Text>Widget failed to load</Text>}>
 *     <DataWidget />
 *   </ErrorBoundary>
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { ZText } from "@/components/ui/ZText";
import { ZButton } from "@/components/ui/ZButton";
import { Colors, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback. If not provided, the built-in error screen is shown. */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to your error tracking service here (e.g. Sentry, Bugsnag)
    if (__DEV__) {
      console.error(
        "[ErrorBoundary] Uncaught error:",
        error,
        info.componentStack,
      );
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Ionicons
            name="warning-outline"
            size={48}
            color={Colors.status.warning}
          />
        </View>

        <ZText weight="bold" size="xl" style={styles.title}>
          حدث خطأ غير متوقع
        </ZText>

        <ZText variant="secondary" size="sm" style={styles.message}>
          {__DEV__ && this.state.error
            ? this.state.error.message
            : "يرجى المحاولة مرة أخرى أو إعادة تشغيل التطبيق."}
        </ZText>

        <ZButton
          onPress={this.handleReset}
          variant="outline"
          style={styles.button}
        >
          المحاولة مرة أخرى
        </ZButton>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[8],
    gap: Spacing[4],
    backgroundColor: Colors.light.background,
  },
  iconWrapper: {
    marginBottom: Spacing[2],
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    marginTop: Spacing[2],
  },
});
