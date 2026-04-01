import { useEffect, useState } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

interface NetworkStatus {
  /** true = connected to internet, false = offline, null = still checking */
  isConnected: boolean | null;
  /** true = internet is actually reachable (not just LAN), null = unknown */
  isInternetReachable: boolean | null;
}

/**
 * Subscribes to network connectivity events and returns the current status.
 *
 * Uses `@react-native-community/netinfo` which must be installed:
 *   npx expo install @react-native-community/netinfo
 *
 * @example
 *   const { isConnected } = useNetworkStatus();
 *   if (!isConnected) return <OfflineBanner />;
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: null,
    isInternetReachable: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
    });

    // Fetch the current state immediately so `null` resolves quickly
    NetInfo.fetch().then((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
    });

    return unsubscribe;
  }, []);

  return status;
}
