import { Stack } from 'expo-router';

import { tabHeaderOptions } from '@/components/tab-header';
import { tabStackOptions } from '@/constants/navigation';
import { useT } from '@/lib/i18n';

export default function ProductsLayout() {
  const t = useT();
  return (
    <Stack screenOptions={tabStackOptions}>
      {/* The screen adds its own "Add" button next to the profile for editors. */}
      <Stack.Screen name="index" options={{ title: t('tabs.products'), ...tabHeaderOptions }} />
      <Stack.Screen name="[id]" options={{ title: '', headerLargeTitle: false }} />
    </Stack>
  );
}
