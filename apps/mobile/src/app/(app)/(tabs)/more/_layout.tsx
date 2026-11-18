import { Stack } from 'expo-router';

import { tabHeaderOptions } from '@/components/tab-header';
import { tabStackOptions } from '@/constants/navigation';
import { useT } from '@/lib/i18n';

/**
 * Only the More hub has a large title. Screens pushed from it use the standard
 * inline title: with a filter bar or a hero above their list, a large title
 * can't collapse on scroll and ends up drawn over the content.
 */
const pushed = { headerLargeTitle: false } as const;

export default function MoreLayout() {
  const t = useT();
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: t('tabs.more'), ...tabHeaderOptions }} />
      <Stack.Screen name="staff" options={{ title: t('screens.staff'), ...pushed }} />
      <Stack.Screen name="suppliers" options={{ title: t('screens.suppliers'), ...pushed }} />
      <Stack.Screen name="expenses" options={{ title: t('screens.expenses'), ...pushed }} />
      <Stack.Screen name="bills" options={{ title: t('screens.bills'), ...pushed }} />
      <Stack.Screen name="supplier/[id]" options={{ title: '', ...pushed }} />
      <Stack.Screen name="customers" options={{ title: t('screens.customers'), ...pushed }} />
      <Stack.Screen name="customer/[id]" options={{ title: '', ...pushed }} />
      <Stack.Screen name="notes" options={{ title: t('screens.notes'), ...pushed }} />
    </Stack>
  );
}
