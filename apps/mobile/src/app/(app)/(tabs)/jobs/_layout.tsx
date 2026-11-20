import { Stack } from 'expo-router';

import { tabHeaderOptions } from '@/components/tab-header';
import { tabStackOptions } from '@/constants/navigation';
import { useT } from '@/lib/i18n';

export default function JobsLayout() {
  const t = useT();
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: t('tabs.jobs'), ...tabHeaderOptions }} />
      <Stack.Screen name="[id]" options={{ title: '', headerLargeTitle: false }} />
    </Stack>
  );
}
