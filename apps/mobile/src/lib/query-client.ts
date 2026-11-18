import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import Storage from 'expo-sqlite/kv-store';

import { ApiError } from '@/lib/api-client';

/** How long data loaded online stays usable offline. */
const OFFLINE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Must outlive OFFLINE_MAX_AGE, or restored data is dropped as unused.
      gcTime: OFFLINE_MAX_AGE,
      // Retry network blips (status 0) and 5xx, never 4xx — those won't fix themselves.
      retry: (failureCount, error) =>
        failureCount < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});

/**
 * Loaded data is saved to the phone (SQLite) so the app opens with the last
 * known products, orders and expenses when there is no internet. Cleared on
 * sign-out / branch switch along with the in-memory cache.
 */
const persister = createAsyncStoragePersister({
  storage: Storage,
  key: 'rizq.queryCache.v1',
  throttleTime: 2_000,
});

export const persistOptions: PersistQueryClientProviderProps['persistOptions'] = {
  persister,
  maxAge: OFFLINE_MAX_AGE,
  // A new app version may change response shapes: start fresh.
  buster: Constants.expoConfig?.version ?? 'dev',
  dehydrateOptions: {
    // Only finished, successful data; `meta: { persist: false }` opts a query out.
    shouldDehydrateQuery: (query) => query.state.status === 'success' && query.meta?.persist !== false,
  },
};

/** Remove the saved copy too (sign-out). */
export const clearPersistedCache = () => persister.removeClient();
