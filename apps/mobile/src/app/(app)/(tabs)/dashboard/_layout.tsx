import { Stack } from 'expo-router';

import { tabHeaderOptions } from '@/components/tab-header';
import { tabStackOptions } from '@/constants/navigation';
import { useT } from '@/lib/i18n';

export default function DashboardLayout() {
  const t = useT();
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: t('tabs.today'), ...tabHeaderOptions }} />
    </Stack>
  );
}
