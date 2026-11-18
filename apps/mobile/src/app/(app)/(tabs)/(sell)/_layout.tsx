import { Stack } from 'expo-router';

import { tabHeaderOptions } from '@/components/tab-header';
import { useT } from '@/lib/i18n';

export default function SellLayout() {
  const t = useT();
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="index"
        options={{
          title: t('tabs.sell'),
          // Shop identity on the left, profile on the right; no centered title.
          headerTitle: '',
          ...tabHeaderOptions,
        }}
      />
    </Stack>
  );
}
