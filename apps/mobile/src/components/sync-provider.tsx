import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { useEffect, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { useOfflineCatalog } from '@/api/queries';
import { configureOutbox, loadOutbox, syncNow } from '@/lib/outbox';
import { useSession } from '@/lib/session';

/**
 * Runs offline sync for the signed-in area:
 * - points the outbox at the signed-in user (only their records sync),
 * - sends waiting records on start, when the connection returns and when the
 *   app comes back to the foreground, then refreshes the affected screens,
 * - keeps the product catalog on the phone for offline scanning and search.
 */
export function SyncProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { user, activeShop } = useSession();
  const userId = user?.id ?? null;

  useEffect(() => {
    configureOutbox({
      userId,
      onSynced: (keys) => keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey })),
    });
    void loadOutbox().then(syncNow);
    return () => configureOutbox({ userId: null });
  }, [userId, queryClient]);

  useEffect(() => {
    const offOnline = onlineManager.subscribe((online) => {
      if (online) void syncNow();
    });
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') void syncNow();
    });
    return () => {
      offOnline();
      appState.remove();
    };
  }, []);

  useOfflineCatalog(!!activeShop);

  return children;
}
