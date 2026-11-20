import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

/** Left side of every tab's top bar: whose shop this is. Tap to switch branch when there are several. */
export function ShopTitle() {
  const theme = useTheme();
  const t = useT();
  const { activeShop, workspaces } = useSession();
  if (!activeShop) return null;

  const multiple = workspaces.reduce((n, w) => n + w.shops.length, 0) > 1;
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 200 }}>
      {/* Round, to match the theme toggle and avatar on the right. */}
      <IconTile name="store" tint={theme.primary} size={36} round />
      <View style={{ flexShrink: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ThemedText type="smallBold" numberOfLines={1} style={{ fontSize: 16, flexShrink: 1 }}>
            {activeShop.name}
          </ThemedText>
          {multiple && <Icon name="chevronDown" size={12} color={theme.textSecondary} weight="bold" />}
        </View>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {t(`roles.${activeShop.role}`)}
        </ThemedText>
      </View>
    </View>
  );

  if (!multiple) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('topBar.switchBranchA11y', { name: activeShop.name })}
      onPress={() => router.push('/branches')}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {content}
    </Pressable>
  );
}
