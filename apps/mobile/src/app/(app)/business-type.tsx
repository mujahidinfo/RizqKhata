import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUpdateShop } from '@/api/queries';
import type { BusinessType } from '@/api/types';
import { BusinessTypePicker } from '@/components/business-type-picker';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBusinessType } from '@/lib/business';
import { useT } from '@/lib/i18n';

/** `/business-type` — switch between selling, services, or both (owners/managers). */
export default function BusinessTypeScreen() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const current = useBusinessType();
  const update = useUpdateShop();
  const [type, setType] = useState<BusinessType>(current);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      await update.mutateAsync({ businessType: type, ...(type !== 'RETAIL' && { serviceTemplate: 'mobile_repair' as const }) });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile.couldNotSave'));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }}>
        <BusinessTypePicker value={type} onChange={setType} />
        <ThemedText type="caption" themeColor="textSecondary">
          {t('businessType.settingHint')}
        </ThemedText>
        {error && (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        )}
      </ScrollView>
      <View style={{ padding: Spacing.three, paddingBottom: Spacing.three + insets.bottom }}>
        <Button title={t('common.save')} onPress={save} loading={update.isPending} disabled={type === current} />
      </View>
    </View>
  );
}
