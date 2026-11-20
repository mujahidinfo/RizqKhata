import { focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Connectivity for the whole app, through React Query's `onlineManager`:
 * queries pause instead of erroring while offline and refetch when the
 * connection comes back, and the offline outbox listens to the same signal.
 *
 * "Online" means connected *and* not known to lack internet: `isInternetReachable`
 * is null while the OS is still checking, which we treat as online so a slow
 * check never blocks the counter.
 */
const toOnline = (state: Network.NetworkState) =>
  state.isConnected !== false && state.isInternetReachable !== false;

let installed = false;

/** Wire expo-network and app focus into React Query. Call once at startup. */
export function installNetworkListeners() {
  if (installed) return;
  installed = true;

  onlineManager.setEventListener((setOnline) => {
    void Network.getNetworkStateAsync().then((state) => setOnline(toOnline(state)));
    const subscription = Network.addNetworkStateListener((state) => setOnline(toOnline(state)));
    return () => subscription.remove();
  });

  // Refetch stale data when the app comes back to the foreground (RN has no
  // window focus event).
  focusManager.setEventListener((setFocused) => {
    const onChange = (status: AppStateStatus) => setFocused(status === 'active');
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  });
}

export const isOnline = () => onlineManager.isOnline();

/** True while the device has a working connection. */
export function useIsOnline() {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  );
}
