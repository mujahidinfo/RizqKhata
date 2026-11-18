import { Pressable, View } from 'react-native';

import type { BusinessType } from '@/api/types';
import { Icon, type IconName } from '@/components/icon';
import { IconTile, TINT } from '@/components/icon-tile';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

const OPTIONS: { type: BusinessType; icon: IconName; tint: string }[] = [
  { type: 'RETAIL', icon: 'bag', tint: TINT.indigo },
  { type: 'SERVICE', icon: 'wrench', tint: TINT.emerald },
  { type: 'HYBRID', icon: 'store', tint: TINT.amber },
];

/**
 * "What does your shop do?" — three big cards, then the service template for
 * service businesses (Release 1: mobile repair).
 */
export function BusinessTypePicker({ value, onChange }: { value: BusinessType; onChange: (type: BusinessType) => void }) {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={{ gap: Spacing.two }} accessibilityRole="radiogroup" accessibilityLabel={t('businessType.title')}>
      <ThemedText type="small" themeColor="textSecondary">
        {t('businessType.title')}
      </ThemedText>
      {OPTIONS.map((o) => {
        const selected = o.type === value;
        return (
          <Pressable
            key={o.type}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.type)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.three,
              padding: Spacing.three,
              borderRadius: Radius.lg,
              borderCurve: 'continuous',
              borderWidth: 1.5,
              borderColor: selected ? theme.primary : theme.border,
              backgroundColor: selected ? `${theme.primary}0F` : theme.backgroundElement,
              opacity: pressed ? 0.8 : 1,
            })}>
            <IconTile name={o.icon} tint={o.tint} size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="smallBold">{t(`businessType.${o.type}`)}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {t(`businessType.${o.type}_hint`)}
              </ThemedText>
            </View>
            <Icon name={selected ? 'check' : 'circle'} size={22} color={selected ? theme.primary : theme.textSecondary} />
          </Pressable>
        );
      })}

      {value !== 'RETAIL' && (
        <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('businessType.template')}
          </ThemedText>
          <View
            accessibilityRole="radio"
            accessibilityState={{ selected: true }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.three,
              padding: Spacing.three,
              borderRadius: Radius.lg,
              borderWidth: 1.5,
              borderColor: theme.primary,
              backgroundColor: `${theme.primary}0F`,
            }}>
            <IconTile name="device" tint={TINT.sky} size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="smallBold">{t('businessType.mobileRepair')}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {t('businessType.mobileRepairHint')}
              </ThemedText>
            </View>
            <Icon name="check" size={22} color={theme.primary} />
          </View>
        </View>
      )}
    </View>
  );
}
