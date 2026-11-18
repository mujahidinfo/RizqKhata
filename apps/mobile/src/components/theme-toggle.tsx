import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

import { Icon } from '@/components/icon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { followSystemColorScheme, setColorSchemeChoice } from '@/lib/appearance';
import { useT } from '@/lib/i18n';

const SIZE = 36;

/**
 * Sun/moon button in the top bar. Tap switches light ↔ dark; long-press goes
 * back to following the system setting.
 */
export function ThemeToggle() {
  const theme = useTheme();
  const t = useT();
  const isDark = useColorScheme() === 'dark';

  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        setColorSchemeChoice(isDark ? 'light' : 'dark');
      }}
      onLongPress={() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        followSystemColorScheme();
      }}
      accessibilityRole="button"
      accessibilityLabel={isDark ? t('topBar.toLight') : t('topBar.toDark')}
      accessibilityHint={t('topBar.themeHint')}
      hitSlop={8}
      style={({ pressed }) => ({
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.backgroundElement,
        opacity: pressed ? 0.7 : 1,
      })}>
      {/* Show the mode you'll switch to. */}
      <Icon name={isDark ? 'sun' : 'moon'} size={18} color={isDark ? '#FBBF24' : theme.text} weight="semibold" />
    </Pressable>
  );
}
