import { Pressable } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { FloatingBottom } from '@/components/safe-area';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const FAB_SIZE = 56;
/**
 * Bottom padding that keeps the last list row clear of the floating button. The
 * tab bar itself is covered by the list's automatic content inset (iOS) or the
 * NativeTabs bottom padding (Android).
 */
export const FAB_CLEARANCE = FAB_SIZE + Spacing.three * 2;

/** Round floating action button, bottom right, above the tab bar. Place inside a `flex: 1` container. */
export function Fab({
  label,
  icon = 'plus',
  onPress,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <FloatingBottom style={{ alignItems: 'flex-end', paddingRight: Spacing.three }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.primary,
          boxShadow: '0 6px 16px rgba(23, 105, 76, 0.35), 0 2px 4px rgba(15, 23, 42, 0.12)',
          transform: [{ scale: pressed ? 0.94 : 1 }],
        })}>
        <Icon name={icon} size={26} color={theme.onPrimary} weight="semibold" />
      </Pressable>
    </FloatingBottom>
  );
}
